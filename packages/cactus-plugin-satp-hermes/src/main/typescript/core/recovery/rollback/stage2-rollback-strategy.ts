import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntry,
  RollbackState,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";

export class Stage2RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgesManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(
    bridgeManager: SATPBridgesManager,
    localLog: ILocalLogRepository,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage2RollbackStrategy" });
    this.bridgesManager = bridgeManager;
    this.logRepository = localLog;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage2RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 2`);

    const sessionData = session.hasClientSessionData()
      ? session.getClientSessionData()
      : session.getServerSessionData();

    if (!sessionData) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }
    const network = sessionData.senderGatewayNetworkId;

    if (!network) {
      throw new Error(
        `${fnTag}: Unable to determine network from session data.`,
      );
    }

    const bridgeManager = this.bridgesManager.getBridge(network);

    const rollbackState = new RollbackState({
      sessionId: session.getSessionId(),
      currentStage: String(sessionData.hashes?.stage2),
      stepsRemaining: 1,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "0",
      status: "IN_PROGRESS",
      details: "",
    });

    try {
      const assetId = sessionData.senderAsset?.tokenId;
      const amount = sessionData.senderAsset?.amount;
      if (!assetId) {
        throw new Error(`${fnTag}: Asset ID is undefined`);
      }

      if (!amount) {
        throw new Error(`${fnTag}, Amount is missing`);
      }

      this.log.info(`${fnTag} Asset Id: ${assetId} amount: ${amount}`);

      await bridgeManager.unlockAsset(assetId, Number(amount));

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage2),
        timestamp: new Date().toISOString(),
        action: "UNLOCK_ASSET",
        status: "SUCCESS",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.stepsRemaining = 1;
      rollbackState.status = "COMPLETED";
      rollbackState.estimatedTimeToCompletion = "0";
      rollbackState.details = "Rollback of Stage 2 completed successfully";

      this.log.info(
        `${fnTag} Successfully rolled back Stage 2 for session ${session.getSessionId()}`,
      );
      //await this.logRepository.create(logEntry);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 2: ${error}`);

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage2),
        timestamp: new Date().toISOString(),
        action: "UNLOCK_ASSET",
        status: "FAILED",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "FAILED";
      rollbackState.details = `Rollback of Stage 2 failed: ${error}`;

      return rollbackState;
    }
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage2RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleaning up after Stage 2 rollback`);

    if (!session) {
      this.log.error(`${fnTag} Session not found`);
      return state;
    }

    try {
      // TODO: Implement Stage 2 specific cleanup logic

      //state.currentStage = "Stage2";
      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
