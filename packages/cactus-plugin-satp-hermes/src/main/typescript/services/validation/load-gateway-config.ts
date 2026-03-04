/**
 * Gateway Configuration Loading Utilities
 *
 * @fileoverview
 * Utility functions for loading and parsing SATP gateway configuration files.
 * Provides detailed error messages and debugging information when configuration
 * files are missing or invalid.
 *
 * @module services/validation/load-gateway-config
 * @since 0.0.3-beta
 */

import { Logger } from "@hyperledger/cactus-common";
import fs from "fs-extra";
import path from "node:path";
import { loadAdapterConfigFromYaml } from "./config-validating-functions/validate-adapter-config";
import type { AdapterLayerConfiguration } from "../../adapters/adapter-config";

/**
 * Options for loading gateway configuration files.
 */
export interface LoadConfigOptions {
  /** Base working directory for configuration files */
  workDir?: string;
  /** Path to the main gateway configuration JSON file */
  configPath?: string;
  /** Path to the adapter configuration YAML file (optional) */
  adapterConfigPath?: string;
}

/**
 * Result of loading and parsing configuration files.
 */
export interface LoadConfigResult {
  /** Parsed gateway configuration object */
  config: Record<string, unknown>;
  /** Parsed adapter configuration (if present) */
  adapterConfig: AdapterLayerConfiguration | undefined;
  /** Resolved path to the config file */
  configPath: string;
  /** Resolved path to the adapter config file */
  adapterConfigPath: string;
  /** Resolved working directory */
  workDir: string;
}

/**
 * Default working directory for SATP gateway configuration.
 */
export const DEFAULT_WORK_DIR = "/opt/cacti/satp-hermes";

/**
 * Default configuration file name.
 */
export const DEFAULT_CONFIG_FILENAME = "config.json";

/**
 * Default adapter configuration file name.
 */
export const DEFAULT_ADAPTER_CONFIG_FILENAME = "adapter-config.yml";

/**
 * Load and parse gateway configuration files.
 *
 * @description
 * Utility function to load the gateway configuration JSON file and optionally
 * the adapter configuration YAML file. Provides detailed error messages and
 * debugging information when configuration files are missing or invalid.
 *
 * This function can be used independently of the full gateway launch process,
 * making it useful for configuration validation, testing, and tooling.
 *
 * @param opts - Configuration loading options
 * @param logger - Logger instance for debug/error output
 * @returns Promise resolving to the loaded configuration
 * @throws Error if the main configuration file is missing or invalid
 *
 * @example
 * ```typescript
 * const logger = LoggerProvider.getOrCreate({ level: "DEBUG", label: "config-loader" });
 * const { config, adapterConfig } = await loadGatewayConfig({
 *   workDir: "/custom/path",
 * }, logger);
 * ```
 */
export async function loadGatewayConfig(
  opts: LoadConfigOptions | undefined,
  logger: Logger,
): Promise<LoadConfigResult> {
  const workDir = opts?.workDir ?? DEFAULT_WORK_DIR;
  const configPath =
    opts?.configPath ?? path.join(workDir, "config", DEFAULT_CONFIG_FILENAME);
  const adapterConfigPath =
    opts?.adapterConfigPath ??
    path.join(workDir, "config", DEFAULT_ADAPTER_CONFIG_FILENAME);

  logger.debug("Checking for configuration file...");
  logger.info(`Working directory: ${workDir}`);
  logger.info(`Config path: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    logConfigNotFoundError(logger, configPath, workDir);
    throw new Error(
      `Configuration file not found at ${configPath}. ` +
        `Please create the configuration file or mount it in Docker. ` +
        `See SATP Gateway documentation for configuration schema.`,
    );
  }

  logger.debug(`Reading configuration from: ${configPath}`);
  const config = await fs.readJson(configPath);

  logger.info("Configuration read OK");
  logger.debug(`Config: ${JSON.stringify(config, null, 2)}`);

  // Load adapter configuration from YAML file (optional - won't fail if file missing)
  const adapterConfig = await loadAdapterConfig(adapterConfigPath, logger);

  return {
    config,
    adapterConfig,
    configPath,
    adapterConfigPath,
    workDir,
  };
}

/**
 * Load adapter configuration from YAML file (optional).
 *
 * @param adapterConfigPath - Path to the adapter configuration YAML file
 * @param logger - Logger instance for debug/error output
 * @returns Parsed adapter configuration or undefined if file doesn't exist
 * @throws Error if the file exists but cannot be parsed
 */
async function loadAdapterConfig(
  adapterConfigPath: string,
  logger: Logger,
): Promise<AdapterLayerConfiguration | undefined> {
  logger.debug(`Loading adapter configuration from: ${adapterConfigPath}`);
  let adapterConfig: AdapterLayerConfiguration | undefined;

  try {
    if (fs.existsSync(adapterConfigPath)) {
      adapterConfig = loadAdapterConfigFromYaml(adapterConfigPath);
      logger.debug("Adapter configuration file loaded successfully");
    } else {
      logger.debug("No adapter configuration file found (optional)");
    }
  } catch (err) {
    logger.error(`Failed to load adapter configuration: ${err}`);
    throw err;
  }

  logger.debug(`Adapter Config: ${JSON.stringify(adapterConfig, null, 2)}`);
  return adapterConfig;
}

/**
 * Log detailed error information when configuration file is not found.
 *
 * @param logger - Logger instance for error output
 * @param configPath - Path where config file was expected
 * @param workDir - Working directory being used
 */
function logConfigNotFoundError(
  logger: Logger,
  configPath: string,
  workDir: string,
): void {
  logger.error(`Configuration file not found at: ${configPath}`);
  logger.error("Expected configuration file location: " + configPath);

  logger.error(`Listing contents of workDir (${workDir}):`);
  try {
    if (fs.existsSync(workDir)) {
      const workDirContents = fs.readdirSync(workDir);
      logger.error(`  Contents: ${JSON.stringify(workDirContents)}`);
    } else {
      logger.error(`  Directory does not exist: ${workDir}`);
    }
  } catch (err) {
    logger.error(`  Error listing workDir: ${err}`);
  }

  const configDir = path.dirname(configPath);
  logger.error(`Listing contents of config directory (${configDir}):`);
  try {
    if (fs.existsSync(configDir)) {
      const configDirContents = fs.readdirSync(configDir);
      logger.error(`  Contents: ${JSON.stringify(configDirContents)}`);
    } else {
      logger.error(`  Directory does not exist: ${configDir}`);
    }
  } catch (err) {
    logger.error(`  Error listing config directory: ${err}`);
  }

  logger.error(
    "Please ensure the configuration file exists and is mounted correctly.",
  );
  logger.error(
    "For Docker deployments, mount your config with: -v /path/to/config:/opt/cacti/satp-hermes/config",
  );
}
