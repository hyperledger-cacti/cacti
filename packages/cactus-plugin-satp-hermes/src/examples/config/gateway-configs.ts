/**
 * SATP Gateway Configuration Examples
 *
 * This file demonstrates various configuration patterns for SATP gateways.
 * These configurations are based on working examples from the
 * satp-gateway-demo repository: https://github.com/RafaelAPB/satp-gateway-demo
 *
 * The JSON configuration files in this directory provide complete examples
 * that can be loaded and used with the SATP Hermes gateway implementation.
 */

/**
 * Configuration Structure Overview
 *
 * The SATP gateway configurations follow this structure from the working demo:
 *
 * 1. GID (Gateway Identification) - Gateway metadata and network details
 * 2. Log Level - Logging configuration (TRACE, DEBUG, INFO, WARN, ERROR)
 * 3. Counter Party Gateways - Other gateways this instance can communicate with
 * 4. Environment - Deployment environment (development, production)
 * 5. Cross-Chain Configuration - Oracle or Bridge configurations for ledger connections
 * 6. Key Pair - Cryptographic keys for the gateway (SATP configurations only)
 * 7. Crash Recovery - Enable/disable crash recovery features
 * 8. Ontology Path - Path to SATP ontology definitions
 */

// Example of how to load and use configuration from JSON files:
export function loadConfigurationFromFile(filePath: string): Promise<any> {
  return import(filePath).then((config) => {
    // Validate required fields
    validateConfiguration(config);
    return config;
  });
}

export function validateConfiguration(config: any): void {
  const requiredFields = ["gid", "logLevel", "environment", "ccConfig"];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }

  // Validate GID (Gateway Identification)
  if (!config.gid.id || !config.gid.name) {
    throw new Error("GID configuration missing required fields (id, name)");
  }

  // Validate log level
  const validLogLevels = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(
      `Invalid log level: ${config.logLevel}. Must be one of: ${validLogLevels.join(", ")}`,
    );
  }

  // Validate environment
  const validEnvironments = ["development", "staging", "production"];
  if (!validEnvironments.includes(config.environment)) {
    throw new Error(
      `Invalid environment: ${config.environment}. Must be one of: ${validEnvironments.join(", ")}`,
    );
  }

  // Validate cross-chain configuration
  if (!config.ccConfig.oracleConfig && !config.ccConfig.bridgeConfig) {
    throw new Error(
      "Cross-chain configuration must have either oracleConfig or bridgeConfig",
    );
  }

  // Validate oracle configuration if present
  if (config.ccConfig.oracleConfig) {
    if (
      !Array.isArray(config.ccConfig.oracleConfig) ||
      config.ccConfig.oracleConfig.length === 0
    ) {
      throw new Error("Oracle configuration must be a non-empty array");
    }
    config.ccConfig.oracleConfig.forEach((oracle: any, index: number) => {
      if (!oracle.networkIdentification || !oracle.signingCredential) {
        throw new Error(
          `Oracle config at index ${index} missing required fields`,
        );
      }
    });
  }

  // Validate bridge configuration if present
  if (config.ccConfig.bridgeConfig) {
    if (
      !Array.isArray(config.ccConfig.bridgeConfig) ||
      config.ccConfig.bridgeConfig.length === 0
    ) {
      throw new Error("Bridge configuration must be a non-empty array");
    }
    config.ccConfig.bridgeConfig.forEach((bridge: any, index: number) => {
      if (!bridge.networkIdentification || !bridge.signingCredential) {
        throw new Error(
          `Bridge config at index ${index} missing required fields`,
        );
      }
    });
  }
}

/**
 * Configuration Templates
 *
 * These are the available configuration templates based on working examples
 * from https://github.com/RafaelAPB/satp-gateway-demo:
 *
 * 1. oracle-case1-config.json - Single network oracle configuration
 * 2. oracle-case2-config.json - Dual network oracle configuration (HTTP)
 * 3. oracle-case3-config.json - Single network oracle configuration (alternative)
 * 4. oracle-case4-config.json - Dual network oracle configuration (HTTP + WS)
 * 5. satp-gateway1-config.json - SATP gateway 1 with bridge configuration
 * 6. satp-gateway2-config.json - SATP gateway 2 with bridge configuration
 */

export const CONFIGURATION_TEMPLATES = {
  ORACLE_CASE1: "./oracle-case1-config.json",
  ORACLE_CASE2: "./oracle-case2-config.json",
  ORACLE_CASE3: "./oracle-case3-config.json",
  ORACLE_CASE4: "./oracle-case4-config.json",
  SATP_GATEWAY1: "./satp-gateway1-config.json",
  SATP_GATEWAY2: "./satp-gateway2-config.json",
} as const;

/**
 * Environment Variable Mapping
 *
 * Common environment variables used in SATP gateway configurations:
 */
export const ENV_VARIABLES = {
  // Gateway Configuration
  GATEWAY_ID: "GATEWAY_ID",
  GATEWAY_NAME: "GATEWAY_NAME",
  GATEWAY_ADDRESS: "GATEWAY_ADDRESS",
  GATEWAY_CLIENT_PORT: "GATEWAY_CLIENT_PORT",
  GATEWAY_SERVER_PORT: "GATEWAY_SERVER_PORT",
  GATEWAY_OAPI_PORT: "GATEWAY_OAPI_PORT",

  // Network Configuration
  NETWORK_1_ID: "NETWORK_1_ID",
  NETWORK_2_ID: "NETWORK_2_ID",
  RPC_API_HTTP_HOST_1: "RPC_API_HTTP_HOST_1",
  RPC_API_HTTP_HOST_2: "RPC_API_HTTP_HOST_2",
  RPC_API_WS_HOST: "RPC_API_WS_HOST",

  // Ethereum Accounts and Keys
  ETH_ACCOUNT_1: "ETH_ACCOUNT_1",
  ETH_ACCOUNT_2: "ETH_ACCOUNT_2",
  PRIVATE_KEY_1: "PRIVATE_KEY_1",
  PRIVATE_KEY_2: "PRIVATE_KEY_2",

  // Gas Configuration
  GAS_LIMIT: "GAS_LIMIT",
  GAS_PRICE: "GAS_PRICE",

  // Gateway Cryptographic Keys
  GATEWAY_PRIVATE_KEY: "GATEWAY_PRIVATE_KEY",
  GATEWAY_PUBLIC_KEY: "GATEWAY_PUBLIC_KEY",

  // Ontology and Recovery
  ONTOLOGY_PATH: "ONTOLOGY_PATH",
  ENABLE_CRASH_RECOVERY: "ENABLE_CRASH_RECOVERY",

  // Logging
  LOG_LEVEL: "LOG_LEVEL",
  ENVIRONMENT: "ENVIRONMENT",
} as const;

/**
 * Configuration Best Practices
 *
 * 1. Security:
 *    - Never hardcode private keys or passwords
 *    - Use environment variables for sensitive data
 *    - Enable TLS in production environments
 *    - Use strong authentication mechanisms
 *
 * 2. Database:
 *    - Use PostgreSQL for production environments
 *    - Configure appropriate connection pools
 *    - Enable SSL for database connections
 *    - Regular database backups and maintenance
 *
 * 3. Performance:
 *    - Configure appropriate timeouts
 *    - Use connection pooling
 *    - Monitor resource usage
 *    - Scale horizontally when needed
 *
 * 4. Monitoring:
 *    - Enable comprehensive logging
 *    - Set up metrics collection
 *    - Configure alerting for critical issues
 *    - Regular health checks
 *
 * 5. Development vs Production:
 *    - Use in-memory databases for testing
 *    - Disable security features in development
 *    - Enable all monitoring in production
 *    - Use production-grade infrastructure
 */

export default {
  CONFIGURATION_TEMPLATES,
  ENV_VARIABLES,
  loadConfigurationFromFile,
  validateConfiguration,
};
