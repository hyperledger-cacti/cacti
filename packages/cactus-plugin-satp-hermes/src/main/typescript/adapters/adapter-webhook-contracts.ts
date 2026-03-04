/**
 * Adapter Webhook Contracts - Canonical I/O schemas for adapter hook execution
 *
 * @fileoverview
 * Defines the standardized input/output contracts used by the {@link AdapterHookService}
 * when executing adapter webhooks. These interfaces establish the data exchange
 * protocol between the SATP gateway core and external adapter implementations,
 * ensuring consistent telemetry, error reporting, and control flow semantics.
 *
 * @description
 * **Webhook Execution Model:**
 * Each adapter hook invocation receives a structured input containing SATP session
 * context, stage metadata, and optional payload data. The adapter processes this
 * information and returns an output specifying the disposition (CONTINUE/PAUSE/SKIP/FAIL)
 * along with optional telemetry and diagnostic messages.
 *
 * **Disposition Semantics:**
 * - `CONTINUE`: Adapter completed successfully; proceed with next adapter or stage
 * - `PAUSE`: Adapter requests SATP execution halt until external decision arrives
 *           (inbound webhooks only; outbound webhooks cannot pause execution)
 * - `SKIP`: Adapter was not applicable or chose not to execute (logged but not an error)
 * - `FAIL`: Adapter encountered an error; SATP transfer should be aborted or rolled back
 *
 * **Input Specialization:**
 * Different execution steps receive specialized input contracts:
 * - `PreStageWebhookInput`: Before-stage hooks receive planned changes and stage snapshot
 * - `DuringStageWebhookInput`: During-stage hooks receive protocol messages and execution context
 * - `PostStageWebhookInput`: After-stage hooks receive stage results and settlement proofs
 *
 * **Metrics Collection:**
 * All webhook executions record telemetry including latency, retry attempts, and
 * optional adapter-specific metrics. This data flows into the gateway's monitoring
 * subsystem for observability and SLA tracking.
 *
 * @example
 * Adapter webhook response indicating successful compliance check:
 * ```typescript
 * const output: AdapterWebhookOutputBase = {
 *   disposition: "CONTINUE",
 *   message: "AML check passed for session abc-123",
 *   telemetry: {
 *     checkDurationMs: 450,
 *     riskScore: 0.12,
 *     rulesEvaluated: 15
 *   }
 * };
 * ```
 *
 * @example
 * Adapter requesting manual approval (pause):
 * ```typescript
 * const output: AdapterWebhookOutputBase = {
 *   disposition: "PAUSE",
 *   message: "High-value transfer requires manager approval",
 *   telemetry: {
 *     transferAmountUsd: 250000,
 *     approverNotified: true
 *   }
 * };
 * ```
 *
 * @see {@link AdapterHookService} for webhook invocation orchestration
 * @see {@link AdapterHookResult} for aggregated multi-adapter execution results
 * @see {@link OutboundWebhookPayload} for outbound event payload schema
 *
 * @module adapter-webhook-contracts
 * @since 0.0.3-beta
 */

import type {
  AdapterDefinition,
  SatpStageKey,
  StageExecutionStep,
} from "./adapter-config";

/**
 * Enumerates the possible outcomes returned by an adapter webhook execution.
 *
 * @description
 * Defines the control flow directives that adapters can return to influence
 * SATP protocol execution. The gateway interprets these dispositions and
 * adjusts transfer state accordingly.
 *
 * **Disposition Behavior:**
 * - `CONTINUE`: Normal success path; SATP proceeds to next adapter or stage
 * - `PAUSE`: Request execution halt (inbound only); gateway awaits external decision
 * - `SKIP`: Adapter chose not to execute; not an error, just informational
 * - `FAIL`: Critical error; gateway should abort or rollback the transfer
 *
 * @since 0.0.3-beta
 */
export type AdapterWebhookDisposition = "CONTINUE" | "PAUSE" | "SKIP" | "FAIL";

/**
 * Generic telemetry envelope emitted after each webhook run.
 */
export interface AdapterWebhookMetrics {
  latencyMs?: number;
  retriesAttempted?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Shared input contract propagated to all webhook implementations.
 */
export interface AdapterWebhookInputBase {
  stage: SatpStageKey;
  stageEnum?: SatpStageKey;
  step: StageExecutionStep;
  adapterId: string;
  sessionId: string;
  contextId?: string;
  attempt: number;
  invokedAt: string;
  gatewayId: string;
  adapter?: AdapterDefinition;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Input contract specific to the "before stage" hook.
 */
export interface PreStageWebhookInput extends AdapterWebhookInputBase {
  stageSnapshot?: Record<string, unknown>;
  plannedChanges?: Record<string, unknown>;
}

/**
 * Input contract specific to the "during stage" hook.
 */
export interface DuringStageWebhookInput extends AdapterWebhookInputBase {
  protocolMessage?: Record<string, unknown>;
  executionContext?: Record<string, unknown>;
}

/**
 * Input contract specific to the "after stage" hook.
 */
export interface PostStageWebhookInput extends AdapterWebhookInputBase {
  stageResult?: Record<string, unknown>;
  settlementProof?: Record<string, unknown>;
}

/**
 * Base output schema returned by every webhook.
 */
export interface AdapterWebhookOutputBase {
  disposition: AdapterWebhookDisposition;
  message?: string;
  telemetry?: Record<string, unknown>;
  mutations?: Record<string, unknown>;
}

/** Output schema emitted by pre-stage webhooks. */
export interface PreStageWebhookOutput extends AdapterWebhookOutputBase {
  updatedStageSnapshot?: Record<string, unknown>;
}

/** Output schema emitted by during-stage webhooks. */
export interface DuringStageWebhookOutput extends AdapterWebhookOutputBase {
  outboundPayload?: Record<string, unknown>;
}

/** Output schema emitted by post-stage webhooks. */
export interface PostStageWebhookOutput extends AdapterWebhookOutputBase {
  auditTrail?: Record<string, unknown>;
}

/** Result envelope standardised for all webhooks. */
export interface AdapterWebhookResult<
  TOutput extends AdapterWebhookOutputBase,
> {
  output: TOutput;
  metrics?: AdapterWebhookMetrics;
}

/** Retry semantics communicated back to hook orchestrators. */
export interface AdapterWebhookRetryDirective {
  maxAttempts?: number;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  backoffCoefficient?: number;
  nextAttemptDelayMs?: number;
}

/** Optional fields when constructing an {@link AdapterWebhookError}. */
export interface AdapterWebhookErrorOptions {
  retryable?: boolean;
  retryDirective?: AdapterWebhookRetryDirective;
  details?: Record<string, unknown>;
}

/**
 * Canonical error type thrown by adapter webhooks.
 */
export class AdapterWebhookError extends Error {
  public readonly retryable: boolean;
  public readonly retryDirective?: AdapterWebhookRetryDirective;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, options: AdapterWebhookErrorOptions = {}) {
    super(message);
    this.retryable = options.retryable ?? true;
    this.retryDirective = options.retryDirective;
    this.details = options.details;
    this.name = "AdapterWebhookError";
  }
}

/**
 * Generic abstract adapter webhook. Concrete classes must implement
 * {@link execute} and may call {@link fail} for typed errors.
 */
export abstract class AdapterWebhook<
  TInput extends AdapterWebhookInputBase,
  TOutput extends AdapterWebhookOutputBase,
> {
  public abstract execute(
    input: TInput,
  ): Promise<AdapterWebhookResult<TOutput>>;

  protected fail(message: string, options?: AdapterWebhookErrorOptions): never {
    throw new AdapterWebhookError(message, options);
  }
}

/**
 * Abstract hook executed before a SATP stage handler mutates protocol state.
 */
export abstract class PreStageWebhook extends AdapterWebhook<
  PreStageWebhookInput,
  PreStageWebhookOutput
> {}

/**
 * Abstract hook executed while a SATP stage handler processes its core logic.
 */
export abstract class DuringStageWebhook extends AdapterWebhook<
  DuringStageWebhookInput,
  DuringStageWebhookOutput
> {}

/**
 * Abstract hook executed after a SATP stage handler completes and emits results.
 */
export abstract class PostStageWebhook extends AdapterWebhook<
  PostStageWebhookInput,
  PostStageWebhookOutput
> {}
