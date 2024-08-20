import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackState, RollbackStrategy } from "./rollback-strategy-factory";
import { RollbackLogEntry } from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";

export class Stage0RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private rollbackLogEntry: RollbackLogEntry;

  constructor(logEntry: RollbackLogEntry) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage0RollbackStrategy" });
    this.rollbackLogEntry = logEntry;
  }

  // return a rollback state in all strategies
  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 0`);

    // check session exists
    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    try {
      // TODO record the rollback on the log. Implement RollbackLogEntry
      this.log.debug("Persisting rollback log entry");

      this.rollbackLogEntry.sessionId = session.getSessionId();
      this.rollbackLogEntry.stage = "Stage0";
      this.rollbackLogEntry.timestamp = Date.now().toString();
      this.rollbackLogEntry.action = "";
      this.rollbackLogEntry.status = "SUCCESS";
      this.rollbackLogEntry.details = "";

      this.log.info(`Successfully rolled back Stage 0`);

      const state: RollbackState = {
        currentStage: "Stage0",
        rollbackLogEntry: this.rollbackLogEntry,
      };
      await this.rollbackLogs.create(state); // todo: log for the rollbackentry

      return state;
    } catch (error) {
      this.log.error(`Failed to rollback Stage 0: ${error}`);

      this.rollbackLogEntry.sessionId = session.getSessionId();
      this.rollbackLogEntry.stage = "Stage0";
      this.rollbackLogEntry.timestamp = Date.now().toString();
      this.rollbackLogEntry.action = "";
      this.rollbackLogEntry.status = "FAILURE";
      this.rollbackLogEntry.details = "";

      const state: RollbackState = {
        currentStage: "Stage0",
        rollbackLogEntry: this.rollbackLogEntry,
      };
      await this.rollbackLogs.create(state); // todo: implement the correct log support
      return state;
    }
  }

  async cleanup(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#cleanup";
    // for stage 0, do nothing
    const state: RollbackState = {
      currentStage: "Stage0",
    };
    if (!session) {
      this.log.error(`${fnTag} Session not found`);
    }
    return state;
  }
}
