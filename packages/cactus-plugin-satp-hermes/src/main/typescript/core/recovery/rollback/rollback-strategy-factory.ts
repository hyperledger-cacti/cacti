import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { Stage0RollbackStrategy } from "./stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "./stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "./stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "./stage3-rollback-strategy";
import { RollbackLogEntry } from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgeManager } from "../../stage-services/satp-bridge/satp-bridge-manager";
import { SATPBridgeConfig } from "../../types";

export interface RollbackState {
  currentStage: string;
  // todo add rollback state
  // placeholder, should import RollbackLogEntry from protos.
  // RollbackLogEntry in spec = RollbackState in code
  rollbackLogEntry: RollbackLogEntry;
}

export interface RollbackStrategy {
  execute(session: SATPSession): Promise<RollbackState>;
  // todo do we want to return any information?
  cleanup(session: SATPSession, state: RollbackState): Promise<RollbackState>;
}

export class RollbackStrategyFactory {
  private log: Logger;
  private bridgeManager: SATPBridgeManager;

  constructor(config: SATPBridgeConfig) {
    this.log = LoggerProvider.getOrCreate({ label: "RollbackStrategyFactory" });
    this.bridgeManager = new SATPBridgeManager(config);
  }

  // todo add bridge manager and possibly others so each strategy can connect to satp bridge
  createStrategy(session: SATPSession): RollbackStrategy {
    const fnTag = "RollbackStrategyFactory#createStrategy";
    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()!
      : session.getServerSessionData()!;
    const rollbackLogEntry = new RollbackLogEntry();

    if (!sessionData.hashes) {
      this.log.debug(`${fnTag} Creating Stage0RollbackStrategy`);
      return new Stage0RollbackStrategy(rollbackLogEntry);
    } else if (
      !sessionData.hashes.stage2 ||
      Object.keys(sessionData.hashes.stage2).length === 0
    ) {
      this.log.debug(`${fnTag} Creating Stage1RollbackStrategy`);
      return new Stage1RollbackStrategy(this.bridgeManager, rollbackLogEntry);
    } else if (
      !sessionData.hashes.stage3 ||
      Object.keys(sessionData.hashes.stage3).length === 0
    ) {
      this.log.debug(`${fnTag} Creating Stage2RollbackStrategy`);
      return new Stage2RollbackStrategy(this.bridgeManager, rollbackLogEntry);
    } else {
      this.log.debug(`${fnTag} Creating Stage3RollbackStrategy`);
      return new Stage3RollbackStrategy(this.bridgeManager, rollbackLogEntry);
    }
  }
}
