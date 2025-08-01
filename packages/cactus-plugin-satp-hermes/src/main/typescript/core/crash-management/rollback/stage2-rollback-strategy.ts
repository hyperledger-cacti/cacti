import type { SATPLogger as Logger } from "../../satp-logger";
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
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { protoToAsset } from "../../stage-services/service-utils";
import { FungibleAsset } from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { MonitorService } from "../../../services/monitoring/monitor";

export class Stage2RollbackStrategy implements RollbackStrategy {
  private log: Logger;
  private bridgeManager: BridgeManagerClientInterface;
  private readonly monitorService: MonitorService;

  constructor(
    bridgesManager: BridgeManagerClientInterface,
    log: Logger,
    monitorService: MonitorService,
  ) {
    this.log = log;
    this.bridgeManager = bridgesManager;
    this.monitorService = monitorService;
  }

  public async execute(
    session: SATPSession,
    role: Type,
  ): Promise<RollbackState> {
    const fnTag = "Stage2RollbackStrategy#execute";
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.info(`${fnTag} Executing rollback for Stage 2`);

        if (!session) {
          throw new Error(
            `${fnTag}, session data is not correctly initialized!`,
          );
        }

        const rollbackState = create(RollbackStateSchema, {
          sessionId: session.getSessionId(),
          currentStage: SATPStage[3],
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

        rollbackState.status = rollbackState.rollbackLogEntries.some(
          (entry) => entry.status === "FAILED",
        )
          ? "FAILED"
          : "COMPLETED";

        this.log.info(
          `${fnTag} Rollback of ${SATPStage[3]} completed with status: ${rollbackState.status}`,
        );
        return rollbackState;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private async handleClientSideRollback(
    clientSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage2RollbackStrategy#handleClientSideRollback";
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, async () => {
      try {
        try {
          const networkId = {
            id: clientSessionData.senderGatewayNetworkId,
            ledgerType: clientSessionData.senderGatewayNetworkId as LedgerType,
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

          this.log.info(`${fnTag} Unlocking Asset: ${asset}`);
          await bridge.unlockAsset(asset);

          rollbackState.rollbackLogEntries.push(
            create(RollbackLogEntrySchema, {
              sessionId: clientSessionData.id,
              stage: SATPStage[3],
              timestamp: new Date().toISOString(),
              action: "UNLOCK_ASSET_CLIENT",
              status: "SUCCESS",
              details: "Client-side asset unlock completed",
            }),
          );
        } catch (error) {
          this.log.error(`${fnTag} Error in client-side rollback: ${error}`);
          rollbackState.rollbackLogEntries.push(
            create(RollbackLogEntrySchema, {
              sessionId: clientSessionData.id,
              stage: SATPStage[3],
              timestamp: new Date().toISOString(),
              action: "UNLOCK_ASSET_CLIENT",
              status: "FAILED",
              details: `Client-side rollback failed: ${error}`,
            }),
          );
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private async handleServerSideRollback(
    serverSessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<void> {
    const fnTag = "Stage2RollbackStrategy#handleServerSideRollback";
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        try {
          const network = serverSessionData.recipientGatewayNetworkId;
          if (!network) {
            throw new Error(
              `${fnTag}: Missing recipientGatewayNetworkId for server!`,
            );
          }

          this.log.info(`${fnTag} No action required for server-side rollback`);
          rollbackState.rollbackLogEntries.push(
            create(RollbackLogEntrySchema, {
              sessionId: serverSessionData.id,
              stage: SATPStage[3],
              timestamp: new Date().toISOString(),
              action: "NO_ACTION_REQUIRED",
              status: "SUCCESS",
              details: "Server-side rollback not needed for Stage 2",
            }),
          );
        } catch (error) {
          this.log.error(`${fnTag} Error in server-side rollback: ${error}`);
          rollbackState.rollbackLogEntries.push(
            create(RollbackLogEntrySchema, {
              sessionId: serverSessionData.id,
              stage: SATPStage[3],
              timestamp: new Date().toISOString(),
              action: "NO_ACTION_REQUIRED",
              status: "FAILED",
              details: `Server-side rollback failed: ${error}`,
            }),
          );
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async cleanup(
    session: SATPSession,
    state: RollbackState,
  ): Promise<RollbackState> {
    const fnTag = "Stage2RollbackStrategy#cleanup";
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.info(`${fnTag} Cleaning up after Stage 2 rollback`);

        if (!session) {
          this.log.error(`${fnTag} Session not found`);
          return state;
        }

        try {
          // TODO: Implement Stage 2 specific cleanup logic

          // TODO: Update other state properties as needed

          return state;
        } catch (error) {
          this.log.error(`${fnTag} Cleanup failed: ${error}`);
          return state;
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
