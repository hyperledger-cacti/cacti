/**
 * @fileoverview
 * Central manager for SATP adapter configuration, execution plan lookup, and webhook execution.
 *
 * @description
 * The adapter manager is the single entry point for all adapter-related operations.
 * It translates the static API3 adapter configuration into runtime structures,
 * determines when adapters should execute, and delegates webhook execution to
 * the AdapterHookService.
 *
 * **Responsibilities:**
 * - Validate and cache adapter configuration provided by the gateway operator
 * - Build an execution plan mapping (stage, step, order) → adapters
 * - Provide lookup for adapters at a specific execution point (stage, stepTag, stepOrder)
 * - Filter by active/inactive status
 * - Determine if adapters should execute at a given execution point
 * - Initialize and hold reference to AdapterHookService
 * - Execute adapters via the hook service
 *
 * **Usage Pattern:**
 * The SATP handler calls manager.executeAdapters(input) which internally checks
 * if adapters should run, gets bindings, and delegates to the hook service.
 *
 * @example
 * Using the adapter manager:
 * ```typescript
 * const manager = new AdapterManager({
 *   config: gatewayConfig.adapterConfig,
 *   logLevel: "INFO",
 *   monitorService
 * });
 *
 * // Execute adapters at a specific point
 * await manager.executeAdapters({
 *   stage: 1,
 *   stepTag: "lockAssertionRequest",
 *   stepOrder: "before",
 *   sessionId: "session-123",
 *   gatewayId: "gateway-1"
 * });
 * ```
 *
 * @see {@link AdapterHookService} for low-level webhook execution
 * @see {@link AdapterLayerConfiguration} for configuration schema
 * @see {@link AdapterExecutionBinding} for binding structure
 *
 * @module adapter-manager
 * @since 0.0.3-beta
 */

import { Checks, type LogLevelDesc } from "@hyperledger/cactus-common";
import type { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { MonitorService } from "../services/monitoring/monitor";
import {
  AdapterLayerConfiguration,
  AdapterDefinition,
  AdapterExecutionBinding,
  AdapterExecutionPlan,
  StageExecutionStep,
  stageKeyToNumber,
  isValidStageKey,
  SatpStageKey,
} from "./adapter-config";
import {
  isValidStage,
  isValidStepForStage,
  getStepByTag,
  getStepSequenceNumber,
  validateStepTagForStage,
  type SatpStage,
} from "../core/satp-protocol-map";
import { AdapterHookService } from "./adapter-hook-service";
import type { AdapterHookResult } from "./adapter-runtime-types";

// Re-export for consumers
export {
  AdapterExecutionTimeoutError,
  AdapterOutboundWebhookError,
  AdapterInboundWebhookTimeoutError,
  AdapterInboundWebhookRejectedError,
  AdapterWebhookGenericError,
} from "./adapter-hook-service";

/**
 * Configuration for {@link AdapterManager}.
 *
 * @property config - Complete adapter configuration loaded from disk or env.
 * @property logLevel - Optional log verbosity overriding the monitor defaults.
 * @property monitorService - Shared monitoring instance for structured spans.
 * @property fetchImpl - Optional fetch implementation for webhook calls.
 */
export interface IAdapterManagerOptions {
  config: AdapterLayerConfiguration;
  logLevel?: LogLevelDesc;
  monitorService: MonitorService;
  fetchImpl?: typeof fetch;
}

/**
 * Input for executing adapters at a specific execution point.
 */
export interface AdapterExecutionInput {
  stage: number;
  stepTag: string;
  stepOrder: StageExecutionStep;
  sessionId: string;
  contextId?: string;
  gatewayId: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

/**
 * Payload for adapter execution at a specific protocol execution point.
 * This is the primary interface used by stage handlers to invoke adapters.
 *
 * The payload should be constructed as early as possible in the handler method
 * and passed to the adapter manager's executeAdaptersOrSkip method.
 */
export interface ExecutionPointAdapterPayload {
  /** SATP protocol stage (SatpStageKey.Stage0, SatpStageKey.Stage1, etc.) */
  stage: SatpStageKey;
  /** Step identifier within the stage (e.g., "newSessionRequest", "checkNewSessionRequest") */
  stepTag: string;
  /** Execution order: before, after, during, rollback */
  stepOrder: StageExecutionStep;
  /** @deprecated Use stepOrder instead */
  order?: StageExecutionStep;
  /** Session identifier */
  sessionId: string;
  /** Gateway identifier */
  gatewayId: string;
  /** Optional transfer context identifier */
  contextId?: string;
  /** Optional metadata to pass to adapters (e.g., operation, role) */
  metadata?: Record<string, unknown>;
  /** Optional payload data to pass to adapters */
  payload?: Record<string, unknown>;
}

/**
 * @deprecated Use ExecutionPointAdapterPayload instead
 * Input for session-aware adapter execution from stage handlers.
 * Uses Stage enum for type safety.
 */
export interface SessionAdapterExecutionRequest {
  /** SATP protocol stage (SatpStageKey.Stage0, SatpStageKey.Stage1, etc.) */
  stage: SatpStageKey;
  /** Step identifier within the stage */
  stepTag: string;
  /** Execution order: before, after, during, rollback */
  order: StageExecutionStep;
  /** Session identifier */
  sessionId: string;
  /** Gateway identifier */
  gatewayId: string;
  /** Optional transfer context identifier */
  contextId?: string;
  /** Optional metadata to pass to adapters */
  metadata?: Record<string, unknown>;
  /** Optional payload to pass to adapters */
  payload?: Record<string, unknown>;
}

/**
 * Input for processing an inbound webhook decision.
 */
export interface InboundWebhookDecisionInput {
  /** Adapter identifier that originally paused the SATP stage */
  adapterId: string;
  /** Session identifier for the paused SATP transfer */
  sessionId: string;
  /** Optional transfer context identifier */
  contextId?: string;
  /** When true, gateway resumes; when false, transfer is rejected */
  continue: boolean;
  /** Human-readable justification for auditing */
  reason?: string;
  /** Optional data payload from external system */
  data?: Record<string, unknown>;
}

/**
 * Result of processing an inbound webhook decision.
 */
export interface InboundWebhookDecisionResult {
  /** Whether the decision was accepted and applied */
  accepted: boolean;
  /** Session identifier for the affected transfer */
  sessionId: string;
  /** Human-readable message describing the result */
  message?: string;
  /** Timestamp when the decision was processed */
  timestamp: string;
}

/**
 * Central manager for SATP adapter configuration and execution.
 *
 * @description
 * The manager builds an indexed catalog of adapter definitions organized by
 * stage, step, and execution order. It determines when adapters should execute
 * and delegates webhook execution to the AdapterHookService.
 *
 * The constructor performs basic validation (presence of mandatory options) and
 * logs key statistics so operators can confirm that the configuration loaded as
 * expected.
 */
export class AdapterManager {
  public static readonly CLASS_NAME = "AdapterManager";

  private readonly log: Logger;
  private readonly monitorService: MonitorService;
  private readonly config: AdapterLayerConfiguration;
  private readonly adaptersById: Map<string, AdapterDefinition>;
  private readonly executionPlan: AdapterExecutionPlan;
  private readonly hookService: AdapterHookService;

  /**
   * Creates a new adapter manager instance using the supplied configuration.
   *
   * @param options - {@link IAdapterManagerOptions} with configuration + deps.
   */
  constructor(options: IAdapterManagerOptions) {
    const fnTag = `${AdapterManager.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.config, `${fnTag} options.config`);
    Checks.truthy(options.monitorService, `${fnTag} options.monitorService`);

    this.monitorService = options.monitorService;
    this.log = LoggerProvider.getOrCreate(
      {
        label: AdapterManager.CLASS_NAME,
        level: options.logLevel || "INFO",
      },
      this.monitorService,
    );
    this.config = options.config;
    this.adaptersById = this.buildAdapterIndex(this.config.adapters || []);
    this.executionPlan = this.buildExecutionPlan();

    this.hookService = new AdapterHookService({
      logger: this.log,
      globalConfig: this.config.global,
      fetchImpl: options.fetchImpl,
    });

    this.log.debug(
      `${fnTag} Initialized with ${this.adaptersById.size} adapters and ${this.executionPlan.bindings.length} execution bindings`,
    );
  }

  /**
   * Returns the raw adapter configuration provided during construction.
   * Used by {@link AdapterHookService} to access global settings.
   *
   * @returns Unmodified {@link AdapterLayerConfiguration} reference.
   */
  public getConfiguration(): AdapterLayerConfiguration {
    return this.config;
  }

  /**
   * Indicates whether the manager currently tracks at least one adapter.
   *
   * @returns `true` when any adapters were configured.
   */
  public hasAdaptersConfigured(): boolean {
    return this.adaptersById.size > 0;
  }

  /**
   * Returns bindings for a specific execution point.
   *
   * All bindings are pre-validated during construction, so this method
   * performs a simple lookup without re-validating stage/stepTag combinations.
   *
   * @param stage - Stage number (0-3).
   * @param stepTag - Stage-specific step identifier.
   * @param stepOrder - Execution order (before/during/after/rollback).
   * @param includeInactive - Whether to include inactive adapters.
   * @returns Array of {@link AdapterExecutionBinding} entries (empty if none configured).
   */
  public getBindingsForExecutionPoint(
    stage: number,
    stepTag: string,
    stepOrder: StageExecutionStep,
    includeInactive = false,
  ): AdapterExecutionBinding[] {
    return this.executionPlan.bindings.filter((binding) => {
      const matchesPoint =
        binding.stage === stage &&
        binding.stepTag === stepTag &&
        binding.stepOrder === stepOrder;
      const shouldInclude = includeInactive || binding.adapter.active;
      return matchesPoint && shouldInclude;
    });
  }

  /**
   * Executes all adapters configured for the given execution point.
   * This is the main entry point for adapter execution.
   *
   * @param input - Execution input with stage, step, and context data.
   * @returns Aggregated result from all adapter executions, or undefined if no adapters executed.
   */
  public async executeAdapters(
    input: AdapterExecutionInput,
  ): Promise<AdapterHookResult | undefined> {
    if (!this.hasAdaptersConfigured()) {
      return undefined;
    }

    // Validate execution point against protocol map
    if (!isValidStepForStage(input.stage, input.stepTag)) {
      this.log.error(
        `AdapterManager#executeAdapters() Step "${input.stepTag}" is not valid for stage ${input.stage}`,
      );
      throw new Error(
        `Step "${input.stepTag}" is not a valid SATP protocol step for stage ${input.stage}`,
      );
    }

    // Log execution point with protocol metadata for observability
    const stepInfo = getStepByTag(input.stage as SatpStage, input.stepTag);
    if (stepInfo) {
      this.log.debug(
        `AdapterManager#executeAdapters() Executing adapters for stage ${input.stage}, step "${input.stepTag}" (${stepInfo.description}), order ${input.stepOrder}`,
      );
    }

    // Get bindings for this execution point
    const bindings = this.getBindingsForExecutionPoint(
      input.stage,
      input.stepTag,
      input.stepOrder,
    );

    if (bindings.length === 0) {
      return undefined;
    }

    // Delegate to hook service for actual webhook execution
    return this.hookService.executeWebhooks({
      bindings,
      sessionId: input.sessionId,
      contextId: input.contextId,
      gatewayId: input.gatewayId,
      metadata: input.metadata,
      payload: input.payload,
    });
  }

  /**
   * Convenience method to execute adapters for "before" step order.
   */
  public async executeAdaptersBefore(
    input: Omit<AdapterExecutionInput, "stepOrder">,
  ): Promise<AdapterHookResult | undefined> {
    return this.executeAdapters({ ...input, stepOrder: "before" });
  }

  /**
   * Convenience method to execute adapters for "during" step order.
   */
  public async executeAdaptersDuring(
    input: Omit<AdapterExecutionInput, "stepOrder">,
  ): Promise<AdapterHookResult | undefined> {
    return this.executeAdapters({ ...input, stepOrder: "during" });
  }

  /**
   * Convenience method to execute adapters for "after" step order.
   */
  public async executeAdaptersAfter(
    input: Omit<AdapterExecutionInput, "stepOrder">,
  ): Promise<AdapterHookResult | undefined> {
    return this.executeAdapters({ ...input, stepOrder: "after" });
  }

  /**
   * Convenience method to execute adapters for "rollback" step order.
   */
  public async executeAdaptersRollback(
    input: Omit<AdapterExecutionInput, "stepOrder">,
  ): Promise<AdapterHookResult | undefined> {
    return this.executeAdapters({ ...input, stepOrder: "rollback" });
  }

  // ============================================================================
  // SESSION-AWARE EXECUTION METHODS
  // Used by stage handlers to execute adapters with session context and deadlines
  // ============================================================================

  /**
   * Converts Stage enum to numeric stage value.
   */
  private stageToNumber(stage: SatpStageKey): number {
    const stageMap: Partial<Record<SatpStageKey, number>> = {
      [SatpStageKey.Stage0]: 0,
      [SatpStageKey.Stage1]: 1,
      [SatpStageKey.Stage2]: 2,
      [SatpStageKey.Stage3]: 3,
    };
    return stageMap[stage] ?? 0;
  }

  /**
   * Execute adapters for a session with optional deadline enforcement.
   * This is the main entry point for stage handlers to execute adapters.
   *
   * Handles undefined payloads gracefully - returns undefined without error
   * when no payload is provided (e.g., when session is not available).
   *
   * @param executionPayload - Execution point adapter payload containing all execution parameters, or undefined
   * @returns Aggregated result from all adapter executions, or undefined if no adapters executed or payload is undefined.
   */
  public async executeAdaptersOrSkip(
    executionPayload: ExecutionPointAdapterPayload | undefined,
  ): Promise<AdapterHookResult | undefined> {
    if (!executionPayload) {
      return undefined;
    }
    const {
      stage,
      stepTag,
      stepOrder,
      order,
      sessionId,
      gatewayId,
      contextId,
      metadata,
      payload,
    } = executionPayload;
    const resolvedOrder = stepOrder ?? order;
    if (!resolvedOrder) {
      this.log.warn(
        "AdapterManager#executeAdaptersOrSkip() Missing stepOrder/order in execution payload",
      );
      return undefined;
    }
    const stageNumber = this.stageToNumber(stage);

    if (!this.hasAdaptersConfigured()) {
      return undefined;
    }

    const bindings = this.getBindingsForExecutionPoint(
      stageNumber,
      stepTag,
      resolvedOrder,
    );
    if (bindings.length === 0) {
      return undefined;
    }

    const deadlineMs = this.resolveInboundDeadlineMs(
      stageNumber,
      stepTag,
      resolvedOrder,
    );

    return this.hookService.executeWithDeadline({
      bindings,
      sessionId,
      contextId,
      gatewayId,
      stage: stageNumber,
      stepTag,
      stepOrder: resolvedOrder,
      deadlineMs,
      metadata,
      payload,
    });
  }

  // ============================================================================
  // INBOUND WEBHOOK DECISION METHODS
  // Used by external approval controllers to submit decisions for paused sessions
  // ============================================================================

  /**
   * Process an inbound webhook decision from an external approval controller.
   *
   * This method is called when an external system (compliance check, manual review,
   * policy enforcement) posts a decision to approve or reject a paused SATP transfer.
   *
   * **Decision Processing:**
   * 1. Validate the adapterId exists in the configuration
   * 2. Log the decision with justification for audit trail
   * 3. Return acceptance status to the external controller
   *
   * Note: The actual session resume/abort logic is handled by the hook service
   * when it receives the decision through a separate coordination mechanism.
   * This method provides the API entry point and validation.
   *
   * @param input - Decision input containing adapterId, sessionId, continue flag, and reason
   * @returns Decision result indicating if the decision was accepted
   */
  public async decideInboundWebhook(
    input: InboundWebhookDecisionInput,
  ): Promise<InboundWebhookDecisionResult> {
    const fnTag = `${AdapterManager.CLASS_NAME}#decideInboundWebhook()`;

    this.log.info(
      `${fnTag} Processing decision: adapter="${input.adapterId}" session="${input.sessionId}" continue=${input.continue} reason="${input.reason || "N/A"}"`,
    );

    // Validate the adapter exists in our configuration
    const adapter = this.adaptersById.get(input.adapterId);
    if (!adapter) {
      this.log.warn(
        `${fnTag} Unknown adapterId="${input.adapterId}" - decision rejected`,
      );
      return {
        accepted: false,
        sessionId: input.sessionId,
        message: `Unknown adapter: ${input.adapterId}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate the adapter has an inbound webhook configured
    if (!adapter.inboundWebhook) {
      this.log.warn(
        `${fnTag} Adapter "${input.adapterId}" does not have an inbound webhook configured - decision rejected`,
      );
      return {
        accepted: false,
        sessionId: input.sessionId,
        message: `Adapter "${input.adapterId}" is not configured for inbound webhooks`,
        timestamp: new Date().toISOString(),
      };
    }

    // Log the decision for audit trail
    const decisionType = input.continue ? "APPROVED" : "REJECTED";
    this.log.info(
      `${fnTag} Decision ${decisionType} for session="${input.sessionId}" by adapter="${input.adapterId}": ${input.reason || "No reason provided"}`,
    );

    // Delegate to hook service to process the decision
    // This will resume or abort the waiting session
    const accepted = await this.hookService.processInboundDecision({
      adapterId: input.adapterId,
      sessionId: input.sessionId,
      contextId: input.contextId,
      shouldContinue: input.continue,
      reason: input.reason,
      data: input.data,
    });

    return {
      accepted,
      sessionId: input.sessionId,
      message: accepted
        ? `Decision accepted, transfer ${input.continue ? "resumed" : "aborted"}`
        : "Decision rejected - session not in waiting state or already processed",
      timestamp: new Date().toISOString(),
    };
  }

  /** Derives the smallest inbound timeout defined across adapters for an execution point. */
  private resolveInboundDeadlineMs(
    stage: number,
    stepTag: string,
    stepOrder: StageExecutionStep,
  ): number | undefined {
    const bindings = this.getBindingsForExecutionPoint(
      stage,
      stepTag,
      stepOrder,
    );
    if (bindings.length === 0) {
      return undefined;
    }
    const globalTimeout = this.config.global?.timeoutMs;
    let effectiveDeadline: number | undefined;
    for (const binding of bindings) {
      const inbound = binding.adapter.inboundWebhook;
      if (!inbound) {
        continue;
      }
      const candidate = inbound.timeoutMs ?? globalTimeout;
      if (!candidate || candidate <= 0) {
        continue;
      }
      effectiveDeadline =
        typeof effectiveDeadline === "number"
          ? Math.min(effectiveDeadline, candidate)
          : candidate;
    }
    return effectiveDeadline;
  }

  private buildAdapterIndex(
    adapters: AdapterDefinition[],
  ): Map<string, AdapterDefinition> {
    const index = new Map<string, AdapterDefinition>();
    for (const adapter of adapters) {
      if (!adapter.executionPoints || adapter.executionPoints.length === 0) {
        this.log.warn(
          `Adapter id="${adapter.id}" has no executionPoints; skipping`,
        );
        continue;
      }
      if (index.has(adapter.id)) {
        this.log.warn(
          `Duplicate adapter id="${adapter.id}" detected; keeping first definition`,
        );
        continue;
      }
      index.set(adapter.id, adapter);
    }
    return index;
  }

  private buildExecutionPlan(): AdapterExecutionPlan {
    const bindings: AdapterExecutionBinding[] = [];
    const errors: string[] = [];

    for (const adapter of this.adaptersById.values()) {
      for (const executionPoint of adapter.executionPoints) {
        const pointLabel = `stage:${executionPoint.stage}/step:${executionPoint.step}/point:${executionPoint.point}`;

        // Convert string stage key to numeric stage value
        const stageKey = executionPoint.stage as SatpStageKey;
        if (!isValidStageKey(stageKey)) {
          errors.push(
            `Adapter id="${adapter.id}", execution point "${pointLabel}": ` +
              `invalid or unsupported stage "${executionPoint.stage}". Valid stages are stage0, stage1, stage2, stage3.`,
          );
          continue;
        }

        const numericStage = stageKeyToNumber(stageKey);
        if (numericStage === undefined || !isValidStage(numericStage)) {
          errors.push(
            `Adapter id="${adapter.id}", execution point "${pointLabel}": ` +
              `invalid stage ${executionPoint.stage}. Valid stages are stage0, stage1, stage2, stage3.`,
          );
          continue;
        }

        const validation = validateStepTagForStage(
          numericStage,
          executionPoint.step,
        );
        if (!validation.valid) {
          errors.push(
            `Adapter id="${adapter.id}", execution point "${pointLabel}": ` +
              `${validation.errorMessage}`,
          );
          continue;
        }

        bindings.push({
          adapterId: adapter.id,
          adapter,
          stage: numericStage,
          stepTag: executionPoint.step,
          stepOrder: executionPoint.point,
          priority: adapter.priority ?? 1000,
        });
      }
    }

    // Abort startup on invalid config - operator must fix before gateway can run
    if (errors.length > 0) {
      const errorMessage =
        `${AdapterManager.CLASS_NAME}#buildExecutionPlan() Invalid adapter configuration detected:\n` +
        errors.map((e) => `  - ${e}`).join("\n");
      this.log.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Deterministic ordering: stage → protocol step sequence → execution order → adapter priority
    // Priority only distinguishes adapters at the same execution point
    const stepOrderRank: Record<StageExecutionStep, number> = {
      before: 0,
      during: 1,
      after: 2,
      rollback: 3,
    };
    bindings.sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage;
      const seqA = getStepSequenceNumber(a.stage, a.stepTag) ?? 9999;
      const seqB = getStepSequenceNumber(b.stage, b.stepTag) ?? 9999;
      if (seqA !== seqB) return seqA - seqB;
      if (a.stepOrder !== b.stepOrder) {
        return stepOrderRank[a.stepOrder] - stepOrderRank[b.stepOrder];
      }
      return a.priority - b.priority;
    });

    return { bindings };
  }
}
