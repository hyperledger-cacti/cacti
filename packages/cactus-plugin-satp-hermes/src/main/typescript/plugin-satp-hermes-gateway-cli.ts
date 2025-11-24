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
 * - API3 adapter configuration for external webhook integrations
 *
 * **Configuration Files:**
 * The CLI expects configuration files at the following locations:
 *
 * 1. **Gateway Configuration** (required):
 *    `/opt/cacti/satp-hermes/config/config.json`
 *    Contains SATPGatewayConfig properties including gateway identity, cryptographic keys,
 *    database repositories, and cross-chain bridge configurations.
 *
 * 2. **Adapter Configuration** (optional):
 *    `/opt/cacti/satp-hermes/config/adapter-config.yml`
 *    YAML file defining API3 adapter webhooks for external system integration.
 *    When present, enables outbound notifications and inbound approval workflows
 *    at specific SATP protocol execution points.
 *
 * **Adapter Configuration Structure:**
 * ```yaml
 * adapters:
 *   - id: "compliance-check"
 *     name: "AML/KYC Compliance"
 *     active: true
 *     priority: 100  # Global priority for ordering between adapters at same execution point
 *     executionPoints:
 *       - stage: 2
 *         step: "checkLockAssertionRequest"
 *         point: "before"
 *     # Single outbound webhook (backward compatible)
 *     outboundWebhook:
 *       url: "https://compliance.example.com/check"
 *       timeoutMs: 30000
 *       priority: 1  # Hook priority for ordering multiple hooks within this adapter
 *     # OR multiple outbound webhooks with individual priorities
 *     outboundWebhooks:
 *       - url: "https://audit.example.com/log"
 *         timeoutMs: 5000
 *         priority: 1  # Executes first
 *       - url: "https://monitor.example.com/notify"
 *         timeoutMs: 3000
 *         priority: 2  # Executes second
 *     # Inbound webhooks pause execution until external approval
 *     inboundWebhook:
 *       timeoutMs: 300000  # 5 minutes timeout
 *       priority: 1
 * global:
 *   timeoutMs: 10000
 *   retryAttempts: 3
 * ```
 *
 * **Priority System:**
 * - `adapter.priority`: Orders adapters at the same execution point (stage/step/point).
 *   Lower numbers execute first. Default: 1000.
 * - `webhook.priority`: Orders multiple webhooks within the same adapter.
 *   Lower numbers execute first. Default: 1000.
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
 * # Optionally provide adapter-config.yml for webhook integrations
 * node plugin-satp-hermes-gateway-cli.js
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link SATPGateway} for gateway implementation
 * @see {@link SATPGatewayConfig} for configuration structure
 * @see {@link AdapterLayerConfiguration} for adapter configuration schema
 * @see {@link launchGateway} for main launcher function
 *
 * @since 0.0.3-beta
 */

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  SATPGateway,
  type SATPGatewayConfig,
} from "./plugin-satp-hermes-gateway";

// Process-level error handlers for container/CLI deployment
// These ensure that unhandled errors are properly logged before exit
if (require.main === module) {
  process.on("uncaughtException", (err: Error) => {
    console.error("[SATP Gateway] Uncaught Exception:", err);
    process.exit(255);
  });

  process.on(
    "unhandledRejection",
    (reason: unknown, promise: Promise<unknown>) => {
      console.error(
        "[SATP Gateway] Unhandled Rejection at:",
        promise,
        "reason:",
        reason,
      );
      process.exit(255);
    },
  );
}

import { validateSatpGatewayIdentity } from "./services/validation/config-validating-functions/validate-satp-gateway-identity";
import { validateSatpCounterPartyGateways } from "./services/validation/config-validating-functions/validate-satp-counter-party-gateways";
import { validateSatpLogLevel } from "./services/validation/config-validating-functions/validate-satp-log-level";
import { validateSatpEnvironment } from "./services/validation/config-validating-functions/validate-satp-environment";
import { validateSatpValidationOptions } from "./services/validation/config-validating-functions/validate-satp-validation-options";
import { validateSatpPrivacyPolicies } from "./services/validation/config-validating-functions/validate-satp-privacy-policies";
import { validateSatpMergePolicies } from "./services/validation/config-validating-functions/validate-satp-merge-policies";
import { validateSatpKeyPairJSON } from "./services/validation/config-validating-functions/validate-key-pair-json";
import { validateCCConfig } from "./services/validation/config-validating-functions/validate-cc-config";
import { validateSatpEnableCrashRecovery } from "./services/validation/config-validating-functions/validate-satp-enable-crash-recovery";
import { validateKnexRepositoryConfig } from "./services/validation/config-validating-functions/validate-knex-repository-config";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { validateInstanceId } from "./services/validation/config-validating-functions/validate-instance-id";
import { v4 as uuidv4 } from "uuid";
import { validateOntologyPath } from "./services/validation/config-validating-functions/validate-ontology-path";
import { validateExtensions } from "./services/validation/config-validating-functions/validate-extensions";
import { validateAdapterConfig } from "./services/validation/config-validating-functions/validate-adapter-config";
import { loadGatewayConfig } from "./services/validation/load-gateway-config";

// Re-export config loading utilities for external consumers
export type {
  LoadConfigOptions,
  LoadConfigResult,
} from "./services/validation/load-gateway-config";
export { loadGatewayConfig } from "./services/validation/load-gateway-config";

/**
 * Launch SATP Gateway - Main CLI function for gateway deployment and startup.
 *
 * @description
 * Primary launcher function for SATP gateways in production environments. Performs
 * comprehensive configuration validation, gateway initialization, and service startup
 * with proper error handling and logging. Designed for containerized deployment
 * with external configuration management and monitoring integration.
 *
 * **Launch Options:**
 * The function accepts optional {@link LaunchGatewayOptions} to customize paths:
 * - `workDir`: Base working directory (default: `/opt/cacti/satp-hermes`)
 * - `configPath`: Path to gateway JSON config (default: `{workDir}/config/config.json`)
 * - `adapterConfigPath`: Path to adapter YAML config (default: `{workDir}/config/adapter-config.yml`)
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
 * 10. **Adapter Configuration**: Validate API3 adapter webhooks (if YAML file present)
 *
 * **Gateway Startup Process:**
 * After successful validation, creates SATPGateway instance and initiates startup
 * sequence including database initialization, cross-chain mechanism deployment,
 * and protocol server activation. Optionally starts OpenAPI server for management.
 *
 * **Logging YAML Configuration:**
 * The adapter configuration loaded from YAML is converted to a JavaScript object
 * by `js-yaml`. To log/print the parsed configuration, use `JSON.stringify()`:
 * ```typescript
 * const adapterConfig = loadAdapterConfigFromYaml(adapterConfigPath);
 * logger.debug(`Adapter config: ${JSON.stringify(adapterConfig, null, 2)}`);
 * ```
 *
 * **Error Handling:**
 * Comprehensive error handling with detailed logging for configuration issues,
 * startup failures, and runtime errors. Ensures proper cleanup and shutdown
 * on failure conditions with appropriate exit codes.
 *
 * @param opts - Optional configuration for customizing file paths
 * @param opts.workDir - Base working directory (default: `/opt/cacti/satp-hermes`)
 * @param opts.configPath - Path to gateway configuration JSON file
 * @param opts.adapterConfigPath - Path to adapter configuration YAML file
 *
 * @returns Promise resolving when gateway is fully operational
 *
 * @throws {Error} When configuration file is missing or inaccessible
 * @throws {Error} When configuration validation fails for any section
 * @throws {Error} When gateway initialization or startup fails
 * @throws {Error} When database or cross-chain mechanism setup fails
 *
 * @example
 * CLI launcher with default paths:
 * ```typescript
 * // Uses default paths: /opt/cacti/satp-hermes/config/
 * await launchGateway();
 * ```
 *
 * @example
 * Custom configuration paths:
 * ```typescript
 * await launchGateway({
 *   workDir: '/custom/path',
 *   configPath: '/custom/path/gateway.json',
 *   adapterConfigPath: '/custom/path/adapters.yml',
 * });
 * ```
 *
 * @example
 * Programmatic gateway launch with error handling:
 * ```typescript
 * import { launchGateway } from './plugin-satp-hermes-gateway-cli';
 *
 * try {
 *   await launchGateway({ workDir: process.env.SATP_WORK_DIR });
 *   console.log('Gateway launched successfully');
 * } catch (error) {
 *   console.error('Gateway launch failed:', error);
 *   process.exit(1);
 * }
 * ```
 *
 * @see {@link SATPGateway} for gateway implementation
 * @see {@link SATPGatewayConfig} for configuration structure
 * @see {@link LaunchGatewayOptions} for launch options
 * @see {@link validateSatpGatewayIdentity} for identity validation
 * @see {@link validateCCConfig} for cross-chain configuration validation
 * @see {@link validateSatpKeyPairJSON} for cryptographic key validation
 *
 * @since 0.0.3-beta
 */

/**
 * Options for customizing the gateway launch configuration paths.
 *
 * @interface LaunchGatewayOptions
 * @property {string} [workDir] - Base working directory for configuration files.
 *   Defaults to `/opt/cacti/satp-hermes`. Used to derive default paths for
 *   `configPath` and `adapterConfigPath` if not explicitly provided.
 * @property {string} [configPath] - Absolute path to the gateway configuration JSON file.
 *   Defaults to `{workDir}/config/config.json`. Must contain valid SATPGatewayConfig.
 * @property {string} [adapterConfigPath] - Absolute path to the adapter configuration YAML file.
 *   Defaults to `{workDir}/config/adapter-config.yml`. Optional - gateway will start
 *   without adapter webhooks if file is not present.
 */
interface LaunchGatewayOptions {
  workDir?: string;
  configPath?: string;
  adapterConfigPath?: string;
}

export async function launchGateway(
  opts?: LaunchGatewayOptions,
): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });

  const { config, adapterConfig: adapterConfigRaw } = await loadGatewayConfig(
    opts,
    logger,
  );

  const instanceId = await runValidation(
    "SATP Gateway instanceId",
    logger,
    () => validateInstanceId({ configValue: config.instanceId }),
  );

  const gid = await runValidation("SATP Gateway Identity", logger, () =>
    validateSatpGatewayIdentity({ configValue: config.gid }, logger),
  );

  const counterPartyGateways = await runValidation(
    "SATP Counter Party Gateways",
    logger,
    () =>
      validateSatpCounterPartyGateways(
        { configValue: config.counterPartyGateways },
        logger,
      ),
  );

  const logLevel = await runValidation("SATP Log Level", logger, () =>
    validateSatpLogLevel({ configValue: config.logLevel }),
  );

  const environment = await runValidation("SATP Environment", logger, () =>
    validateSatpEnvironment({ configValue: config.environment }),
  );

  const validationOptions = await runValidation(
    "SATP Validation Options",
    logger,
    () =>
      validateSatpValidationOptions({ configValue: config.validationOptions }),
  );

  const privacyPolicies = await runValidation(
    "SATP Privacy Policies",
    logger,
    () => validateSatpPrivacyPolicies({ configValue: config.privacyPolicies }),
  );
  privacyPolicies.forEach((p: unknown, i: unknown) =>
    logger.debug("Privacy Policy #%d => %o", i, p),
  );

  const mergePolicies = await runValidation("SATP Merge Policies", logger, () =>
    validateSatpMergePolicies({ configValue: config.mergePolicies }),
  );
  mergePolicies.forEach((p: unknown, i: unknown) =>
    logger.debug("Merge Policy #%d => %o", i, p),
  );

  const keyPair = await runValidation("SATP KeyPair", logger, () =>
    validateSatpKeyPairJSON({ configValue: config.keyPair }, logger),
  );

  const ccConfig = await runValidation("Cross Chain Config", logger, () =>
    validateCCConfig({ configValue: config.ccConfig || null }, logger),
  );

  const localRepository = await runValidation(
    "Local Repository Config",
    logger,
    () => validateKnexRepositoryConfig({ configValue: config.localRepository }),
  );

  const remoteRepository = await runValidation(
    "Remote Repository Config",
    logger,
    () =>
      validateKnexRepositoryConfig({ configValue: config.remoteRepository }),
  );

  const enableCrashRecovery = await runValidation(
    "SATP Enable Crash Recovery",
    logger,
    () =>
      validateSatpEnableCrashRecovery({
        configValue: config.enableCrashRecovery,
      }),
  );

  const ontologyPath = await runValidation("Ontologies Path", logger, () =>
    validateOntologyPath({ configValue: config.ontologyPath }),
  );

  const extensions = await runValidation("Extensions", logger, () =>
    validateExtensions({ configValue: config.extensions }),
  );

  const adapterConfig = await runValidation(
    "Adapter Configuration",
    logger,
    () => validateAdapterConfig({ configValue: adapterConfigRaw }),
  );

  const toKeyPairBuffers = (
    kp: { publicKey: string; privateKey: string } | undefined,
  ) =>
    kp
      ? {
          publicKey: Buffer.from(kp.publicKey, "hex"),
          privateKey: Buffer.from(kp.privateKey, "hex"),
        }
      : undefined;

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
    instanceId: instanceId || uuidv4(),
    gid,
    counterPartyGateways,
    logLevel,
    keyPair: toKeyPairBuffers(keyPair),
    environment,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    ccConfig,
    enableCrashRecovery,
    localRepository,
    remoteRepository,
    extensions,
    adapterConfig,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    ontologyPath,
  };

  logger.info("SATPGatewayConfig created successfully");
  logger.debug(`SATPGatewayConfig: ${JSON.stringify(gatewayConfig, null, 2)}`);

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
    logger.error(`SATP Gateway crashed. Exiting...`, ex);
    await gateway.shutdown();
    if (require.main === module) {
      process.exit(1);
    }
    throw ex;
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
  launchGateway()
    .then(() => {
      console.log("[SATP Gateway] Gateway launched successfully");
    })
    .catch((error: Error) => {
      console.error("[SATP Gateway] Failed to launch gateway:", error.message);
      console.error("[SATP Gateway] Stack trace:", error.stack);
      process.exit(1);
    });
}

const runValidation = <T>(
  label: string,
  logger: Logger,
  validationFn: () => T | Promise<T>,
): Promise<T> => {
  logger.debug(`Validating ${label}...`);
  const result = Promise.resolve(validationFn());
  result.then(() => logger.debug(`${label} is valid.`));
  return result;
};
