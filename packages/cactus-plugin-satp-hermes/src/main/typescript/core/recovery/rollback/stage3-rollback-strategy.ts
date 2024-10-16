import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntry,
  RollbackState,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";

export class Stage3RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgesManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(
    bridgeManager: SATPBridgesManager,
    localLog: ILocalLogRepository,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage3RollbackStrategy" });
    this.bridgesManager = bridgeManager;
    this.logRepository = localLog;
  }

  async execute(session: SATPSession): Promise<RollbackState> {
    const fnTag = "Stage3RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 3`);

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
      currentStage: String(sessionData.hashes?.stage3),
      stepsRemaining: 2,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
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

      await bridgeManager.burnAsset(assetId, Number(amount));

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage0),
        timestamp: new Date().toISOString(),
        action: "BURN_ASSET",
        status: "SUCCESS",
        details: "",
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.stepsRemaining = 2;
      rollbackState.status = "COMPLETED";
      rollbackState.estimatedTimeToCompletion = "0";
      rollbackState.details = "Rollback of Stage 3 completed successfully";

      this.log.info(
        `${fnTag} Successfully rolled back Stage 3 for session ${session.getSessionId()}`,
      );
      //await this.logRepository.create(logEntry);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 3: ${error}`);

      const rollbackLogEntry = new RollbackLogEntry({
        sessionId: session.getSessionId(),
        stage: String(sessionData.hashes?.stage3),
        timestamp: new Date().toISOString(),
        action: "BURN_ASSET",
        status: "FAILED",
        details: `Error burning asset: ${error}`,
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "FAILED";
      rollbackState.details = `Rollback of Stage 3 failed: ${error}`;

      return rollbackState;
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

      //state.currentStage = "";
      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
