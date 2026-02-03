#!/usr/bin/env node

/**
 * SATP Gateway CLI Launcher - Command-line interface for SATP gateway deployment
 *
 * @fileoverview
 * Command-line launcher for SATP-Hermes gateways providing configuration validation,
 * gateway initialization, and production deployment capabilities. Supports containerized
 * deployment with external configuration files and comprehensive validation of all
 * SATP protocol parameters and cross-chain mechanism configurations.
 *
 * @group Gateway CLI
 * @module plugin-satp-hermes-gateway-cli
 * @since 0.0.3-beta
 *
 * **CLI Usage Context:**
 * This CLI is designed for production deployments where SATP gateways run as
 * standalone services with external configuration management. Supports:
 * - Docker container deployment with mounted configuration
 * - Configuration file validation with detailed error reporting
 * - Graceful startup and shutdown with proper error handling
 * - Production logging and monitoring integration
 * - OpenAPI server activation for gateway management
 *
 * **Configuration File Structure:**
 * Expects a JSON configuration file at `/opt/cacti/satp-hermes/config/config.json`
 * containing all SATPGatewayConfig properties with comprehensive validation
 * for each configuration section including gateway identity, cryptographic keys,
 * database repositories, and cross-chain bridge configurations.
 *
 * @module SatpGatewayCLI
 *
 * @example
 * CLI execution in Docker container:
 * ```bash
 * # Mount configuration and run gateway
 * docker run -v /path/to/config:/opt/cacti/satp-hermes/config \
 *   hyperledger/cactus-plugin-satp-hermes
 * ```
 *
 * @example
 * Direct Node.js execution:
 * ```bash
 * # Ensure config.json exists in expected location
 * node plugin-satp-hermes-gateway-cli.js
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link SATPGateway} for gateway implementation
 * @see {@link SATPGatewayConfig} for configuration structure
 * @see {@link launchGateway} for main launcher function
 *
 * @since 0.0.3-beta
 */

import { LoggerProvider } from "@hyperledger-cacti/cactus-common";
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
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { validateInstanceId } from "./services/validation/config-validating-functions/validate-instance-id";
import { v4 as uuidv4 } from "uuid";
import { validateOntologyPath } from "./services/validation/config-validating-functions/validate-ontology-path";
import { validateExtensions } from "./services/validation/config-validating-functions/validate-extensions";

/**
 * Launch SATP Gateway - Main CLI function for gateway deployment and startup.
 *
 * @description
 * Primary launcher function for SATP gateways in production environments. Performs
 * comprehensive configuration validation, gateway initialization, and service startup
 * with proper error handling and logging. Designed for containerized deployment
 * with external configuration management and monitoring integration.
 *
 * **Configuration Validation Sequence:**
 * 1. **File System Validation**: Verify configuration file existence and accessibility
 * 2. **Gateway Identity Validation**: Validate gateway ID, keys, and network configuration
 * 3. **Counter-party Gateway Validation**: Verify known gateway configurations
 * 4. **Environment Configuration**: Validate deployment environment settings
 * 5. **Cryptographic Key Validation**: Verify key pair format and cryptographic integrity
 * 6. **Database Configuration**: Validate local and remote repository configurations
 * 7. **Cross-chain Configuration**: Verify bridge configurations and DLT connections
 * 8. **Policy Validation**: Validate privacy and merge policies for data handling
 * 9. **Recovery Configuration**: Verify crash recovery and persistence settings
 *
 * **Gateway Startup Process:**
 * After successful validation, creates SATPGateway instance and initiates startup
 * sequence including database initialization, cross-chain mechanism deployment,
 * and protocol server activation. Optionally starts OpenAPI server for management.
 *
 * **Error Handling:**
 * Comprehensive error handling with detailed logging for configuration issues,
 * startup failures, and runtime errors. Ensures proper cleanup and shutdown
 * on failure conditions with appropriate exit codes.
 *
 * @returns Promise resolving when gateway is fully operational
 *
 * @throws {Error} When configuration file is missing or inaccessible
 * @throws {Error} When configuration validation fails for any section
 * @throws {Error} When gateway initialization or startup fails
 * @throws {Error} When database or cross-chain mechanism setup fails
 *
 * @example
 * CLI launcher with configuration validation:
 * ```typescript
 * // Called automatically when script is executed directly
 * if (require.main === module) {
 *   launchGateway();
 * }
 * ```
 *
 * @example
 * Programmatic gateway launch:
 * ```typescript
 * import { launchGateway } from './plugin-satp-hermes-gateway-cli';
 *
 * try {
 *   await launchGateway();
 *   console.log('Gateway launched successfully');
 * } catch (error) {
 *   console.error('Gateway launch failed:', error);
 *   process.exit(1);
 * }
 * ```
 *
 * @see {@link SATPGateway} for gateway implementation
 * @see {@link SATPGatewayConfig} for configuration structure
 * @see {@link validateSatpGatewayIdentity} for identity validation
 * @see {@link validateCCConfig} for cross-chain configuration validation
 * @see {@link validateSatpKeyPairJSON} for cryptographic key validation
 *
 * @since 0.0.3-beta
 */
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

/**
 * CLI Entry Point - Direct execution handler for command-line usage.
 *
 * @description
 * Automatically launches the SATP gateway when this file is executed directly
 * from the command line or in a container environment. Provides the main
 * entry point for production deployments and development environments.
 *
 * **Execution Context:**
 * This condition ensures the launcher only runs when the file is executed
 * directly (not when imported as a module), making it safe for both
 * programmatic use and CLI deployment scenarios.
 *
 * **Container Integration:**
 * Designed for Docker container deployment where this CLI serves as the
 * main process (PID 1) for SATP gateway containers with proper signal
 * handling and graceful shutdown capabilities.
 *
 * @example
 * Direct CLI execution:
 * ```bash
 * node plugin-satp-hermes-gateway-cli.js
 * # or with direct Node.js execution permission:
 * ./plugin-satp-hermes-gateway-cli.js
 * ```
 *
 * @example
 * Container deployment:
 * ```dockerfile
 * FROM node:18-alpine
 * COPY . /app
 * WORKDIR /app
 * CMD ["node", "plugin-satp-hermes-gateway-cli.js"]
 * ```
 *
 * @see {@link launchGateway} for the main launcher implementation
 * @see {@link SATPGateway} for gateway functionality
 *
 * @since 0.0.3-beta
 */
if (require.main === module) {
  launchGateway();
}
