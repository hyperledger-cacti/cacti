import type { SATPLogger as Logger } from "../../satp-logger";
import type { SATPSession } from "../../satp-session";
import { Stage0RollbackStrategy } from "./stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "./stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "./stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "./stage3-rollback-strategy";
import type { RollbackState } from "../../../generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import {
  type Type,
  SATPStage,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v02/session/session_pb";
import { getCrashedStage } from "../../session-utils";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

// TODO: fix for single-gateway setups to handle both client and server data together
export interface RollbackStrategy {
  execute(session: SATPSession, role: Type): Promise<RollbackState>;
  cleanup(session: SATPSession, state: RollbackState): Promise<RollbackState>;
}

export class RollbackStrategyFactory {
  private log: Logger;
  private bridgesManager: BridgeManagerClientInterface;

  constructor(bridgesManager: BridgeManagerClientInterface, log: Logger) {
    this.log = log;
    this.bridgesManager = bridgesManager;
  }

  createStrategy(sessionData: SessionData): RollbackStrategy {
    const fnTag = "RollbackStrategyFactory#createStrategy";
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, () => {
      try {
        const satpPhase = getCrashedStage(sessionData);

        this.log.debug(
          `${fnTag} Rolling back SATP phase: ${SATPStage[satpPhase]}`,
        );

        switch (satpPhase) {
          case SATPStage.SATP_STAGE_0:
            this.log.debug(`${fnTag} Creating Stage0RollbackStrategy`);
            return new Stage0RollbackStrategy(this.bridgesManager, this.log);
          case SATPStage.SATP_STAGE_1:
            this.log.debug(`${fnTag} Creating Stage1RollbackStrategy`);
            return new Stage1RollbackStrategy(this.log);
          case SATPStage.SATP_STAGE_2:
            this.log.debug(`${fnTag} Creating Stage2RollbackStrategy`);
            return new Stage2RollbackStrategy(this.bridgesManager, this.log);
          case SATPStage.SATP_STAGE_3:
            this.log.debug(`${fnTag} Creating Stage3RollbackStrategy`);
            return new Stage3RollbackStrategy(this.bridgesManager, this.log);
          default:
            this.log.debug(`${fnTag} All stages completed; no rollback needed`);
            throw new Error("No rollback needed as all stages are complete.");
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
