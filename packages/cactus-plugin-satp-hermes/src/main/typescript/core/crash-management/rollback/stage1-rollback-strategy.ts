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

export class Stage1RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: SATPBridgesManager;
  private logRepository: ILocalLogRepository;

  constructor(
    bridgesManager: SATPBridgesManager,
    localLog: ILocalLogRepository,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "Stage1RollbackStrategy" });
    this.bridgeManager = bridgesManager;
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
      currentStage: "Stage1",
      stepsRemaining: isClient ? 1 : 0,
      rollbackLogEntries: [],
      estimatedTimeToCompletion: "",
      status: "IN_PROGRESS",
      details: "",
    });

    try {
      if (isClient) {
        // Client-side:
        const assetId = sessionData.senderAsset?.tokenId;

        if (!assetId) {
          throw new Error(`${fnTag}: Asset ID is undefined`);
        }

        this.log.info(`${fnTag} Unwrapping Asset ID: ${assetId}`);

        await bridge.unwrapAsset(assetId);

        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage1",
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.stepsRemaining = 0;
        rollbackState.estimatedTimeToCompletion = "";
        rollbackState.status = "COMPLETED";
        rollbackState.details = "Rollback of Stage 1 completed successfully";
      } else {
        // Server-side:
        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage1",
          timestamp: new Date().toISOString(),
          action: "NO_ACTION_REQUIRED",
          status: "SUCCESS",
          details: "No rollback action required for server in Stage 1.",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.status = "COMPLETED";
        rollbackState.details =
          "No rollback action required for server in Stage 1.";
      }

      this.log.info(
        `${fnTag} Successfully rolled back Stage 1 for session ${session.getSessionId}`,
      );
      // todo: add logs for rollback
      //await this.logRepository.create(logEntry);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 1: ${error}`);

      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: sessionData.id,
        stage: "Stage1",
        timestamp: new Date().toISOString(),
        action: isClient ? "UNWRAP_ASSET" : "NO_ACTION_REQUIRED",
        status: "FAILED",
        details: `Rollback of Stage 1 failed: ${error}`,
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
