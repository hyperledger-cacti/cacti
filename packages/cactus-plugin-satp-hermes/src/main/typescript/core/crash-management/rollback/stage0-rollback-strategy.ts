import { Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { create } from "@bufbuild/protobuf";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { SATPLogger } from "../../../logging";

export class Stage0RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private dbLogger: SATPLogger;
  private bridgeManager: SATPBridgesManager;

  constructor(
    bridgeManager: SATPBridgesManager,
    log: Logger,
    dbLogger: SATPLogger,
  ) {
    this.log = log;
    this.dbLogger = dbLogger;
    this.bridgeManager = bridgeManager;
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

    const isClient = session.hasClientSessionData();
    const network = isClient
      ? sessionData.senderGatewayNetworkId
      : sessionData.recipientGatewayNetworkId;

    if (isClient && !network) {
      throw new Error(
        `${fnTag}: Unable to determine network from session data.`,
      );
    }

    this.log.info(`${fnTag} network: ${network}`);

    const bridge = this.bridgeManager.getBridge(network);
    if (!bridge) {
      throw new Error(`${fnTag}: No bridge found for network: ${network}`);
    }

    const rollbackState = create(RollbackStateSchema, {
      sessionId: session.getSessionId(),
      currentStage: "Stage0",
      stepsRemaining: Number(),
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
          stage: "Stage0",
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.status = "COMPLETED";
      } else {
        // Server-side:
        const assetId = sessionData.receiverAsset?.tokenId;

        if (!assetId) {
          throw new Error(`${fnTag}: Asset ID is undefined`);
        }

        this.log.info(`${fnTag} Unwrapping Asset ID: ${assetId}`);
        await bridge.unwrapAsset(assetId);

        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage0",
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
        rollbackState.status = "COMPLETED";
      }

      this.log.info(`${fnTag} Rollback of Stage 0 completed successfully`);
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Error during rollback of Stage 0: ${error}`);

      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: session.getSessionId(),
        stage: "Stage0",
        timestamp: new Date().toISOString(),
        action: "UNWRAP_ASSET",
        status: "FAILED",
        details: `Rollback of Stage 0 failed: ${error}`,
      });

      rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      rollbackState.status = "FAILED";
      rollbackState.details = `Rollback of Stage 0 failed: ${error}`;

      return rollbackState;
    }
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#cleanup";
    this.log.info(`${fnTag} Cleaning up after Stage 0 rollback`);

    if (!session) {
      this.log.error(`${fnTag} Session not found`);
      return state;
    }

    try {
      // TODO: Implement Stage 0 specific cleanup logic

      // TODO: Update other state properties as needed

      return state;
    } catch (error) {
      this.log.error(`${fnTag} Cleanup failed: ${error}`);
      return state;
    }
  }
}
