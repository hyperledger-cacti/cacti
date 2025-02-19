import type { Logger } from "@hyperledger/cactus-common";
import type { SATPSession } from "../../satp-session";
import { Stage0RollbackStrategy } from "./stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "./stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "./stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "./stage3-rollback-strategy";
import type { SATPCrossChainManager } from "../../../cross-chain-mechanisms/satp-cc-manager";
import type { RollbackState } from "../../../generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import {
  type Type,
  SATPStage,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { getCrashedStage } from "../../session-utils";

// TODO: fix for single-gateway setups to handle both client and server data together
export interface RollbackStrategy {
  execute(session: SATPSession, role: Type): Promise<RollbackState>;
  cleanup(session: SATPSession, state: RollbackState): Promise<RollbackState>;
}

export class RollbackStrategyFactory {
  private log: Logger;
  private bridgesManager: SATPCrossChainManager;

  constructor(bridgesManager: SATPCrossChainManager, log: Logger) {
    this.log = log;
    this.bridgesManager = bridgesManager;
  }

  createStrategy(sessionData: SessionData): RollbackStrategy {
    const fnTag = "RollbackStrategyFactory#createStrategy";

    const satpPhase = getCrashedStage(sessionData);

    this.log.debug(`${fnTag} Rolling back SATP phase: ${SATPStage[satpPhase]}`);

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
  }
}
