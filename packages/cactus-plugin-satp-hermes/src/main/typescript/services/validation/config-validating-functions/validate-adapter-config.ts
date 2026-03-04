/**
 * Adapter Configuration Validation - Schema validator for API3 adapter configuration
 *
 * @fileoverview
 * Comprehensive validation function that verifies the structural integrity and semantic
 * correctness of API3 adapter configuration before gateway initialization. Catches
 * configuration errors early with detailed error messages indicating the exact location
 * and nature of each problem.
 *
 * @description
 * **Validation Scope:**
 * This validator performs deep structural validation of the entire adapter configuration
 * tree, checking:
 *
 * 1. **Adapter Definitions:**
 *    - Adapter IDs must be unique across all adapters
 *    - Required fields: id (string), name (string), active (boolean), executionPoints (array)
 *    - Optional fields: priority (number), description (string)
 *    - At least one webhook (outbound or inbound) should be configured
 *
 * 2. **Execution Points:**
 *    - Each adapter must have at least one execution point
 *    - Execution point name must be a non-empty string
 *    - Stage must be a valid number (0-3)
 *    - Step must be a non-empty string (e.g., 'checkNewSessionRequest')
 *    - Point must be valid execution step (before, during, after, rollback)
 *
 * 3. **Webhook Configuration:**
 *    - Outbound webhook URLs must be valid absolute URLs (HTTP/HTTPS)
 *    - Timeouts and retry settings are validated for type correctness
 *    - Inbound webhooks only require optional timeoutMs and priority
 *
 * 4. **Global Defaults:**
 *    - Timeout, retry, and log level settings are validated for type correctness
 *    - Global headers must be valid Record<string, string> if present
 *
 * **Error Reporting:**
 * All validation errors include contextual information (adapter ID, field name)
 * to help operators quickly locate and fix configuration problems. Errors are thrown
 * immediately upon first detection with descriptive messages.
 *
 * **Usage Pattern:**
 * This validator is typically invoked during gateway CLI startup or configuration reload:
 * 1. Load adapter configuration from YAML file using loadAdapterConfigFromYaml()
 * 2. Pass configuration to validateAdapterConfig()
 * 3. On success, configuration is safe to use with AdapterManager
 * 4. On failure, error message indicates exact fix required
 *
 * @example
 * Validating configuration loaded from YAML file:
 * ```typescript
 * import { validateAdapterConfig, loadAdapterConfigFromYaml } from './validate-adapter-config';
 *
 * try {
 *   const configData = loadAdapterConfigFromYaml('./config/adapter-config.yml');
 *   const validConfig = validateAdapterConfig({ configValue: configData });
 *
 *   if (validConfig) {
 *     logger.info('Adapter configuration is valid');
 *     // Proceed with AdapterManager initialization
 *   } else {
 *     logger.info('No adapter configuration provided');
 *   }
 * } catch (error) {
 *   logger.error('Invalid adapter configuration:', error.message);
 *   process.exit(1);
 * }
 * ```
 *
 * @example
 * Common validation errors and fixes:
 * ```typescript
 * // Error: "Duplicate adapter id 'monitor' found"
 * // Fix: Ensure unique adapter IDs
 * const config = {
 *   adapters: [
 *     { id: 'monitor-lock', ... },  // Unique IDs
 *     { id: 'monitor-mint', ... }
 *   ]
 * };
 *
 * // Error: "Adapter 'compliance-check' must have at least one execution point"
 * // Fix: Add executionPoints array
 * const config = {
 *   adapters: [
 *     {
 *       id: 'compliance-check',
 *       name: 'Compliance Check',
 *       active: true,
 *       executionPoints: [
 *         { name: 'Pre-lock check', stage: 2, step: 'lockAsset', point: 'before' }
 *       ],
 *       outboundWebhook: { url: 'https://...' }
 *     }
 *   ]
 * };
 *
 * // Error: "Execution point 0 in adapter 'audit' has invalid point 'middle'"
 * // Fix: Use valid point values
 * const point = 'before' | 'during' | 'after' | 'rollback';
 * ```
 *
 * @see {@link AdapterLayerConfiguration} for complete configuration schema
 * @see {@link AdapterManager} for configuration consumption
 * @see {@link AdapterDefinition} for adapter structure
 *
 * @module validate-adapter-config
 * @since 0.0.3-beta
 */

import * as fs from "node:fs";
import * as yaml from "js-yaml";
import type {
  AdapterLayerConfiguration,
  AdapterDefinition,
  AdapterExecutionPointDefinition,
  StageExecutionStep,
  GlobalAdapterDefaults,
  AdapterOutboundWebhookConfig,
  AdapterInboundWebhookConfig,
} from "../../../adapters/adapter-config";
import {
  stageKeyToNumber,
  SatpStageKey,
} from "../../../adapters/adapter-config";
import {
  SATP_PROTOCOL_MAP,
  type SatpStage,
  type SatpStepTag,
} from "../../../core/satp-protocol-map";

/**
 * Valid string stage keys that can be converted to numeric stage values.
 */
const VALID_STAGE_KEYS: SatpStageKey[] = [
  SatpStageKey.Stage0,
  SatpStageKey.Stage1,
  SatpStageKey.Stage2,
  SatpStageKey.Stage3,
];

/**
 * Validation options for adapter configuration.
 */
export interface ValidateAdapterConfigOptions {
  configValue?: AdapterLayerConfiguration;
}

/**
 * Valid execution steps for adapter hooks.
 * Derived from StageExecutionStep type.
 */
const VALID_EXECUTION_STEPS: StageExecutionStep[] = [
  "before",
  "during",
  "after",
  "rollback",
];

/**
 * Valid SATP stage numbers.
 * Derived from SATP_PROTOCOL_MAP keys.
 */
const VALID_STAGES: SatpStage[] = Object.keys(SATP_PROTOCOL_MAP).map(
  (k) => Number(k) as SatpStage,
);

/**
 * Valid log levels for global defaults.
 * Derived from LogLevelDesc type (string variants only).
 */
const VALID_LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "silent"];

/**
 * Get all valid step tags for a given stage from SATP_PROTOCOL_MAP.
 * @param stage - The SATP stage number
 * @returns Array of valid step tags for the stage
 */
function getValidStepTagsForStage(stage: SatpStage): SatpStepTag[] {
  return SATP_PROTOCOL_MAP[stage].steps.map((step) => step.tag);
}

/**
 * Validates a single execution point definition.
 * Accepts both numeric stage values (0-3) and string stage keys ('stage0'-'stage3').
 *
 * @param point - The execution point to validate
 * @param index - Index of the execution point in the array
 * @param adapterId - ID of the parent adapter for error context
 * @throws {Error} When execution point is invalid
 */
function validateExecutionPoint(
  point: AdapterExecutionPointDefinition,
  index: number,
  adapterId: string,
): void {
  const prefix = `Execution point ${index} in adapter "${adapterId}"`;

  // Convert string stage key to number if necessary
  let stageNumber: number | undefined;
  if (typeof point.stage === "number") {
    stageNumber = point.stage;
  } else if (
    typeof point.stage === "string" &&
    VALID_STAGE_KEYS.includes(point.stage as SatpStageKey)
  ) {
    stageNumber = stageKeyToNumber(point.stage as SatpStageKey);
  }

  if (
    stageNumber === undefined ||
    !VALID_STAGES.includes(stageNumber as SatpStage)
  ) {
    throw new Error(
      `${prefix} must have a valid 'stage' number (0-3) or string key ('stage-0'-'stage-3'), got: ${point.stage}`,
    );
  }

  // Validate step tag against SATP_PROTOCOL_MAP for this stage
  if (!point.step || typeof point.step !== "string") {
    throw new Error(`${prefix} must have a valid 'step' string`);
  }

  const validStepTags = getValidStepTagsForStage(stageNumber as SatpStage);
  if (!validStepTags.includes(point.step as SatpStepTag)) {
    throw new Error(
      `${prefix} has invalid step "${point.step}" for stage ${stageNumber}. Valid steps: ${validStepTags.join(", ")}`,
    );
  }

  if (
    !point.point ||
    typeof point.point !== "string" ||
    !VALID_EXECUTION_STEPS.includes(point.point as StageExecutionStep)
  ) {
    throw new Error(
      `${prefix} has invalid point "${point.point}". Must be one of: ${VALID_EXECUTION_STEPS.join(", ")}`,
    );
  }
}

/**
 * Validates webhook configuration for an adapter.
 *
 * @param adapter - The adapter definition to validate webhooks for
 * @throws {Error} When webhook configuration is invalid
 */
function validateWebhooks(adapter: AdapterDefinition): void {
  const { outboundWebhook, outboundWebhooks, inboundWebhook, inboundWebhooks } =
    adapter;

  // Collect all outbound webhooks (single + array)
  const allOutbound: AdapterOutboundWebhookConfig[] = [];
  if (outboundWebhook) allOutbound.push(outboundWebhook);
  if (outboundWebhooks && Array.isArray(outboundWebhooks)) {
    allOutbound.push(...outboundWebhooks);
  }

  // Validate each outbound webhook
  allOutbound.forEach((webhook, index) => {
    validateOutboundWebhook(webhook, adapter.id, index, allOutbound.length > 1);
  });

  // Collect all inbound webhooks (single + array)
  const allInbound: AdapterInboundWebhookConfig[] = [];
  if (inboundWebhook) allInbound.push(inboundWebhook);
  if (inboundWebhooks && Array.isArray(inboundWebhooks)) {
    allInbound.push(...inboundWebhooks);
  }

  // Validate each inbound webhook
  allInbound.forEach((webhook, index) => {
    validateInboundWebhook(webhook, adapter.id, index, allInbound.length > 1);
  });

  // Check for priority conflicts within the same type
  validateWebhookPriorities(allOutbound, adapter.id, "outbound");
  validateWebhookPriorities(allInbound, adapter.id, "inbound");
}

/**
 * Validates a single outbound webhook configuration.
 */
function validateOutboundWebhook(
  webhook: AdapterOutboundWebhookConfig,
  adapterId: string,
  index: number,
  hasMultiple: boolean,
): void {
  const prefix = hasMultiple
    ? `Adapter "${adapterId}" outboundWebhook[${index}]`
    : `Adapter "${adapterId}" outboundWebhook`;

  if (!webhook.url) {
    throw new Error(`${prefix} must have a 'url' property`);
  }

  try {
    new URL(webhook.url);
  } catch {
    throw new Error(`${prefix}.url must be a valid URL, got: "${webhook.url}"`);
  }

  if (
    webhook.timeoutMs !== undefined &&
    (typeof webhook.timeoutMs !== "number" || webhook.timeoutMs <= 0)
  ) {
    throw new Error(`${prefix}.timeoutMs must be a positive number`);
  }

  if (
    webhook.retryAttempts !== undefined &&
    (typeof webhook.retryAttempts !== "number" || webhook.retryAttempts < 0)
  ) {
    throw new Error(`${prefix}.retryAttempts must be a non-negative number`);
  }

  if (
    webhook.priority !== undefined &&
    (typeof webhook.priority !== "number" || webhook.priority < 0)
  ) {
    throw new Error(`${prefix}.priority must be a non-negative number`);
  }
}

/**
 * Validates a single inbound webhook configuration.
 */
function validateInboundWebhook(
  webhook: AdapterInboundWebhookConfig,
  adapterId: string,
  index: number,
  hasMultiple: boolean,
): void {
  const prefix = hasMultiple
    ? `Adapter "${adapterId}" inboundWebhook[${index}]`
    : `Adapter "${adapterId}" inboundWebhook`;

  if (
    webhook.timeoutMs !== undefined &&
    (typeof webhook.timeoutMs !== "number" || webhook.timeoutMs <= 0)
  ) {
    throw new Error(`${prefix}.timeoutMs must be a positive number`);
  }

  if (
    webhook.priority !== undefined &&
    (typeof webhook.priority !== "number" || webhook.priority < 0)
  ) {
    throw new Error(`${prefix}.priority must be a non-negative number`);
  }
}

/**
 * Validates that webhook priorities are unique within the same type (for ordering).
 * Warns if multiple webhooks have the same priority (ties will be broken by array order).
 */
function validateWebhookPriorities(
  webhooks: Array<{ priority?: number }>,
  adapterId: string,
  type: "outbound" | "inbound",
): void {
  if (webhooks.length <= 1) return;

  const priorities = webhooks.map((w) => w.priority ?? 1000);
  const uniquePriorities = new Set(priorities);

  if (uniquePriorities.size < webhooks.length) {
    console.warn(
      `Warning: Adapter "${adapterId}" has multiple ${type} webhooks with the same priority. ` +
        `Execution order for ties will be determined by array order.`,
    );
  }
}

/**
 * Validates a single adapter definition.
 *
 * @param adapter - The adapter definition to validate
 * @param seenIds - Set of already-seen adapter IDs for uniqueness check
 * @throws {Error} When adapter definition is invalid
 */
function validateAdapter(
  adapter: AdapterDefinition,
  seenIds: Set<string>,
): void {
  if (!adapter.id || typeof adapter.id !== "string") {
    throw new Error("Adapter must have a valid 'id' string");
  }

  if (seenIds.has(adapter.id)) {
    throw new Error(`Duplicate adapter id "${adapter.id}" found`);
  }
  seenIds.add(adapter.id);

  if (!adapter.name || typeof adapter.name !== "string") {
    throw new Error(`Adapter "${adapter.id}" must have a valid 'name' string`);
  }

  if (typeof adapter.active !== "boolean") {
    throw new Error(
      `Adapter "${adapter.id}" must have a boolean 'active' field`,
    );
  }

  if (!adapter.executionPoints || !Array.isArray(adapter.executionPoints)) {
    throw new Error(
      `Adapter "${adapter.id}" must have an 'executionPoints' array`,
    );
  }

  if (adapter.executionPoints.length === 0) {
    throw new Error(
      `Adapter "${adapter.id}" must have at least one execution point`,
    );
  }

  adapter.executionPoints.forEach((point, index) => {
    validateExecutionPoint(point, index, adapter.id);
  });

  if (
    adapter.priority !== undefined &&
    (typeof adapter.priority !== "number" || adapter.priority < 0)
  ) {
    throw new Error(
      `Adapter "${adapter.id}" priority must be a non-negative number`,
    );
  }

  validateWebhooks(adapter);

  // Check if at least one webhook is configured (single or array)
  const hasOutbound =
    adapter.outboundWebhook ||
    (adapter.outboundWebhooks && adapter.outboundWebhooks.length > 0);
  const hasInbound =
    adapter.inboundWebhook ||
    (adapter.inboundWebhooks && adapter.inboundWebhooks.length > 0);

  if (!hasOutbound && !hasInbound) {
    console.warn(`Warning: Adapter "${adapter.id}" has no webhooks configured`);
  }
}

/**
 * Validates global adapter defaults.
 *
 * @param global - The global defaults to validate
 * @throws {Error} When global defaults are invalid
 */
function validateGlobalDefaults(global: GlobalAdapterDefaults): void {
  if (
    global.timeoutMs !== undefined &&
    (typeof global.timeoutMs !== "number" || global.timeoutMs <= 0)
  ) {
    throw new Error("Global timeoutMs must be a positive number");
  }

  if (
    global.retryAttempts !== undefined &&
    (typeof global.retryAttempts !== "number" || global.retryAttempts < 0)
  ) {
    throw new Error("Global retryAttempts must be a non-negative number");
  }

  if (
    global.retryDelayMs !== undefined &&
    (typeof global.retryDelayMs !== "number" || global.retryDelayMs < 0)
  ) {
    throw new Error("Global retryDelayMs must be a non-negative number");
  }

  if (
    global.logLevel !== undefined &&
    !VALID_LOG_LEVELS.includes(global.logLevel)
  ) {
    throw new Error(
      `Global logLevel must be one of: ${VALID_LOG_LEVELS.join(", ")}`,
    );
  }

  if (global.headers !== undefined) {
    if (typeof global.headers !== "object" || global.headers === null) {
      throw new Error("Global headers must be an object");
    }
    for (const [key, value] of Object.entries(global.headers)) {
      if (typeof value !== "string") {
        throw new Error(`Global header "${key}" value must be a string`);
      }
    }
  }
}

/**
 * Validates API3 adapter configuration structure.
 *
 * @param options - Configuration options containing the adapter config to validate
 * @returns Validated adapter configuration or undefined if not provided
 * @throws {Error} When adapter configuration contains invalid structure
 * @throws {Error} When adapter IDs are duplicated
 * @throws {Error} When execution points are malformed
 * @throws {Error} When webhook URLs or configurations are malformed
 *
 * @example
 * ```typescript
 * const config = validateAdapterConfig({
 *   configValue: loadedAdapterConfig
 * });
 * ```
 */
export function validateAdapterConfig(
  options: ValidateAdapterConfigOptions,
): AdapterLayerConfiguration | undefined {
  const { configValue } = options;

  if (!configValue) {
    return undefined;
  }

  if (typeof configValue !== "object" || configValue === null) {
    throw new Error("Adapter configuration must be an object when provided");
  }

  if (!configValue.adapters || !Array.isArray(configValue.adapters)) {
    throw new Error("Adapter configuration must contain 'adapters' array");
  }

  // Track seen adapter IDs for uniqueness check
  const seenIds = new Set<string>();

  for (const adapter of configValue.adapters) {
    validateAdapter(adapter, seenIds);
  }

  // Validate global defaults (optional)
  if (configValue.global) {
    validateGlobalDefaults(configValue.global);
  }

  return configValue;
}

/**
 * Loads and parses adapter configuration from a YAML file.
 *
 * @description
 * Reads a YAML configuration file and parses it into an AdapterLayerConfiguration
 * object. This function handles file existence checks and YAML parsing errors
 * with descriptive error messages.
 *
 * @param configPath - Path to the YAML configuration file
 * @returns Parsed adapter configuration object
 * @throws {Error} When file does not exist
 * @throws {Error} When YAML parsing fails
 * @throws {Error} When parsed content is not a valid object
 *
 * @example
 * ```typescript
 * const config = loadAdapterConfigFromYaml('./config/adapter-config.yml');
 * const validated = validateAdapterConfig({ configValue: config });
 * ```
 */
export function loadAdapterConfigFromYaml(
  configPath: string,
): AdapterLayerConfiguration {
  const fnTag = "loadAdapterConfigFromYaml()";

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `${fnTag} Adapter configuration file not found: ${configPath}`,
    );
  }

  let fileContents: string;
  try {
    fileContents = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new Error(
      `${fnTag} Failed to read adapter configuration file: ${configPath}. Error: ${err}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(fileContents);
  } catch (err) {
    throw new Error(
      `${fnTag} Failed to parse YAML configuration: ${configPath}. Error: ${err}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `${fnTag} Invalid adapter configuration: file must contain a valid YAML object`,
    );
  }

  return parsed as AdapterLayerConfiguration;
}

/**
 * Loads, parses, and validates adapter configuration from a YAML file.
 *
 * @description
 * Convenience function that combines loading from YAML and validation in one call.
 * Returns undefined if the file does not exist (allowing optional configuration).
 *
 * @param configPath - Path to the YAML configuration file
 * @param optional - If true, returns undefined when file doesn't exist instead of throwing
 * @returns Validated adapter configuration or undefined
 * @throws {Error} When file exists but cannot be parsed
 * @throws {Error} When configuration validation fails
 *
 * @example
 * ```typescript
 * // Required configuration (throws if missing)
 * const config = loadAndValidateAdapterConfig('./config/adapter-config.yml');
 *
 * // Optional configuration (returns undefined if missing)
 * const config = loadAndValidateAdapterConfig('./config/adapter-config.yml', true);
 * ```
 */
export function loadAndValidateAdapterConfig(
  configPath: string,
  optional: boolean = false,
): AdapterLayerConfiguration | undefined {
  if (!fs.existsSync(configPath)) {
    if (optional) {
      return undefined;
    }
    throw new Error(`Adapter configuration file not found: ${configPath}`);
  }

  const config = loadAdapterConfigFromYaml(configPath);
  return validateAdapterConfig({ configValue: config });
}
