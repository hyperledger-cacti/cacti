import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackState, RollbackStrategy } from "./rollback-strategy-factory";
import { RollbackLogEntry } from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgeManager } from "../../stage-services/satp-bridge/satp-bridge-manager";

export class Stage3RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: SATPBridgeManager;
  private rollbackLogEntry: RollbackLogEntry;

  constructor(bridgeManager: SATPBridgeManager, logEntry: RollbackLogEntry) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage3RollbackStrategy" });
    this.bridgeManager = bridgeManager;
    this.rollbackLogEntry = logEntry;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage3RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 3`);

    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    try {
      // TODO: Implement Stage 3 specific rollback logic

      // TODO: Record the rollback on the log. Implement RollbackLogEntry

      const receipt = await this.bridgeManager.burnAsset("assetId", Number());

      this.log.info(`${fnTag}, Asset unlocked: ${receipt}`);

      this.rollbackLogEntry.sessionId = session.getSessionId();
      this.rollbackLogEntry.stage = "Stage3";
      this.rollbackLogEntry.timestamp = Date.now().toString();
      this.rollbackLogEntry.action = "BURN";
      this.rollbackLogEntry.status = "SUCCESS";
      this.rollbackLogEntry.details = "";

      this.log.debug("Persisting rollback log entry");

      this.log.info(`Successfully rolled back Stage 3`);
      const state: RollbackState = {
        currentStage: "Stage3",
        rollbackLogEntry: this.rollbackLogEntry,
      };

      await this.rollbackLogs.create(state); // todo: log support
      return state;
    } catch (error) {
      this.log.error(`Failed to rollback Stage 3: ${error}`);
      return false;
    }
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage3RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleaning up after Stage 3 rollback`);

    if (!session) {
      this.log.error(`${fnTag} Session not found`);
      return state;
    }

    try {
      // TODO: Implement Stage 3 specific cleanup logic

      state.currentStage = "Stage3";
      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
