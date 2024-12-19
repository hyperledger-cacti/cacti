import { Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { create } from "@bufbuild/protobuf";
import { SATPLogger } from "../../../logging";

export class Stage1RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private dbLogger: SATPLogger;

  constructor(log: Logger, dbLogger: SATPLogger) {
    this.log = log;
    this.dbLogger = dbLogger;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage1RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 1`);

    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const rollbackState = create(RollbackStateSchema, {
      sessionId: session.getSessionId(),
      currentStage: "Stage1",
      stepsRemaining: 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "IN_PROGRESS",
      details: "",
    });

    try {
      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: session.getSessionId(),
        stage: "Stage1",
        timestamp: new Date().toISOString(),
        action: "NO_ACTION_REQUIRED",
        status: "SUCCESS",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "COMPLETED";
      rollbackState.details = "";

      this.log.info(`${fnTag} Successfully rolled back Stage 1`);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 1: ${error}`);

      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: sessionData.id,
        stage: "Stage1",
        timestamp: new Date().toISOString(),
        action: "NO_ACTION_REQUIRED",
        status: "FAILED",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "FAILED";
      rollbackState.details = `Rollback of Stage 1 failed: ${error}`;

      return rollbackState;
    }
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage1RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleaning up after Stage 1 rollback`);

    if (!session) {
      this.log.error(`${fnTag} Session not found`);
      return state;
    }

    try {
      // TODO: Implement Stage 1 specific cleanup logic

      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
