#!/usr/bin/env node

import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  SATPGateway,
  type SATPGatewayConfig,
} from "./plugin-satp-hermes-gateway";
import fs from "fs-extra";

import { validateSatpGatewayIdentity } from "./services/validation/config-validating-functions/validate-satp-gateway-identity";
import { validateSatpCounterPartyGateways } from "./services/validation/config-validating-functions/validate-satp-counter-party-gateways";
import { validateSatpLogLevel } from "./services/validation/config-validating-functions/validate-satp-log-level";
import { validateSatpEnvironment } from "./services/validation/config-validating-functions/validate-satp-environment";
import { validateSatpValidationOptions } from "./services/validation/config-validating-functions/validate-satp-validation-options";
import { validateSatpPrivacyPolicies } from "./services/validation/config-validating-functions/validate-satp-privacy-policies";
import { validateSatpMergePolicies } from "./services/validation/config-validating-functions/validate-satp-merge-policies";
import { validateSatpKeyPairJSON } from "./services/validation/config-validating-functions/validate-key-pair-json";
import { validateCCConfig } from "./services/validation/config-validating-functions/validate-cc-config";
import path from "node:path";
import { validateSatpEnableCrashRecovery } from "./services/validation/config-validating-functions/validate-satp-enable-crash-recovery";
import { validateKnexRepositoryConfig } from "./services/validation/config-validating-functions/validate-knex-repository-config";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { validateInstanceId } from "./services/validation/config-validating-functions/validate-instance-id";
import { v4 as uuidv4 } from "uuid";
import { validateOntologyPath } from "./services/validation/config-validating-functions/validate-ontology-path";
import { validateExtensions } from "./services/validation/config-validating-functions/validate-extensions";

export async function launchGateway(): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });

  logger.debug("Checking for configuration file...");

  const workDir = "/opt/cacti/satp-hermes";
  if (!fs.existsSync(path.join(workDir, "/config/config.json"))) {
    throw new Error(
      "Could not find gateway-config.json in /config/config.json directory",
    );
  }

  logger.debug("Reading configuration from: /config/config.json");
  const config = await fs.readJson(path.join(workDir, "/config/config.json"));
  logger.debug("Configuration read OK");

  logger.debug(`Config: ${JSON.stringify(config, null, 2)}`);

  // validating gateway-config.json

  logger.debug("Validating SATP Gateway instanceId...");
  const instanceId = validateInstanceId({
    configValue: config.instanceId,
  });
  logger.debug("SATP Gateway instanceId is valid.");

  logger.debug("Validating SATP Gateway Identity...");
  const gid = validateSatpGatewayIdentity(
    {
      configValue: config.gid,
    },
    logger,
  );
  logger.debug("Valid SATP Gateway Identity");

  logger.debug("Validating SATP Counter Party Gateways...");
  const counterPartyGateways = validateSatpCounterPartyGateways(
    {
      configValue: config.counterPartyGateways,
    },
    logger,
  );
  logger.debug("Valid SATP Counter Party Gateways");

  logger.debug("Validating SATP Log Level...");
  const logLevel = validateSatpLogLevel({
    configValue: config.logLevel,
  });
  logger.debug("SATP Log Level is valid.");

  logger.debug("Validating SATP Environment...");
  const environment = validateSatpEnvironment({
    configValue: config.environment,
  });
  logger.debug("SATP Environment is valid.");

  logger.debug("Validating SATP Validation Options...");
  const validationOptions = validateSatpValidationOptions({
    configValue: config.validationOptions,
  });
  logger.debug("SATP Validation Options is valid.");

  logger.debug("Validating SATP Privacy Policies...");
  const privacyPolicies = validateSatpPrivacyPolicies({
    configValue: config.validationOptions,
  });
  logger.debug("SATP Privacy Policies is valid.");
  privacyPolicies.forEach((p: unknown, i: unknown) =>
    logger.debug("Privacy Policy #%d => %o", i, p),
  );

  logger.debug("Validating SATP Merge Policies...");
  const mergePolicies = validateSatpMergePolicies({
    configValue: config.mergePolicies,
  });
  logger.debug("SATP Merge Policies is valid.");
  mergePolicies.forEach((p: unknown, i: unknown) =>
    logger.debug("Merge Policy #%d => %o", i, p),
  );

  logger.debug("Validating SATP KeyPair...");
  const keyPair = validateSatpKeyPairJSON(
    {
      configValue: config.keyPair,
    },
    logger,
  );
  logger.debug("SATP KeyPair is valid.");

  logger.debug("Validating Cross Chain Config...");
  const ccConfig = await validateCCConfig(
    {
      configValue: config.ccConfig || null,
    },
    logger,
  );
  logger.debug("Cross Chain Config is valid.");

  logger.debug("Validating Local Repository Config...");
  const localRepository = validateKnexRepositoryConfig({
    configValue: config.localRepository,
  });
  logger.debug("Local Repository Config is valid.");

  logger.debug("Validating Remote Repository Config...");
  const remoteRepository = validateKnexRepositoryConfig({
    configValue: config.remoteRepository,
  });
  logger.debug("Remote Repository Config is valid.");

  logger.debug("Validating SATP Enable Crash Recovery...");
  const enableCrashRecovery = validateSatpEnableCrashRecovery({
    configValue: config.enableCrashRecovery,
  });
  logger.debug("SATP Enable Crash Recovery is valid.");

  logger.debug("SATP Bridges Config is valid.");

  logger.debug("Validating Ontologies Path...");
  const ontologyPath = validateOntologyPath({
    configValue: config.ontologyPath,
  });
  logger.debug("SATP Gateway ontologyPath is valid.");

  logger.debug("Validating Extensions...");
  const extensions = validateExtensions({
    configValue: config.extensions,
  });

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
    instanceId: instanceId || uuidv4(),
    gid,
    counterPartyGateways,
    logLevel,
    keyPair:
      keyPair === undefined
        ? undefined
        : {
            publicKey: Buffer.from(keyPair.publicKey, "hex"),
            privateKey: Buffer.from(keyPair.privateKey, "hex"),
          },
    environment,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    ccConfig,
    enableCrashRecovery,
    localRepository,
    remoteRepository,
    extensions,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    ontologyPath,
  };

  logger.debug("SATPGatewayConfig created successfully");

  const gateway = new SATPGateway(gatewayConfig);
  try {
    logger.info("Starting SATP Gateway...");
    await gateway.startup();
    if (gatewayConfig.gid?.gatewayOapiPort) {
      logger.info(`Gateway OpenAPI Server Active`);
      await gateway.getOrCreateHttpServer();
    }
    logger.info("SATP Gateway started successfully");
  } catch (ex) {
    // biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
    logger.error(`SATP Gateway crashed. Exiting...`, ex);
    await gateway.shutdown();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchGateway();
}
