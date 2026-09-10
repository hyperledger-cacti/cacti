import {
  LockAssertionResponse,
  LockAssertionResponseSchema,
  LockAssertionRequest,
} from "../../../generated/proto/cacti/satp/v13/service/stage_2_pb";
import {
  CommonSatpSchema,
  MessageType,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPSession } from "../../../core/satp-session";
import { verifyLockAssertionRequestMessage } from "../verifier/stage-2-server-service-verifications";
import { SessionError } from "../../errors/satp-service-errors";
import { SATPInternalError } from "../../errors/satp-errors";
import { SessionNotFoundError } from "../../errors/satp-handler-errors";
import { create } from "@bufbuild/protobuf";
import { context, SpanStatusCode } from "@opentelemetry/api";
export class Stage2ServerService extends SATPService {
  public static readonly SATP_STAGE = "2";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPServerServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage2ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage2ServerService.SERVICE_TYPE,
      dbLogger: ops.dbLogger,
      monitorService: ops.monitorService,
    };
    super(commonOptions);
  }

  async lockAssertionResponse(
    request: LockAssertionRequest,
    session: SATPSession,
  ): Promise<void | LockAssertionResponse> {
    const stepTag = `lockAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.ASSERTION_RECEIPT];
        this.Log.debug(`${fnTag}, lockAssertionResponse...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);

        const sessionData = session.getServerSessionData();
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          const commonBody = create(CommonSatpSchema, {
            version: sessionData.version,
            messageType: MessageType.ASSERTION_RECEIPT,
            sessionId: request.common!.sessionId,
            transferContextId: sessionData.transferContextId ?? "",
          });

          sessionData.lastSequenceNumber =
            sessionData.lastSequenceNumber + BigInt(1);

          const lockAssertionReceiptMessage = create(
            LockAssertionResponseSchema,
            {
              common: commonBody,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.LOCK_ASSERT,
              ),
            },
          );

          const messageSignature = bufArray2HexStr(
            sign(this.Signer, safeStableStringify(lockAssertionReceiptMessage)),
          );

          // v13: per-message signatures removed; JWS wrapping used instead
          saveSignature(
            sessionData,
            MessageType.ASSERTION_RECEIPT,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.ASSERTION_RECEIPT,
            getHash(lockAssertionReceiptMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.ASSERTION_RECEIPT,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, sending LockAssertionResponse...`);

          return lockAssertionReceiptMessage;
        } catch (error) {
          this.Log.error(`fail-${messageType}`, error);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw error;
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

  async lockAssertionErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<LockAssertionResponse> {
    const fnTag = `${this.getServiceIdentifier()}#lockAssertionErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(LockAssertionResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.ASSERTION_RECEIPT,
        });

        if (!(error instanceof SessionNotFoundError) && session != undefined) {
          commonBody.sessionId = session.getServerSessionData().id;
        }
        errorResponse.common = commonBody;

        return errorResponse;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkLockAssertionRequest(
    request: LockAssertionRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkLockAssertionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.Log.debug(`${fnTag}, checkLockAssertionRequest...`);

        verifyLockAssertionRequestMessage(fnTag, this.Signer, request, session);

        const sessionData = session.getServerSessionData();

        // persist the signature-verified lock-assertion claim so it stays
        // provable for dispute resolution and audit after transport ends
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: MessageType[MessageType.LOCK_ASSERT],
          operation: "claim-verified",
          data: safeStableStringify(request.lockAssertionClaim) ?? "",
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        sessionData.lockAssertionClaim = request.lockAssertionClaim!;
        sessionData.lockAssertionClaimFormat =
          request.lockAssertionClaimFormat!;
        sessionData.lockAssertionExpiration = request.lockAssertionExpiration;
        saveHash(sessionData, MessageType.LOCK_ASSERT, getHash(request));
        saveTimestamp(
          sessionData,
          MessageType.LOCK_ASSERT,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, LockAssertionRequest passed all checks.`);
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
