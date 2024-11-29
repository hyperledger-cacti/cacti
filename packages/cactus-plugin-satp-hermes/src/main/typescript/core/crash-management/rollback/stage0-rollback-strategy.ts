import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntry,
  RollbackState,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";

export class Stage0RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private logRepository: ILocalLogRepository;

  constructor(localLog: ILocalLogRepository) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage0RollbackStrategy" });
    this.logRepository = localLog;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 0`);

    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    const rollbackState = new RollbackState({
      sessionId: session.getSessionId(),
      currentStage: String(sessionData.hashes?.stage0),
      stepsRemaining: 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "IN_PROGRESS",
      details: "",
    });
    try {
      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage0),
        timestamp: new Date().toISOString(),
        action: "NO_ACTION_REQUIRED",
        status: "SUCCESS",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "COMPLETED";
      rollbackState.details = "Rollback of Stage 0 completed successfully";

      this.log.info(`${fnTag} Rollback of Stage 0 completed successfully`);
      // todo: add logs for rollback
      //await this.logRepository.create(logEntry);

      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Error during rollback of Stage 0: ${error}`);

      rollbackState.status = "FAILED";
      rollbackState.details = `Rollback of Stage 0 failed: ${error}`;

      return rollbackState;
    }
  }

  async cleanup(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleanup not required for Stage 0`);

    const rollbackState = new RollbackState({
      sessionId: session.getSessionId(),
      currentStage: "Stage0",
      stepsRemaining: 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "",
      details: "",
    });

    return rollbackState;
  }
}
