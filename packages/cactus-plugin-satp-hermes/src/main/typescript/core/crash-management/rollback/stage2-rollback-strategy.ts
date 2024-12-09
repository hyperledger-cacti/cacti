import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { ILocalLogRepository } from "../../../repository/interfaces/repository";
import { create } from "@bufbuild/protobuf";

export class Stage2RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(
    bridgesManager: SATPBridgesManager,
    localLog: ILocalLogRepository,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage2RollbackStrategy" });
    this.bridgeManager = bridgesManager;
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

    const isClient = session.hasClientSessionData();
    const network = isClient
      ? sessionData.senderGatewayNetworkId
      : sessionData.recipientGatewayNetworkId;

    if (isClient && !network) {
      throw new Error(
        `${fnTag}: Unable to determine client network from session data.`,
      );
    }
    this.log.info(`${fnTag} network: ${network}`);

    const bridge = this.bridgeManager.getBridge(network);
    if (!bridge) {
      throw new Error(`${fnTag}: No bridge found for network: ${network}`);
    }

    const rollbackState = create(RollbackStateSchema, {
      sessionId: session.getSessionId(),
      currentStage: "Stage2",
      stepsRemaining: isClient ? 1 : 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "IN_PROGRESS",
      details: "",
    });

    try {
      if (isClient) {
        // Client-side: Unlock the asset to revert the lock action
        const assetId = sessionData.senderAsset?.tokenId;
        const amount = sessionData.senderAsset?.amount;

        if (!assetId) {
          throw new Error(`${fnTag}: Asset ID is undefined`);
        }

        if (amount === undefined || amount === null) {
          throw new Error(`${fnTag}: Amount is missing`);
        }

        this.log.info(
          `${fnTag} Unlocking Asset ID: ${assetId}, Amount: ${amount}`,
        );

        await bridge.unlockAsset(assetId, Number(amount));

        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage2",
          timestamp: new Date().toISOString(),
          action: "UNLOCK_ASSET",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.stepsRemaining = 1;
        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.stepsRemaining = 1;
        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.stepsRemaining = 1;
        rollbackState.status = "COMPLETED";
        rollbackState.estimatedTimeToCompletion = "";
        rollbackState.details = "Rollback of Stage 2 completed successfully";
      } else {
        // Server-side:
        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage2",
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED",
          status: "SUCCESS",
          details: "No rollback action required for server in Stage 2.",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.status = "COMPLETED";
        rollbackState.details =
          "No rollback action required for server in Stage 2.";
      }

      this.log.info(
        `${fnTag} Successfully rolled back Stage 2 for session ${session.getSessionId}`,
      );
      // todo: add logs for rollback
      //await this.logRepository.create(logEntry);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 2: ${error}`);

      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: session.getSessionId(),
        stage: "Stage2",
        timestamp: new Date().toISOString(),
        action: isClient ? "UNLOCK_ASSET" : "NO_ACTION_REQUIRED",
        status: "FAILED",
        details: `Rollback of Stage 2 failed: ${error}`,
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
