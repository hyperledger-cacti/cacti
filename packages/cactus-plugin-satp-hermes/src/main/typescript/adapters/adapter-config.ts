/**
 * SATP Adapter Configuration Types - External integration contracts for SATP gateway webhooks
 *
 * @fileoverview
 * Comprehensive type system for the adapter framework enabling external systems
 * to integrate with SATP protocol execution through webhook-based event subscriptions
 * and approval workflows. This module defines the complete configuration contract
 * that operators use to declare adapter behavior per SATP stage.
 *
 * @description
 * The adapter system allows external controllers, monitoring platforms, and
 * compliance systems to participate in SATP cross-chain transfers through two
 * primary mechanisms:
 *
 * **Outbound Webhooks (Blocking Notifications):**
 * - Gateway notifies external systems when SATP lifecycle events occur
 * - Used for monitoring, logging, metrics collection, and audit trails
 * - Blocking: SATP execution waits for a response before continuing
 * - Supports retry logic with exponential backoff for reliability
 *
 * **Inbound Webhooks (Blocking Approval):**
 * - Gateway pauses SATP execution until external system posts a decision
 * - Used for manual approvals, compliance checks, and business rule validation
 * - Blocking: SATP transfer waits for external controller response or timeout
 * - Enables human-in-the-loop workflows and policy enforcement
 *
 * **Configuration Architecture:**
 * Adapters are organized hierarchically by SATP stage (stage0-stage3, crash) and
 * optionally by execution step (before/during/after/rollback). Each adapter declares:
 * - Unique identifier and human-readable metadata
 * - Webhook endpoints (outbound URLs or inbound path suffixes)
 * - HTTP settings (method, headers, timeout, retry policy)
 * - Active/inactive flag for runtime toggling without config removal
 * - Priority ordering for deterministic multi-adapter execution
 *
 * **Execution Model:**
 * When a SATP stage reaches a configured step, the {@link AdapterManager} resolves
 * the applicable adapters and the {@link AdapterHookService} invokes them in
 * priority order. Outbound webhooks run concurrently while inbound webhooks
 * serialize to maintain clear approval semantics.
 *
 * @example
 * Minimal adapter configuration for stage 1 monitoring:
 * ```typescript
 * const config: AdapterLayerConfiguration = {
 *   adapters: [
 *     {
 *       id: "lock-monitor",
 *       name: "Asset Lock Notification",
 *       active: true,
 *       executionPoints: [
 *         { stage: 1, step: "checkTransferProposalRequestMessage", point: "before" }
 *       ],
 *       outboundWebhook: {
 *         url: "https://monitor.example.com/satp/lock-detected",
 *         timeoutMs: 5000
 *       }
 *     }
 *   ]
 * };
 * ```
 *
 * @example
 * Advanced configuration with inbound approval (priority only affects adapters at same execution point):
 * ```typescript
 * const config: AdapterLayerConfiguration = {
 *   adapters: [
 *     {
 *       id: "compliance-check",
 *       name: "AML/KYC Compliance Verification",
 *       active: true,
 *       priority: 1, // runs before audit-log at same execution point
 *       executionPoints: [
 *         { stage: 2, step: "checkLockAssertionRequest", point: "before" }
 *       ],
 *       inboundWebhook: {
 *         timeoutMs: 300000 // 5 min timeout
 *       }
 *     },
 *     {
 *       id: "audit-log",
 *       name: "Commitment Audit Logger",
 *       active: true,
 *       priority: 2, // runs after compliance-check at same execution point
 *       executionPoints: [
 *         { stage: 2, step: "checkLockAssertionRequest", point: "before" }
 *       ],
 *       outboundWebhook: {
 *         url: "https://audit.example.com/satp/commitments",
 *         retryAttempts: 5,
 *         retryDelayMs: 2000
 *       }
 *     }
 *   ],
 *   global: {
 *     timeoutMs: 30000,
 *     retryAttempts: 3,
 *     logLevel: "info"
 *   }
 * };
 * ```
 *
 * @see {@link AdapterManager} for configuration indexing and lookup
 * @see {@link AdapterHookService} for webhook execution orchestration
 * @see {@link OutboundWebhookPayload} for outbound event schema
 * @see {@link InboundWebhookDecisionResponse} for inbound decision schema
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Specification
 *
 * @module adapter-config
 * @remarks File name retained for compatibility; types correspond to API Type 3 (Adapter Layer).
 * @since 0.0.3-beta
 */

// ============================================================================
// Re-export generated types from OpenAPI SDK
// These are the canonical types generated from the OpenAPI spec (oapi-api1.yml)
// and should be used throughout the codebase for consistency.
// ============================================================================

// First, import types we need for local interface definitions
import type {
  AdapterOutboundWebhookConfig as GenOutboundWebhookConfig,
  AdapterInboundWebhookConfig as GenInboundWebhookConfig,
  AdapterRetryPolicy as GenRetryPolicy,
  AdapterStageExecutionStep,
} from "../generated/gateway-client/typescript-axios";

export type {
  /** Common HTTP attributes shared by adapter webhook definitions. */
  AdapterBaseWebhookConfig,

  /**
   * Adapter definition - a configuration unit that defines webhooks for specific
   * execution points in the SATP protocol flow.
   *
   * **Configuration Properties:**
   * - `id`: Stable identifier used for logging and inbound routing. Must be unique
   *   within the adapter configuration.
   * - `name`: Human-friendly adapter label for operator visibility.
   * - `description`: Optional textual description for documentation.
   * - `active`: Enables/disables adapter without removing its configuration.
   *   Disabled adapters are skipped during execution.
   * - `priority`: Ordering when multiple adapters are at the same execution point.
   *   Lower numbers run earlier. Defaults to 1000.
   * - `executionPoints`: Array of execution points where this adapter should invoke.
   *   Each point specifies stage (0-3), step identifier, and hook position
   *   (before/during/after/rollback).
   *
   * **Webhook Options (mutually exclusive at same execution point):**
   * - `outboundWebhook`: Single outbound webhook for notifications
   * - `outboundWebhooks`: Array of outbound webhooks for multiple notifications
   * - `inboundWebhook`: Single inbound webhook for approval gates
   * - `inboundWebhooks`: Array of inbound webhooks for multi-party approval
   *
   * @example
   * ```typescript
   * const adapter: AdapterDefinition = {
   *   id: "compliance-check",
   *   name: "AML/KYC Compliance Verification",
   *   description: "Validates transfer against compliance rules before lock",
   *   active: true,
   *   priority: 1,
   *   executionPoints: [
   *     { stage: 1, step: "checkTransferProposalRequestMessage", point: "before" }
   *   ],
   *   inboundWebhook: { timeoutMs: 300000 }
   * };
   * ```
   *
   * @see AdapterExecutionPointDefinition - Execution point specification
   * @see AdapterOutboundWebhookConfig - Outbound webhook configuration
   * @see AdapterInboundWebhookConfig - Inbound approval webhook configuration
   */
  AdapterDefinition,

  /** Execution point definition within an adapter. */
  AdapterDefinitionExecutionPointsInner,
  /** Inbound webhook configuration within an adapter definition. */
  AdapterDefinitionInboundWebhook,
  /** Outbound webhook configuration within an adapter definition. */
  AdapterDefinitionOutboundWebhook,
  /** Execution point definition - where an adapter should execute. */
  AdapterExecutionPointDefinition,

  /**
   * Global defaults applied to all adapters unless overridden at the adapter level.
   *
   * **Default Settings:**
   * - `timeoutMs`: Default timeout for webhook invocations (default: 5000ms)
   * - `retryAttempts`: Default number of retry attempts (default: 3)
   * - `retryDelayMs`: Default backoff delay between retries (default: 1000ms)
   * - `logLevel`: Logging verbosity for adapter operations (trace|debug|info|warn|error)
   * - `headers`: Default HTTP headers to include in all webhook requests
   *
   * @example
   * ```typescript
   * const global: AdapterGlobalDefaults = {
   *   timeoutMs: 30000,
   *   retryAttempts: 3,
   *   retryDelayMs: 2000,
   *   logLevel: "info",
   *   headers: { "X-Gateway-ID": "gateway-1" }
   * };
   * ```
   */
  AdapterGlobalDefaults,

  /** Inbound webhook definition used to pause SATP execution until external decision. */
  AdapterInboundWebhookConfig,

  /**
   * Root configuration structure for the adapter layer.
   *
   * Loaded from YAML configuration files (e.g., adapter-config.yml) and used to
   * configure webhook-based integrations with external systems.
   *
   * **Structure:**
   * - `adapters`: Flat array of adapter definitions. Each adapter declares its own
   *   execution points, so stage-based organization is implicit through the
   *   `executionPoints` property of each adapter.
   * - `global`: Optional global defaults applied to all adapters unless overridden.
   *
   * @example
   * ```typescript
   * const config: AdapterLayerConfiguration = {
   *   adapters: [
   *     {
   *       id: "monitor",
   *       name: "Stage Monitor",
   *       active: true,
   *       executionPoints: [
   *         { stage: 1, step: "checkTransferProposalRequestMessage", point: "after" }
   *       ],
   *       outboundWebhook: { url: "https://monitor.example.com/satp" }
   *     }
   *   ],
   *   global: { timeoutMs: 30000, retryAttempts: 3 }
   * };
   * ```
   *
   * @see AdapterDefinition - Individual adapter configuration
   * @see AdapterGlobalDefaults - Global default settings
   */
  AdapterLayerConfiguration,

  /** Adapter entry within the configuration. */
  AdapterLayerConfigurationAdaptersInner,
  /** Global configuration section. */
  AdapterLayerConfigurationGlobal,
  /** Outbound webhook definition used to notify external systems. */
  AdapterOutboundWebhookConfig,
  /** Common retry policy applied to webhook invocations. */
  AdapterRetryPolicy,
} from "../generated/gateway-client/typescript-axios";

// Re-export enum constants (these need `export` not `export type`)
export {
  /** Enum for execution point order values. */
  AdapterDefinitionExecutionPointsInnerPointEnum,
  /** Enum for execution point order values. */
  AdapterExecutionPointDefinitionPointEnum,
  /** Enum for log level values. */
  AdapterGlobalDefaultsLogLevelEnum,
  /** Enum for global log level values. */
  AdapterLayerConfigurationGlobalLogLevelEnum,
  /** Execution steps inside a stage where adapters can hook into. */
  AdapterStageExecutionStep,
  /** Supported SATP stage identifiers that can host adapters. */
  SatpStageKey,
} from "../generated/gateway-client/typescript-axios";

// ============================================================================
// Inbound Webhook Types - Re-exported from generated SDK
// Used by external approval controllers to post decisions to the gateway
// ============================================================================

/**
 * Inbound Webhook Decision Contracts - Approval workflow schemas for external controllers
 *
 * **Inbound Webhook Workflow:**
 * 1. SATP gateway reaches a stage/step with configured inbound adapter
 * 2. Gateway pauses execution and waits for external decision POST
 * 3. External controller evaluates business rules, compliance checks, or manual review
 * 4. Controller POSTs decision payload to gateway's inbound endpoint
 * 5. Gateway validates decision, logs justification, and resumes or aborts transfer
 *
 * **Decision Semantics:**
 * - `continue: true`: Approve transfer continuation; gateway proceeds to next stage
 * - `continue: false`: Reject transfer; gateway aborts and may trigger rollback
 * - `reason`: Human-readable justification stored in audit logs
 *
 * **Timeout Handling:**
 * Each inbound webhook declares a `timeoutMs` timeout. If no decision arrives
 * within this window, the gateway treats it as a rejection and aborts the transfer.
 *
 * **Security Considerations:**
 * - Inbound endpoints should use authentication (API keys, mTLS, JWT validation)
 * - Decision payloads must include adapter ID to match the paused session state
 * - All decisions are logged with timestamps for non-repudiation
 */
export {
  InboundWebhookDecisionRequest,
  InboundWebhookDecisionResponse,
} from "../generated/gateway-client/typescript-axios";

// Type alias for backward compatibility
export type { InboundWebhookDecisionRequest as InboundWebhookDecision } from "../generated/gateway-client/typescript-axios";

// ============================================================================
// Outbound Webhook Types - Re-exported from generated SDK
// Standardized payload schemas delivered by the SATP gateway to external systems
// ============================================================================

/**
 * Outbound Webhook Payload Definitions - Event notification contracts for external systems
 *
 * **Outbound Webhook Purpose:**
 * Outbound webhooks are **fire-and-block** operations that wait for external system
 * responses before continuing protocol execution. The gateway invokes outbound webhooks
 * at configured lifecycle events and blocks until a successful response is received.
 *
 * **Event Types:**
 * - `stage.started`: SATP stage has begun execution (outbound hooks at 'before' step)
 * - `stage.completed`: SATP stage finished successfully (outbound hooks at 'after' step)
 * - `stage.failed`: SATP stage encountered an error and may trigger rollback
 * - `adapter.retry`: Adapter webhook is retrying after transient failure
 * - `adapter.skipped`: Adapter was bypassed (inactive or condition not met)
 *
 * **Payload Structure:**
 * All outbound payloads follow a consistent envelope containing:
 * - Event type and schema version for client-side parsing logic
 * - SATP session/context identifiers for correlation across stages
 * - Gateway identity for multi-gateway deployment visibility
 * - ISO 8601 timestamp for precise event ordering
 * - Stage-specific payload with DLT proofs, transaction hashes, or error details
 *
 * **Integration Patterns:**
 * - Monitoring Dashboards: Visualize transfer progress and latency metrics
 * - Audit Systems: Record immutable event logs for compliance and forensics
 * - Alerting Platforms: Trigger notifications on transfer failures or anomalies
 * - Analytics Pipelines: Aggregate events for performance analysis and reporting
 */
export {
  OutboundWebhookEventType,
  OutboundWebhookExecutionPoint,
  OutboundWebhookExecutionPointPointEnum,
  OutboundWebhookPayload,
  OutboundWebhookPayloadEventTypeEnum,
  OutboundWebhookPayloadExecutionPoints,
  OutboundWebhookPayloadExecutionPointsPointEnum,
  OutboundWebhookResponse,
  OutboundWebhookResponseStatusEnum,
} from "../generated/gateway-client/typescript-axios";

// ============================================================================
// Local type definitions - Used internally by AdapterHookService and AdapterManager
// These define local structures not covered by the OpenAPI spec
// ============================================================================

/**
 * Combined webhook configuration used per adapter entry.
 *
 * Supports multiple webhooks of each type, each with their own priority.
 * When an adapter has both outbound and inbound webhooks at the same execution
 * point, outbound webhooks fire first (concurrently), then inbound webhooks
 * serialize for clear approval semantics.
 *
 * **Single vs Array Properties:**
 * For backward compatibility, both singular (`outboundWebhook`) and plural
 * (`outboundWebhooks`) forms are supported. When both are provided, they are
 * merged into a single list for execution.
 *
 * **Execution Order:**
 * 1. All outbound webhooks fire concurrently (priority affects logging order)
 * 2. Inbound webhooks execute sequentially in priority order
 * 3. If any inbound webhook rejects, the transfer is aborted
 *
 * @example
 * ```typescript
 * const webhookConfig: AdapterWebhookConfig = {
 *   // Single outbound for backward compatibility
 *   outboundWebhook: { url: "https://primary.example.com/satp" },
 *   // Additional outbound endpoints
 *   outboundWebhooks: [
 *     { url: "https://backup.example.com/satp", priority: 2 }
 *   ],
 *   // Blocking approval gate
 *   inboundWebhook: { timeoutMs: 300000, priority: 1 }
 * };
 * ```
 *
 * @see AdapterDefinition - Parent adapter configuration
 * @see AdapterOutboundWebhookConfig - Outbound webhook settings
 * @see AdapterInboundWebhookConfig - Inbound approval webhook settings
 */
export interface AdapterWebhookConfig {
  /** Single outbound webhook (for backward compatibility) or array of outbound webhooks. */
  outboundWebhook?: GenOutboundWebhookConfig;
  /** Array of outbound webhooks when multiple notifications are needed. */
  outboundWebhooks?: GenOutboundWebhookConfig[];
  /** Single inbound webhook (for backward compatibility) or array of inbound webhooks. */
  inboundWebhook?: GenInboundWebhookConfig;
  /** Array of inbound webhooks when multiple approvals are needed. */
  inboundWebhooks?: GenInboundWebhookConfig[];
}

// ============================================================================
// Runtime-specific types not in OpenAPI spec
// These are used internally by the AdapterHookService and AdapterManager
// ============================================================================

// Import generated types for use in local interface definitions
import type { AdapterDefinition } from "../generated/gateway-client/typescript-axios";

/**
 * Describes the adapters configured for a particular SATP execution stage.
 */
export interface SatpStageAdapterSet {
  /** Complete adapter catalog for the stage (matches `adapters` block in YAML). */
  adapters: AdapterDefinition[];
  /** Optional step-to-adapter mapping; values reference adapter ids from `adapters`. */
  steps?: Partial<Record<StageExecutionStep, string[]>>;
}

/**
 * Execution steps inside a stage where adapters can hook into.
 * Type alias for backward compatibility - maps to the generated AdapterStageExecutionStep.
 */
export type StageExecutionStep = AdapterStageExecutionStep;

/**
 * Global defaults for adapter execution.
 * Extends retry policy with additional settings for timeout, logging, and headers.
 */
export type GlobalAdapterDefaults = GenRetryPolicy & {
  timeoutMs?: number;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
  headers?: Record<string, string>;
};

/**
 * Flattened execution binding - represents one adapter at one execution point.
 * Used internally by the AdapterHookService for efficient adapter lookup.
 */
export interface AdapterExecutionBinding {
  /** Reference to the adapter */
  adapterId: string;
  /** The full adapter definition */
  adapter: AdapterDefinition;
  /** Execution stage (0-3) */
  stage: number;
  /** Stage-specific step identifier */
  stepTag: string;
  /** Execution order (before/during/after/rollback) */
  stepOrder: StageExecutionStep;
  /** Priority for ordering multiple adapters at same execution point */
  priority: number;
}

/**
 * Full execution plan derived from {@link AdapterLayerConfiguration} and used by the AdapterHookService.
 */
export interface AdapterExecutionPlan {
  /** List of adapter bindings sorted by execution order */
  bindings: AdapterExecutionBinding[];
}

// ============================================================================
// Stage Key Conversion Utilities
// Convert between OpenAPI string enum keys and internal numeric stage values
// ============================================================================

import { SatpStageKey } from "../generated/gateway-client/typescript-axios";

/**
 * Mapping from string stage keys to numeric stage values.
 * Used to convert OpenAPI enum values to internal numeric representation.
 */
const STAGE_KEY_TO_NUMBER: Record<SatpStageKey, number | undefined> = {
  [SatpStageKey.Stage0]: 0,
  [SatpStageKey.Stage1]: 1,
  [SatpStageKey.Stage2]: 2,
  [SatpStageKey.Stage3]: 3,
  [SatpStageKey.Crash]: undefined, // Crash is not a numeric stage
};

/**
 * Mapping from numeric stage values to string stage keys.
 * Used to convert internal numeric representation to OpenAPI enum values.
 */
const NUMBER_TO_STAGE_KEY: Record<number, SatpStageKey> = {
  0: SatpStageKey.Stage0,
  1: SatpStageKey.Stage1,
  2: SatpStageKey.Stage2,
  3: SatpStageKey.Stage3,
};

/**
 * Converts a string stage key (from OpenAPI spec) to a numeric stage value.
 * Returns `undefined` for the 'crash' stage key as it doesn't map to a numeric stage.
 *
 * @param stageKey - The string stage key (e.g., "stage0", "stage1", "crash")
 * @returns The numeric stage value (0-3) or undefined for crash
 *
 * @example
 * ```typescript
 * stageKeyToNumber("stage1"); // Returns 1
 * stageKeyToNumber("crash"); // Returns undefined
 * ```
 */
export function stageKeyToNumber(stageKey: SatpStageKey): number | undefined {
  return STAGE_KEY_TO_NUMBER[stageKey];
}

/**
 * Converts a numeric stage value to a string stage key (for OpenAPI spec).
 *
 * @param stage - The numeric stage value (0-3)
 * @returns The string stage key (e.g., "stage0", "stage1")
 * @throws Error if stage is not a valid numeric stage (0-3)
 *
 * @example
 * ```typescript
 * numberToStageKey(1); // Returns "stage1"
 * numberToStageKey(5); // Throws Error
 * ```
 */
export function numberToStageKey(stage: number): SatpStageKey {
  const key = NUMBER_TO_STAGE_KEY[stage];
  if (!key) {
    throw new Error(
      `Invalid numeric stage: ${stage}. Valid stages are 0, 1, 2, 3.`,
    );
  }
  return key;
}

/**
 * Checks if a string stage key represents a valid numeric SATP stage (0-3, not crash).
 * Validates both that the key is a valid SatpStageKey enum value and that it maps
 * to a numeric stage within the valid range.
 *
 * @param stageKey - The string stage key to validate
 * @returns `true` if the stage key maps to a numeric stage (0-3)
 *
 * @example
 * ```typescript
 * isValidStageKey("stage1"); // Returns true
 * isValidStageKey("stage0"); // Returns true
 * isValidStageKey("crash"); // Returns false
 * isValidStageKey("invalid"); // Returns false
 * ```
 */
export function isValidStageKey(stageKey: SatpStageKey): boolean {
  const numericStage = STAGE_KEY_TO_NUMBER[stageKey];
  return numericStage !== undefined && numericStage >= 0 && numericStage <= 3;
}
