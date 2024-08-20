import { Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../../satp-session";
import { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { create } from "@bufbuild/protobuf";
import { SATPLogger } from "../../../logging";

// todo : consider remint on source and burn the destination
export class Stage3RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: SATPBridgesManager;
  private dbLogger: SATPLogger;

  constructor(
    bridgesManager: SATPBridgesManager,
    log: Logger,
    dbLogger: SATPLogger,
  ) {
    this.log = log;
    this.bridgeManager = bridgesManager;
    this.dbLogger = dbLogger;
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
      currentStage: "Stage3",
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
        const amount = sessionData.senderAsset?.amount;

        if (!assetId) {
          throw new Error(`${fnTag}: Sender Asset ID is undefined`);
        }

        if (amount === undefined || amount === null) {
          throw new Error(`${fnTag}: Amount is missing`);
        }

        this.log.info(`${fnTag} minting asset at source, assetId: ${assetId}`);

        await bridge.mintAsset(assetId, Number(amount));
        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage3",
          timestamp: new Date().toISOString(),
          action: "MINT_ASSET_SOURCE",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      }

      if (!isClient) {
        // Server-side:
        const assetId = sessionData.receiverAsset?.tokenId;
        const amount = sessionData.receiverAsset?.amount;

        if (!assetId) {
          throw new Error(`${fnTag}: Sender Asset ID is undefined`);
        }

        if (amount === undefined || amount === null) {
          throw new Error(`${fnTag}: Amount is missing`);
        }

        this.log.info(`${fnTag} Burning Asset ID at Destination: ${assetId}`);

        await bridge.burnAsset(assetId, Number(amount));
        const rollbackLogEntry = create(RollbackLogEntrySchema, {
          sessionId: session.getSessionId(),
          stage: "Stage3",
          timestamp: new Date().toISOString(),
          action: "BURN_ASSET_DESTINATION",
          status: "SUCCESS",
          details: "",
        });

        rollbackState.rollbackLogEntries.push(rollbackLogEntry);
      }

      rollbackState.status = "COMPLETED";
      rollbackState.details = "";

      this.log.info(
        `${fnTag} Successfully rolled back Stage 3 for session ${session.getSessionId()}`,
      );
      return rollbackState;
    } catch (error) {
      this.log.error(`${fnTag} Failed to rollback Stage 3: ${error}`);

      const rollbackLogEntry = create(RollbackLogEntrySchema, {
        sessionId: session.getSessionId(),
        stage: "Stage3",
        timestamp: new Date().toISOString(),
        action: isClient ? "MINT_ASSET_SOURCE" : "BURN_ASSET_DESTINATION",
        status: "FAILED",
        details: `Rollback of Stage 3 failed: ${error}`,
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
