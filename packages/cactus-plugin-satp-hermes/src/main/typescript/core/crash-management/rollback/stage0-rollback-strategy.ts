import type { Logger } from "@hyperledger/cactus-common";
import type { SATPSession } from "../../satp-session";
import type { RollbackStrategy } from "./rollback-strategy-factory";
import {
  RollbackLogEntrySchema,
  type RollbackState,
  RollbackStateSchema,
} from "../../../generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import { create } from "@bufbuild/protobuf";
import {
  Type,
  SATPStage,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v02/session/session_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { FungibleAsset } from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { protoToAsset } from "../../stage-services/service-utils";

export class Stage0RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: BridgeManagerClientInterface;

  constructor(bridgeManager: BridgeManagerClientInterface, log: Logger) {
    this.log = log;
    this.bridgeManager = bridgeManager;
  }

  async execute(session: SATPSession, role: Type): Promise<RollbackState> {
    const fnTag = "Stage0RollbackStrategy#execute";
    this.log.info(`${fnTag} Executing rollback for Stage 0`);

    if (!session) {
      throw new Error(`${fnTag}, session data is not correctly initialized!`);
    }

    const rollbackState = create(RollbackStateSchema, {
      sessionId: session.getSessionId(),
      currentStage: SATPStage[1],
      rollbackLogEntries: [],
      status: "IN_PROGRESS",
      details: "",
    });

    // client-rollback
    if (session.hasClientSessionData() && role === Type.CLIENT) {
      const clientSessionData = session.getClientSessionData();
      await this.handleClientSideRollback(clientSessionData, rollbackState);
    }

    // server-rollback
    if (session.hasServerSessionData() && role === Type.SERVER) {
      const serverSessionData = session.getServerSessionData();
      await this.handleServerSideRollback(serverSessionData, rollbackState);
    }

    if (
      rollbackState.rollbackLogEntries.some(
        (entry) => entry.status === "FAILED",
      )
    ) {
      rollbackState.status = "FAILED";
    } else {
      rollbackState.status = "COMPLETED";
    }

    this.log.info(
      `${fnTag} Rollback of ${SATPStage[1]} finished with status: ${rollbackState.status}`,
    );
    return rollbackState;
  }

  private async handleClientSideRollback(
    clientSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage0RollbackStrategy#handleClientSideRollback";
    try {
      const networkId = {
        id: clientSessionData.recipientGatewayNetworkId,
        ledgerType: clientSessionData.recipientGatewayNetworkId as LedgerType,
      };
      if (!networkId) {
        throw new Error(
          `${fnTag}: Missing recipientGatewayNetworkId for server!`,
        );
      }

      const bridge = this.bridgeManager.getSATPExecutionLayer(
        networkId,
        ClaimFormat.DEFAULT,
      );

      if (!clientSessionData.senderAsset) {
        throw new Error(`${fnTag}: senderAsset is undefined`);
      }

      const asset: FungibleAsset = protoToAsset(
        clientSessionData.senderAsset,
        networkId,
      ) as FungibleAsset;

      // Unwrap asset (client)
      this.log.info(`${fnTag} Unwrapping Asset: ${asset}`);
      await bridge.unwrapAsset(asset);

      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: clientSessionData.id,
          stage: SATPStage[1],
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET_CLIENT",
          status: "SUCCESS",
          details: "Client-side unwrap completed",
        }),
      );
    } catch (error) {
      this.log.error(`${fnTag} Error in client-side rollback: ${error}`);

      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: clientSessionData.id,
          stage: SATPStage[1],
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET_CLIENT",
          status: "FAILED",
          details: `Client-side unwrap failed: ${error}`,
        }),
      );
    }
  }

  private async handleServerSideRollback(
    serverSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage0RollbackStrategy#handleServerSideRollback";
    try {
      const networkId = {
        id: serverSessionData.senderGatewayNetworkId,
        ledgerType: serverSessionData.senderGatewayNetworkId as LedgerType,
      };
      if (!networkId) {
        throw new Error(
          `${fnTag}: Missing recipientGatewayNetworkId for server!`,
        );
      }

      const bridge = this.bridgeManager.getSATPExecutionLayer(
        networkId,
        ClaimFormat.DEFAULT,
      );

      if (!bridge) {
        throw new Error(`${fnTag}: No bridge found for network: ${networkId}`);
      }

      if (!serverSessionData.receiverAsset) {
        throw new Error(`${fnTag}: receiverAsset is undefined`);
      }

      const asset: FungibleAsset = protoToAsset(
        serverSessionData.receiverAsset,
        networkId,
      ) as FungibleAsset;

      // Unwrap asset (server)
      this.log.info(`${fnTag} Unwrapping Asset: ${asset}`);
      await bridge.unwrapAsset(asset);

      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: serverSessionData.id,
          stage: SATPStage[1],
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET_SERVER",
          status: "SUCCESS",
          details: "Server-side unwrap completed",
        }),
      );
    } catch (error) {
      this.log.error(`${fnTag} Error in server-side rollback: ${error}`);

      rollbackState.rollbackLogEntries.push(
        create(RollbackLogEntrySchema, {
          sessionId: serverSessionData.id,
          stage: SATPStage[1],
          timestamp: new Date().toISOString(),
          action: "UNWRAP_ASSET_SERVER",
          status: "FAILED",
          details: `Server-side unwrap failed: ${error}`,
        }),
      );
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
