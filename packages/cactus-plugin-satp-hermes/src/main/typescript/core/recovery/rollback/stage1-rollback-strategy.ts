import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntry,
  RollbackState,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";

export class Stage1RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgesManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(
    bridgeManager: SATPBridgesManager,
    localLog: ILocalLogRepository,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage1RollbackStrategy" });
    this.bridgesManager = bridgeManager;
    this.logRepository = localLog;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage1RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 1`);

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const rollbackState = new RollbackState({
      sessionId: session.getSessionId(),
      currentStage: String(sessionData.hashes?.stage1),
      stepsRemaining: 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "IN_PROGRESS",
      details: "",
    });

    const network = sessionData.senderGatewayNetworkId;

    if (!network) {
      throw new Error(
        `${fnTag}: Unable to determine network from session data.`,
      );
    }

    const bridgeManager = this.bridgesManager.getBridge(network);

    try {
      const assetId = sessionData.senderAsset?.tokenId;

      if (!assetId) {
        throw new Error(`${fnTag}: Asset ID is undefined`);
      }

      this.log.info(`${fnTag}, Asset Id: ${assetId}`);

      await bridgeManager.unwrapAsset(assetId);

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage1),
        timestamp: new Date().toISOString(),
        action: "UNWRAP_ASSET",
        status: "SUCCESS",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.stepsRemaining = 0;
      rollbackState.status = "COMPLETED";
      rollbackState.estimatedTimeToCompletion = "0";
      rollbackState.details = "Rollback of Stage 1 completed successfully";

      this.log.info(
        `${fnTag} Successfully rolled back Stage 1 for session ${session.getSessionId}`,
      );
      //await this.logRepository.create(logEntry);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 1: ${error}`);

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: sessionData.id,
        stage: String(sessionData.hashes?.stage1),
        timestamp: new Date().toISOString(),
        action: "UNWRAP_ASSET",
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

      //state.currentStage = "";
      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
