/**
 * Adapter Hook Type Definitions - Runtime execution context and result structures
 *
 * @fileoverview
 * Defines the internal type system used by {@link AdapterHookService} during webhook
 * execution. These types capture the runtime context passed to adapters, track execution
 * results per adapter binding, and aggregate outcomes across multi-adapter invocations.
 *
 * @description
 * **Type Hierarchy:**
 * - `AdapterInvocationContext`: Complete runtime context for single adapter execution
 * - `AdapterHookStepResult`: Outcome from invoking one adapter (success/fail/skip/pause)
 * - `AdapterHookResult`: Aggregated results from all adapters at a stage/step
 * - `OutboundWebhookInvocationResult`: HTTP-level details from outbound webhook call
 *
 * **Context Propagation:**
 * The invocation context flows from stage handlers → AdapterHookService → Individual
 * Adapter, carrying SATP session identifiers, stage metadata, and optional payload data.
 * Each adapter receives immutable context ensuring consistent visibility across the
 * execution pipeline.
 *
 * **Result Aggregation:**
 * The service collects per-adapter results (disposition, metrics, errors) and combines
 * them into a single {@link AdapterHookResult}. Stage handlers examine dispositions to
 * determine whether to continue SATP execution, await approval, or abort the transfer.
 *
 * @see {@link AdapterHookService} for execution orchestration
 * @see {@link AdapterWebhookDisposition} for disposition semantics
 * @see {@link AdapterWebhookMetrics} for telemetry structure
 *
 * @module adapter-runtime-types
 * @since 0.0.3-beta
 */

import type { Stage } from "../types/satp-protocol";
import type {
  AdapterDefinition,
  AdapterExecutionBinding,
  AdapterExecutionPlan,
  OutboundWebhookPayload,
  InboundWebhookDecisionRequest,
} from "./adapter-config";
import type {
  AdapterWebhookDisposition,
  AdapterWebhookMetrics,
} from "./adapter-webhook-contracts";

export type AdapterHookDirection = "outbound" | "inbound";

/**
 * Context shared when executing a single adapter binding.
 */
export interface AdapterInvocationContext {
  binding: AdapterExecutionBinding;
  adapter: AdapterDefinition;
  stage: Stage;
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  attempt: number;
  direction: AdapterHookDirection;
  metadata?: Record<string, unknown>;
  payload?: OutboundWebhookPayload["payload"];
}

export interface OutboundWebhookInvocationResult {
  status: "OK" | "FAILED";
  httpStatus?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  retriesAttempted: number;
  completedAt: string;
  latencyMs: number;
  errorMessage?: string;
}

export interface AdapterHookStepResult {
  binding: AdapterExecutionBinding;
  disposition: AdapterWebhookDisposition;
  message?: string;
  metrics?: AdapterWebhookMetrics;
  blockingDecision?: InboundWebhookDecisionRequest;
  outboundResult?: OutboundWebhookInvocationResult;
}

export interface AdapterHookResult {
  stage: Stage;
  sessionId: string;
  steps: AdapterHookStepResult[];
  completedAt: string;
}

export interface AdapterHookExecutionParams {
  stage: Stage;
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  direction: AdapterHookDirection;
  plan: AdapterExecutionPlan;
  bindings?: AdapterExecutionBinding[];
  adapterCatalog?: Record<string, AdapterDefinition>;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  deadlineEpochMs?: number;
}
