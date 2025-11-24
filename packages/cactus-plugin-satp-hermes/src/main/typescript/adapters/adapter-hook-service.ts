/**
 * Adapter Hook Service - Low-level webhook execution engine
 *
 * @fileoverview
 * Core execution engine responsible for invoking adapter webhooks. This service
 * handles only the HTTP execution aspects: outbound notifications and inbound
 * approval workflows with retry logic, timeout enforcement, and telemetry.
 *
 * @description
 * **Service Responsibilities:**
 * - Execute outbound webhooks with HTTP client (fetch API)
 * - Manage inbound webhook lifecycle (pause, await decision, resume/abort)
 * - Apply retry policies with exponential backoff for transient failures
 * - Enforce timeouts and deadlines to prevent hung transfers
 * - Collect execution metrics (latency, attempts, disposition) for observability
 *
 * **Usage Pattern:**
 * This service is used internally by {@link AdapterManager}. The manager determines
 * WHAT adapters to execute and WHEN, then calls this service to actually execute them.
 *
 * @see {@link AdapterManager} for adapter management and execution orchestration
 * @see {@link AdapterHookResult} for aggregated execution results
 * @see {@link OutboundWebhookPayload} for outbound event schema
 *
 * @module adapter-hook-service
 * @since 0.0.3-beta
 */

import { Stage } from "../types/satp-protocol";
import type {
  AdapterDefinition,
  AdapterExecutionBinding,
  GlobalAdapterDefaults,
  AdapterOutboundWebhookConfig,
  AdapterInboundWebhookConfig,
  OutboundWebhookPayload,
  InboundWebhookDecisionRequest,
  StageExecutionStep,
} from "./adapter-config";
import type {
  AdapterHookResult,
  AdapterHookStepResult,
  AdapterInvocationContext,
  OutboundWebhookInvocationResult,
} from "./adapter-runtime-types";
import type { SATPLogger as Logger } from "../core/satp-logger";
import type { AdapterWebhookMetrics } from "./adapter-webhook-contracts";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_INBOUND_TIMEOUT_MS = 300_000; // 5 minutes default for inbound webhooks

/**
 * Represents a pending inbound webhook decision awaiting external callback.
 */
interface PendingInboundDecision {
  /** Adapter ID that initiated the pause */
  adapterId: string;
  /** Session ID for the paused transfer */
  sessionId: string;
  /** Optional context ID */
  contextId?: string;
  /** Timestamp when the wait started */
  startedAt: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Resolve function to resume execution */
  resolve: (decision: InboundWebhookDecisionRequest) => void;
  /** Reject function to abort on timeout or error */
  reject: (error: Error) => void;
}

/**
 * Input for executing webhooks for a set of adapter bindings.
 */
export interface AdapterWebhookExecutionInput {
  bindings: AdapterExecutionBinding[];
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Input for session-aware adapter execution with deadline support.
 */
export interface SessionAwareExecutionInput {
  bindings: AdapterExecutionBinding[];
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  stage: number;
  stepTag: string;
  stepOrder: StageExecutionStep;
  deadlineMs?: number;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Input for processing an inbound webhook decision from external approval controllers.
 * Uses `shouldContinue` instead of `continue` since `continue` is a reserved keyword.
 */
export interface ProcessInboundDecisionInput {
  /** Adapter identifier that originally paused the SATP stage */
  adapterId: string;
  /** Session identifier for the paused SATP transfer */
  sessionId: string;
  /** Optional transfer context identifier */
  contextId?: string;
  /** When true, gateway resumes; when false, transfer is rejected */
  shouldContinue: boolean;
  /** Human-readable justification for auditing */
  reason?: string;
  /** Optional data payload from external system */
  data?: Record<string, unknown>;
}

/**
 * Configuration options for AdapterHookService.
 */
export interface AdapterHookServiceOptions {
  logger: Logger;
  globalConfig?: GlobalAdapterDefaults;
  fetchImpl?: typeof fetch;
}

/**
 * Low-level webhook execution service.
 *
 * @description
 * This service is responsible solely for executing HTTP webhook calls.
 * It does not determine when or which adapters to execute - that responsibility
 * belongs to {@link AdapterManager}.
 */
export class AdapterHookService {
  private readonly fetchFn: typeof fetch;
  private readonly logger: Logger;
  private readonly globalConfig?: GlobalAdapterDefaults;

  /**
   * Registry of SATP sessions blocked awaiting external approval decisions, for inbound webhooks.
   * Each entry stores resolve/reject callbacks that unblock runInboundWebhook()
   * when processInboundDecision() receives a continue/reject from external controller.
   * Key: `${sessionId}:${adapterId}` → unique per session-adapter combination, with which the match between client call and awaiting hook happens.
   */
  private readonly pendingInboundDecisions: Map<
    string,
    PendingInboundDecision
  > = new Map();

  constructor(options: AdapterHookServiceOptions) {
    const fetchImpl =
      options.fetchImpl ?? (globalThis.fetch as typeof fetch | undefined);
    if (!fetchImpl) {
      throw new Error(
        "AdapterHookService requires a fetch implementation; provide fetchImpl when running on Node < 18",
      );
    }
    this.fetchFn = fetchImpl;
    this.logger = options.logger;
    this.globalConfig = options.globalConfig;
  }

  /**
   * Executes webhooks for all provided adapter bindings.
   * Handles both outbound (fire-and-block) and inbound (blocking) webhooks.
   * Outbound webhooks block until a response is received or throw an error on timeout/failure.
   *
   * @param input - Execution input with bindings and context data.
   * @returns Aggregated result from all adapter executions, or undefined if no adapters executed.
   * @throws AdapterOutboundWebhookError if any outbound webhook fails or times out.
   */
  public async executeWebhooks(
    input: AdapterWebhookExecutionInput,
  ): Promise<AdapterHookResult | undefined> {
    const { bindings, sessionId, contextId, gatewayId, metadata, payload } =
      input;

    if (bindings.length === 0) {
      return undefined;
    }

    const steps: AdapterHookStepResult[] = [];

    for (const binding of bindings) {
      const adapter = binding.adapter;
      if (!adapter.active) {
        continue;
      }

      const context: AdapterInvocationContext = {
        binding,
        adapter,
        stage: this.numberToStage(binding.stage),
        sessionId,
        contextId,
        gatewayId,
        attempt: 1,
        direction: "outbound",
        metadata,
        payload,
      };

      // Collect all outbound webhooks (single or array) and sort by priority
      const outboundWebhooks = this.collectOutboundWebhooks(adapter);
      // Collect all inbound webhooks (single or array) and sort by priority
      const inboundWebhooks = this.collectInboundWebhooks(adapter);

      // Outbound: fire-and-block notifications to external systems (monitoring, audit)
      for (const outboundWebhook of outboundWebhooks) {
        const result = await this.runOutboundWebhook(context, outboundWebhook);
        if (result) {
          steps.push(result);
        }
      }

      // Inbound: blocks execution until external controller approves/rejects transfer
      for (const inboundWebhook of inboundWebhooks) {
        const result = await this.runInboundWebhook(context, inboundWebhook);
        if (result) {
          steps.push(result);
        }
      }

      // Adapter definition exists but has no webhook endpoints - record skip for audit
      if (outboundWebhooks.length === 0 && inboundWebhooks.length === 0) {
        const result = this.buildSkipResult(
          context,
          "Adapter has no webhook configuration",
        );
        steps.push(result);
      }
    }

    if (steps.length === 0) {
      this.logger.debug(
        `AdapterHookService: no executable adapters in provided bindings`,
      );
      return undefined;
    }

    return {
      stage: this.numberToStage(bindings[0]?.stage ?? 0),
      sessionId,
      steps,
      completedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // INBOUND WEBHOOK DECISION PROCESSING
  // Handles external approval controller decisions for paused sessions
  // ============================================================================

  /**
   * Process an inbound webhook decision from an external approval controller.
   *
   * This method is called when an external system posts a decision to approve
   * or reject a paused SATP transfer. It resolves the pending promise to resume
   * or abort the waiting transfer.
   *
   * @param input - Decision input containing adapterId, sessionId, and continue flag
   * @returns true if the decision was accepted and processed, false otherwise
   */
  public async processInboundDecision(
    input: ProcessInboundDecisionInput,
  ): Promise<boolean> {
    const fnTag = "AdapterHookService#processInboundDecision()";

    this.logger.info(
      `${fnTag} Processing inbound decision: adapter="${input.adapterId}" ` +
        `session="${input.sessionId}" continue=${input.shouldContinue} ` +
        `reason="${input.reason || "N/A"}"`,
    );

    // Build the lookup key
    const pendingKey = this.buildPendingKey(input.sessionId, input.adapterId);
    const pending = this.pendingInboundDecisions.get(pendingKey);

    if (!pending) {
      this.logger.warn(
        `${fnTag} No pending inbound decision found for key="${pendingKey}". ` +
          `Either the session timed out, was already processed, or never existed.`,
      );
      return false;
    }

    // Log the decision for audit trail
    const decisionType = input.shouldContinue ? "APPROVED" : "REJECTED";
    const elapsedMs = Date.now() - pending.startedAt;
    this.logger.info(
      `${fnTag} Inbound webhook decision ${decisionType} for session="${input.sessionId}" ` +
        `by adapter="${input.adapterId}" after ${elapsedMs}ms: ${input.reason || "No reason provided"}`,
    );

    this.pendingInboundDecisions.delete(pendingKey);

    const decisionRequest: InboundWebhookDecisionRequest = {
      adapterId: input.adapterId,
      sessionId: input.sessionId,
      contextId: input.contextId,
      continue: input.shouldContinue,
      reason: input.reason,
      data: input.data,
    };

    // Resolves the deferred promise in runInboundWebhook(), winning the Promise.race
    // against timeout and unblocking SATP execution to continue or abort
    pending.resolve(decisionRequest);

    return true;
  }

  /**
   * Constructs lookup key for pendingInboundDecisions registry.
   * Composite key ensures multiple adapters can pause the same session independently.
   */
  private buildPendingKey(sessionId: string, adapterId: string): string {
    return `${sessionId}:${adapterId}`;
  }

  /**
   * Get the count of pending inbound decisions (for monitoring/testing).
   */
  public getPendingInboundDecisionCount(): number {
    return this.pendingInboundDecisions.size;
  }

  /**
   * Check if a session/adapter combination is waiting for an inbound decision.
   */
  public hasPendingInboundDecision(
    sessionId: string,
    adapterId: string,
  ): boolean {
    return this.pendingInboundDecisions.has(
      this.buildPendingKey(sessionId, adapterId),
    );
  }

  /**
   * Merges legacy single-webhook and multi-webhook config into priority-ordered list.
   * Supports both `outboundWebhook` (v1 schema) and `outboundWebhooks[]` (v2 schema).
   */
  private collectOutboundWebhooks(
    adapter: AdapterDefinition,
  ): AdapterOutboundWebhookConfig[] {
    const webhooks: AdapterOutboundWebhookConfig[] = [];

    if (adapter.outboundWebhook) {
      webhooks.push(adapter.outboundWebhook);
    }

    if (adapter.outboundWebhooks && Array.isArray(adapter.outboundWebhooks)) {
      webhooks.push(...adapter.outboundWebhooks);
    }

    return webhooks.sort((a, b) => (a.priority ?? 1000) - (b.priority ?? 1000));
  }

  /**
   * Merges legacy single-webhook and multi-webhook config into priority-ordered list.
   * Supports both `inboundWebhook` (v1 schema) and `inboundWebhooks[]` (v2 schema).
   */
  private collectInboundWebhooks(
    adapter: AdapterDefinition,
  ): AdapterInboundWebhookConfig[] {
    const webhooks: AdapterInboundWebhookConfig[] = [];

    if (adapter.inboundWebhook) {
      webhooks.push(adapter.inboundWebhook);
    }

    if (adapter.inboundWebhooks && Array.isArray(adapter.inboundWebhooks)) {
      webhooks.push(...adapter.inboundWebhooks);
    }

    return webhooks.sort((a, b) => (a.priority ?? 1000) - (b.priority ?? 1000));
  }

  /**
   * Executes a single outbound webhook and returns the result.
   * Outbound webhooks are BLOCKING - execution waits for a response.
   * On success: logs the response and continues.
   * On timeout/failure: aborts the SATP process by throwing an error.
   *
   * @throws AdapterOutboundWebhookError if the webhook fails or times out after all retries.
   */
  private async runOutboundWebhook(
    context: AdapterInvocationContext,
    webhookConfig: AdapterOutboundWebhookConfig,
  ): Promise<AdapterHookStepResult> {
    const payload = this.buildOutboundPayload(context);
    const invocationResult = await this.invokeOutboundWebhook(
      webhookConfig,
      payload,
    );

    if (invocationResult.status === "FAILED") {
      const errorMessage =
        invocationResult.errorMessage || "Adapter webhook failed";
      this.logger.error(
        `AdapterHookService: Outbound webhook FAILED for adapter "${context.adapter.id}" ` +
          `at ${context.binding.stepTag}/${context.binding.stepOrder}. ` +
          `URL: ${webhookConfig.url}, Retries: ${invocationResult.retriesAttempted}, ` +
          `Error: ${errorMessage}. Aborting SATP process.`,
      );
      // Abort the SATP process - outbound webhook failure is fatal
      throw new AdapterOutboundWebhookError(
        `Outbound webhook failed for adapter "${context.adapter.id}": ${errorMessage}`,
        context.adapter.id,
        webhookConfig.url,
        invocationResult,
      );
    }

    // Log successful response
    this.logger.info(
      `AdapterHookService: Outbound webhook SUCCESS for adapter "${context.adapter.id}" ` +
        `at ${context.binding.stepTag}/${context.binding.stepOrder}. ` +
        `URL: ${webhookConfig.url}, HTTP ${invocationResult.httpStatus}, ` +
        `Latency: ${invocationResult.latencyMs}ms, Retries: ${invocationResult.retriesAttempted}`,
    );
    this.logger.debug(
      `AdapterHookService: Outbound webhook response body for adapter "${context.adapter.id}": ` +
        `${JSON.stringify(invocationResult.responseBody)}`,
    );

    const metrics: AdapterWebhookMetrics = {
      latencyMs: invocationResult.latencyMs,
      retriesAttempted: invocationResult.retriesAttempted,
    };

    return {
      binding: context.binding,
      disposition: "CONTINUE",
      metrics,
      outboundResult: invocationResult,
    };
  }

  /**
   * Executes a single inbound webhook and returns the result.
   * Inbound webhooks are BLOCKING - execution pauses until an external controller
   * posts a decision via processInboundDecision(), or until timeout.
   *
   * @param context - The adapter invocation context
   * @param webhookConfig - The inbound webhook configuration
   * @returns AdapterHookStepResult with disposition CONTINUE (approved), FAIL (rejected/timeout)
   * @throws AdapterInboundWebhookTimeoutError if no decision arrives within timeoutMs
   * @throws AdapterInboundWebhookRejectedError if external controller rejects the transfer
   */
  private async runInboundWebhook(
    context: AdapterInvocationContext,
    webhookConfig: AdapterInboundWebhookConfig,
  ): Promise<AdapterHookStepResult> {
    const fnTag = "AdapterHookService#runInboundWebhook()";
    const adapterId = context.adapter.id;
    const sessionId = context.sessionId;
    const timeoutMs =
      webhookConfig.timeoutMs ??
      this.globalConfig?.timeoutMs ??
      DEFAULT_INBOUND_TIMEOUT_MS;
    const pendingKey = this.buildPendingKey(sessionId, adapterId);

    this.logger.info(
      `${fnTag} PAUSING execution for inbound webhook: adapter="${adapterId}" ` +
        `session="${sessionId}" at ${context.binding.stepTag}/${context.binding.stepOrder}. ` +
        `Waiting up to ${timeoutMs}ms for external decision at POST /api/v1/adapters/inbound/${sessionId}/${adapterId}`,
    );

    const startedAt = Date.now();

    try {
      // Deferred promise pattern: stores resolve/reject in registry for later invocation
      // by processInboundDecision() when external controller POSTs approval/rejection
      const decisionPromise = new Promise<InboundWebhookDecisionRequest>(
        (resolve, reject) => {
          const pending: PendingInboundDecision = {
            adapterId,
            sessionId,
            contextId: context.contextId,
            startedAt,
            timeoutMs,
            resolve,
            reject,
          };
          this.pendingInboundDecisions.set(pendingKey, pending);
        },
      );

      // Timeout guard: rejects if external controller doesn't respond in time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (this.pendingInboundDecisions.has(pendingKey)) {
            this.pendingInboundDecisions.delete(pendingKey);
            reject(
              new AdapterInboundWebhookTimeoutError(
                `Inbound webhook timed out after ${timeoutMs}ms for adapter "${adapterId}" session="${sessionId}"`,
                adapterId,
                sessionId,
                timeoutMs,
              ),
            );
          }
        }, timeoutMs);
      });

      // Blocks until: (1) external controller POSTs continue/reject, or (2) timeout expires
      const decision = await Promise.race([decisionPromise, timeoutPromise]);

      const elapsedMs = Date.now() - startedAt;

      // External controller rejected: abort SATP transfer with reason for audit
      if (!decision.continue) {
        this.logger.warn(
          `${fnTag} Inbound webhook REJECTED for adapter="${adapterId}" ` +
            `session="${sessionId}" after ${elapsedMs}ms. Reason: ${decision.reason || "No reason provided"}. ` +
            `Aborting SATP process.`,
        );
        throw new AdapterInboundWebhookRejectedError(
          `Inbound webhook rejected by external controller for adapter "${adapterId}": ${decision.reason || "No reason provided"}`,
          adapterId,
          sessionId,
          decision.reason,
        );
      }

      // External controller approved: unblock and resume SATP stage execution
      this.logger.info(
        `${fnTag} Inbound webhook APPROVED for adapter="${adapterId}" ` +
          `session="${sessionId}" after ${elapsedMs}ms. Reason: ${decision.reason || "No reason provided"}. ` +
          `Resuming SATP execution.`,
      );

      const metrics: AdapterWebhookMetrics = {
        latencyMs: elapsedMs,
        retriesAttempted: 0,
      };

      return {
        binding: context.binding,
        disposition: "CONTINUE",
        message: `Inbound webhook approved: ${decision.reason || "Approved by external controller"}`,
        metrics,
        blockingDecision: decision,
      };
    } catch (error) {
      this.pendingInboundDecisions.delete(pendingKey);

      // Propagate known error types unchanged for caller handling
      if (
        error instanceof AdapterInboundWebhookTimeoutError ||
        error instanceof AdapterInboundWebhookRejectedError
      ) {
        throw error;
      }

      this.logger.error(
        `${fnTag} Unexpected error in inbound webhook for adapter="${adapterId}" ` +
          `session="${sessionId}": ${error}`,
      );
      throw error;
    }
  }

  // Legacy methods for backward compatibility (deprecated)
  private async runOutboundAdapter(
    context: AdapterInvocationContext,
    adapter: AdapterDefinition,
  ): Promise<AdapterHookStepResult> {
    if (!adapter.outboundWebhook) {
      return this.buildSkipResult(
        context,
        "Adapter has no outbound webhook configuration",
      );
    }
    return this.runOutboundWebhook(context, adapter.outboundWebhook);
  }

  private async runInboundAdapter(
    context: AdapterInvocationContext,
    adapter: AdapterDefinition,
  ): Promise<AdapterHookStepResult> {
    if (!adapter.inboundWebhook) {
      return this.buildSkipResult(
        context,
        "Adapter has no inbound webhook configuration",
      );
    }
    return this.runInboundWebhook(context, adapter.inboundWebhook);
  }

  private buildOutboundPayload(
    context: AdapterInvocationContext,
  ): OutboundWebhookPayload {
    return {
      eventType:
        context.direction === "outbound" ? "stage.started" : "stage.completed",
      schemaVersion: "v1",
      executionPoints: {
        name: `${context.binding.stepTag}-${context.binding.stepOrder}`,
        stage: context.binding.stage,
        step: context.binding.stepTag,
        point: context.binding.stepOrder,
      },
      adapterId: context.adapter.id,
      sessionId: context.sessionId,
      contextId: context.contextId,
      gatewayId: context.gatewayId,
      payload: context.payload,
      timestamp: new Date().toISOString(),
      message: undefined,
    };
  }

  private buildSkipResult(
    context: AdapterInvocationContext,
    message: string,
  ): AdapterHookStepResult {
    return {
      binding: context.binding,
      disposition: "SKIP",
      message,
    };
  }

  private buildFailureResult(
    context: AdapterInvocationContext,
    message: string,
    outboundResult?: OutboundWebhookInvocationResult,
  ): AdapterHookStepResult {
    return {
      binding: context.binding,
      disposition: "FAIL",
      message,
      outboundResult,
      metrics: outboundResult
        ? {
            latencyMs: outboundResult.latencyMs,
            retriesAttempted: outboundResult.retriesAttempted,
          }
        : undefined,
    };
  }

  private async invokeOutboundWebhook(
    config: AdapterOutboundWebhookConfig,
    payload: OutboundWebhookPayload,
  ): Promise<OutboundWebhookInvocationResult> {
    const method = "POST";
    const headers = { "content-type": "application/json" };
    const timeoutMs = config.timeoutMs ?? this.getGlobalTimeout();
    const maxAttempts = config.retryAttempts ?? this.getGlobalRetryAttempts();
    const retryDelayMs = config.retryDelayMs ?? this.getGlobalRetryDelay();
    let attempt = 0;
    let lastLatency = 0;

    while (attempt < maxAttempts) {
      const startedAt = Date.now();
      try {
        const response = await this.fetchWithTimeout(
          config.url,
          {
            method,
            headers,
            body: JSON.stringify(payload),
          },
          timeoutMs,
        );
        const rawBody = await response.text();
        const parsedBody = this.safeParse(rawBody);
        lastLatency = Date.now() - startedAt;
        if (!response.ok) {
          throw new Error(
            `Adapter webhook responded with HTTP ${response.status}`,
          );
        }
        return {
          status: "OK",
          httpStatus: response.status,
          responseBody: parsedBody,
          responseHeaders: this.toHeaderObject(response.headers),
          retriesAttempted: attempt,
          completedAt: new Date().toISOString(),
          latencyMs: lastLatency,
        };
      } catch (error) {
        lastLatency = Date.now() - startedAt;
        attempt++;
        if (attempt >= maxAttempts) {
          return {
            status: "FAILED",
            retriesAttempted: attempt - 1,
            completedAt: new Date().toISOString(),
            latencyMs: lastLatency,
            errorMessage: this.stringifyError(error),
          };
        }
        await this.delay(retryDelayMs);
      }
    }

    return {
      status: "FAILED",
      retriesAttempted: maxAttempts,
      completedAt: new Date().toISOString(),
      latencyMs: lastLatency,
      errorMessage: "Adapter webhook failed without response",
    };
  }

  private numberToStage(stageNumber: number): Stage {
    const stageMap: Record<number, Stage> = {
      0: Stage.STAGE0,
      1: Stage.STAGE1,
      2: Stage.STAGE2,
      3: Stage.STAGE3,
    };
    return stageMap[stageNumber] ?? Stage.STAGE0;
  }

  private getGlobalTimeout(): number {
    return this.globalConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private getGlobalRetryAttempts(): number {
    return this.globalConfig?.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
  }

  private getGlobalRetryDelay(): number {
    return this.globalConfig?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetchFn(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async delay(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 0)));
  }

  private safeParse(body: string): unknown {
    if (!body) {
      return undefined;
    }
    try {
      return JSON.parse(body);
    } catch (error) {
      this.logger.debug(
        `AdapterHookService: unable to parse webhook response body: ${this.stringifyError(error)}`,
      );
      return body;
    }
  }

  private toHeaderObject(headers: globalThis.Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => (result[key] = value));
    return result;
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // ============================================================================
  // SESSION-AWARE EXECUTION WITH DEADLINE ENFORCEMENT
  // ============================================================================

  /**
   * Executes webhooks with optional deadline enforcement.
   * Used by stage handlers for session-aware execution with timeout guards.
   *
   * @param input - Session-aware execution input with optional deadline.
   * @returns Aggregated result from all adapter executions, or undefined if no adapters executed.
   * @throws AdapterExecutionTimeoutError if execution exceeds the deadline.
   */
  public async executeWithDeadline(
    input: SessionAwareExecutionInput,
  ): Promise<AdapterHookResult | undefined> {
    const {
      bindings,
      sessionId,
      contextId,
      gatewayId,
      deadlineMs,
      metadata,
      payload,
      stage,
      stepTag,
      stepOrder,
    } = input;

    if (bindings.length === 0) {
      return undefined;
    }

    const executeWebhooks = () =>
      this.executeWebhooks({
        bindings,
        sessionId,
        contextId,
        gatewayId,
        metadata,
        payload,
      });

    if (deadlineMs && deadlineMs > 0) {
      return this.runWithDeadline(
        executeWebhooks,
        deadlineMs,
        () =>
          new AdapterExecutionTimeoutError(
            `Adapter hooks timed out after ${deadlineMs}ms for session ${sessionId} at stage=${stage} step=${stepTag} order=${stepOrder}`,
          ),
      );
    }
    return executeWebhooks();
  }

  /** Wraps async operation with timeout - aborts if deadline exceeded. */
  private async runWithDeadline<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    onTimeout: () => Error,
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return await operation();
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(onTimeout()), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

/**
 * Error thrown when adapter execution exceeds the configured deadline.
 */
export class AdapterExecutionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterExecutionTimeoutError";
  }
}

/**
 * Error thrown when an outbound webhook fails or times out.
 * This error aborts the SATP process since outbound webhooks are blocking.
 */
export class AdapterOutboundWebhookError extends Error {
  public readonly adapterId: string;
  public readonly webhookUrl: string;
  public readonly invocationResult: OutboundWebhookInvocationResult;

  constructor(
    message: string,
    adapterId: string,
    webhookUrl: string,
    invocationResult: OutboundWebhookInvocationResult,
  ) {
    super(message);
    this.name = "AdapterOutboundWebhookError";
    this.adapterId = adapterId;
    this.webhookUrl = webhookUrl;
    this.invocationResult = invocationResult;
  }
}

/**
 * Error thrown when an inbound webhook times out waiting for external decision.
 * This error aborts the SATP process since no approval was received in time.
 */
export class AdapterInboundWebhookTimeoutError extends Error {
  public readonly adapterId: string;
  public readonly sessionId: string;
  public readonly timeoutMs: number;

  constructor(
    message: string,
    adapterId: string,
    sessionId: string,
    timeoutMs: number,
  ) {
    super(message);
    this.name = "AdapterInboundWebhookTimeoutError";
    this.adapterId = adapterId;
    this.sessionId = sessionId;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when an external controller rejects an inbound webhook decision.
 * This error aborts the SATP process since the transfer was explicitly rejected.
 */
export class AdapterInboundWebhookRejectedError extends Error {
  public readonly adapterId: string;
  public readonly sessionId: string;
  public readonly reason?: string;

  constructor(
    message: string,
    adapterId: string,
    sessionId: string,
    reason?: string,
  ) {
    super(message);
    this.name = "AdapterInboundWebhookRejectedError";
    this.adapterId = adapterId;
    this.sessionId = sessionId;
    this.reason = reason;
  }
}

/**
 * Generic error for unexpected webhook failures that don't fall into specific
 * categories (timeout, rejection, HTTP failure). Used as a catch-all for
 * unforeseen error conditions during webhook execution.
 *
 * @example
 * ```typescript
 * throw new AdapterWebhookGenericError(
 *   "Unexpected serialization error during payload construction",
 *   "compliance-adapter",
 *   "session-123",
 *   "outbound",
 *   originalError
 * );
 * ```
 */
export class AdapterWebhookGenericError extends Error {
  public readonly adapterId: string;
  public readonly sessionId: string;
  public readonly webhookDirection: "inbound" | "outbound";
  public readonly cause?: Error;

  constructor(
    message: string,
    adapterId: string,
    sessionId: string,
    webhookDirection: "inbound" | "outbound",
    cause?: Error,
  ) {
    super(message);
    this.name = "AdapterWebhookGenericError";
    this.adapterId = adapterId;
    this.sessionId = sessionId;
    this.webhookDirection = webhookDirection;
    this.cause = cause;
  }
}
