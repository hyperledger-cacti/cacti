import {
  RecoverRequest,
  RecoverRequestSchema,
  RecoverSuccessRequest,
  RecoverSuccessRequestSchema,
  RollbackRequest,
  RollbackRequestSchema,
  RollbackState,
} from "../../../typescript/generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, sign } from "../../gateway-utils";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import { getCrashedStage } from "../session-utils";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { MonitorService } from "../../services/monitoring/monitor";

export class CrashRecoveryClientService {
  constructor(
    private readonly log: Logger,
    private readonly signer: JsObjectSigner,
    private readonly monitorService: MonitorService,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
    this.monitorService = monitorService;
  }

  public async createRecoverRequest(
    sessionData: SessionData,
  ): Promise<RecoverRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverRequest`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag} - Creating RecoverRequest for sessionId: ${sessionData.id}`,
        );

        const satpPhase = getCrashedStage(sessionData);
        const recoverMessage = create(RecoverRequestSchema, {
          sessionId: sessionData.id,
          messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
          satpPhase: String(satpPhase),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
          isBackup: false,
          newIdentityPublicKey: "",
          lastEntryTimestamp: BigInt(sessionData.lastMessageReceivedTimestamp),
          clientSignature: "",
        });

        const signature = bufArray2HexStr(
          sign(this.signer, safeStableStringify(recoverMessage)),
        );

        recoverMessage.clientSignature = signature;

        this.log.debug(`${fnTag} - RecoverRequest created:`, recoverMessage);

        return recoverMessage;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async createRecoverSuccessRequest(
    sessionData: SessionData,
  ): Promise<RecoverSuccessRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverSuccessRequest`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag} - Creating RecoverSuccessRequest for sessionId: ${sessionData.id}`,
        );

        const recoverSuccessMessage = create(RecoverSuccessRequestSchema, {
          sessionId: sessionData.id,
          messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
          // TODO: implement
          hashRecoverUpdateMessage: "",
          success: true,
          entriesChanged: [],
          clientSignature: "",
        });

        const signature = bufArray2HexStr(
          sign(this.signer, safeStableStringify(recoverSuccessMessage)),
        );

        recoverSuccessMessage.clientSignature = signature;

        this.log.debug(
          `${fnTag} - RecoverSuccessRequest created:`,
          recoverSuccessMessage,
        );

        return recoverSuccessMessage;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async createRollbackRequest(
    sessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<RollbackRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRollbackRequest`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag} - Creating RollbackRequest for sessionId: ${sessionData.id}`,
        );

        const rollbackMessage = create(RollbackRequestSchema, {
          sessionId: sessionData.id,
          messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
          success: rollbackState.status === "COMPLETED",
          actionsPerformed: rollbackState.rollbackLogEntries.map(
            (entry) => entry.action,
          ),
          proofs: [],
          clientSignature: "",
        });

        const signature = bufArray2HexStr(
          sign(this.signer, safeStableStringify(rollbackMessage)),
        );

        rollbackMessage.clientSignature = signature;

        this.log.debug(`${fnTag} - RollbackRequest created:`, rollbackMessage);

        return rollbackMessage;
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
