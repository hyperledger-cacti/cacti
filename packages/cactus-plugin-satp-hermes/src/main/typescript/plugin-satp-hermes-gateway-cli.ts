#!/usr/bin/env node

import { LoggerProvider } from "@hyperledger/cactus-common";
import { SATPGateway, type SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import fs from "fs-extra";

import { validateSatpGatewayIdentity } from "./utils/config-validating-functions/validateSatpGatewayIdentity";
import { validateSatpCounterPartyGateways } from "./utils/config-validating-functions/validateSatpCounterPartyGateways";
import { validateSatpLogLevel } from "./utils/config-validating-functions/validateSatpLogLevel";
import { validateSatpEnvironment } from "./utils/config-validating-functions/validateSatpEnvironment";
import { validateSatpEnableOpenAPI } from "./utils/config-validating-functions/validateSatpEnableOpenAPI";
import { validateSatpValidationOptions } from "./utils/config-validating-functions/validateSatpValidationOptions";
import { validateSatpPrivacyPolicies } from "./utils/config-validating-functions/validateSatpPrivacyPolicies";
import { validateSatpMergePolicies } from "./utils/config-validating-functions/validateSatpMergePolicies";
import { validateSatpKeyPairJSON } from "./utils/config-validating-functions/validateKeyPairJSON";
import { validateSatpBridgesConfig } from "./utils/config-validating-functions/validateSatpBridgesConfig";
import path from "node:path";
import { validateSatpEnableCrashRecovery } from "./utils/config-validating-functions/validateSatpEnableCrashRecovery";
import { validateKnexRepositoryConfig } from "./utils/config-validating-functions/validateKnexRepositoryConfig";

export async function launchGateway(): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });

  logger.debug("Checking for configuration file...");
  let configFilePath: string | undefined;

  const possiblePaths = [
    "/opt/cacti/satp-hermes/gateway-config.json",
    "/gateway-config.json",
    path.join(process.cwd(), "gateway-config.json"),
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      configFilePath = path;
      logger.debug(`Found gateway-config.json at: ${path}`);
      break;
    }
  }

  if (!configFilePath) {
    throw new Error(
      `Could not find gateway-config.json in any of the expected locations: ${possiblePaths.join(", ")}`,
    );
  }

  logger.debug(`Reading configuration from: ${configFilePath}`);
  const config = await fs.readJson(configFilePath);
  logger.debug("Configuration read OK");

  // validating gateway-config.json

  logger.debug("Validating SATP Gateway Identity...");
  const gid = validateSatpGatewayIdentity({
    configValue: config.gid,
  });
  logger.debug("Valid SATP Gateway Identity");

  logger.debug("Validating SATP Counter Party Gateways...");
  const counterPartyGateways = validateSatpCounterPartyGateways({
    configValue: config.counterPartyGateways,
  });
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

  logger.debug("Validating SATP Enable OpenAPI...");
  const enableOpenAPI = validateSatpEnableOpenAPI({
    configValue: config.enableOpenAPI,
  });
  logger.debug("SATP Enable OpenAPI is valid.");

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
  privacyPolicies.forEach((p, i) =>
    logger.debug("Privacy Policy #%d => %o", i, p),
  );

  logger.debug("Validating SATP Merge Policies...");
  const mergePolicies = validateSatpMergePolicies({
    configValue: config.mergePolicies,
  });
  logger.debug("SATP Merge Policies is valid.");
  mergePolicies.forEach((p, i) => logger.debug("Merge Policy #%d => %o", i, p));

  logger.debug("Validating SATP KeyPair...");
  const keyPair = validateSatpKeyPairJSON({
    configValue: config.gatewayKeyPair,
  });
  logger.debug("SATP KeyPair is valid.");

  logger.debug("Validating SATP Bridges Config...");
  const bridgesConfig = validateSatpBridgesConfig({
    configValue: config.bridgesConfig,
  });

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

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
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
    enableOpenAPI,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    bridgesConfig,
    enableCrashRecovery,
    knexLocalConfig: localRepository,
    knexRemoteConfig: remoteRepository,
  };
  logger.debug("SATPGatewayConfig created successfully");

  const gateway = new SATPGateway(gatewayConfig);
  try {
    logger.info("Starting SATP Gateway...");
    await gateway.startup();
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
