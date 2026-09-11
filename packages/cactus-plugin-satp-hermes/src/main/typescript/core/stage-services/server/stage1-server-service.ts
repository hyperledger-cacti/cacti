import {
  TransferCommenceResponse,
  TransferCommenceRequest,
  TransferProposalRequest,
  TransferProposalResponse,
  TransferProposalResponseSchema,
  TransferCommenceResponseSchema,
} from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import {
  MessageType,
  CommonSatpSchema,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
import {
  TimestampType,
  getMessageHash,
  getMessageTimestamp,
  saveHash,
  saveSignature,
  saveTimestamp,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import {
  verifyTransferProposalRequestMessage,
  verifyTransferProposalRequestSignature,
  verifyTransferCommenceRequestMessage,
  verifyTransferCommenceResponse,
  verifyTransferProposalResponse,
} from "../verifier/stage-1-server-service-verifications";
import { SATPInternalError } from "../../errors/satp-errors";
import { SessionNotFoundError } from "../../errors/satp-handler-errors";
import {
  State,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import { create } from "@bufbuild/protobuf";
import { NetworkId } from "../../../public-api";
import { context, SpanStatusCode } from "@opentelemetry/api";
export class Stage1ServerService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPServerServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage1ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage1ServerService.SERVICE_TYPE,
      dbLogger: ops.dbLogger,
      monitorService: ops.monitorService,
    };
    super(commonOptions);
  }

  async transferProposalResponse(
    request: TransferProposalRequest,
    session: SATPSession,
  ): Promise<void | TransferProposalResponse> {
    const stepTag = `transferProposalResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.INIT_RECEIPT];
        this.Log.debug(`${fnTag}, transferProposalResponse...`);

        verifyTransferProposalResponse(fnTag, session);
        const sessionData = session.getServerSessionData();
        sessionData.lastSequenceNumber += BigInt(1);

        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        // persist the signature-verified wrap-assertion claim so it stays
        // provable for dispute resolution and audit after transport ends
        // TODO consider persisting in separate DB more suitable for audits/long term storage
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: MessageType[MessageType.TRANSFER_COMMENCE_RESPONSE],
          operation: "claim-verified",
          data: safeStableStringify(request.transferInitClaims) ?? "",
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          sessionData.sourceLedgerAssetId =
            request.transferInitClaims!.verifiedOriginatorEntityId;
          sessionData.recipientLedgerAssetId =
            request.transferInitClaims!.verifiedBeneficiaryEntityId; // todo shouldn't be the server to create this id?

          sessionData.hashTransferInitClaims = getHash(
            request.transferInitClaims,
          );

          const commonBody = create(CommonSatpSchema, {
            version: sessionData.version,
            sessionId: sessionData.id,
            transferContextId: sessionData.transferContextId,
          });

          const transferProposalReceiptMessage = create(
            TransferProposalResponseSchema,
            {},
          );
          if (sessionData.state == State.REJECTED) {
            transferProposalReceiptMessage.common = commonBody;
            commonBody.messageType = MessageType.INIT_REJECT;
            transferProposalReceiptMessage.timestamp = getMessageTimestamp(
              sessionData,
              MessageType.INIT_REJECT,
              TimestampType.RECEIVED,
            );
          } else if (sessionData.state == State.CONDITIONAL_REJECTED) {
            throw new Error("Not Implemented");
          } else {
            sessionData.state = State.ONGOING;
            transferProposalReceiptMessage.common = commonBody;
            transferProposalReceiptMessage.hashTransferInitClaims =
              sessionData.hashTransferInitClaims;
            commonBody.messageType = MessageType.INIT_RECEIPT;
            transferProposalReceiptMessage.timestamp = getMessageTimestamp(
              sessionData,
              MessageType.INIT_PROPOSAL,
              TimestampType.RECEIVED,
            );
          }

          transferProposalReceiptMessage.hashPrevMessage = getMessageHash(
            sessionData,
            MessageType.INIT_PROPOSAL,
          );

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferProposalReceiptMessage),
            ),
          );

          saveSignature(sessionData, commonBody.messageType, messageSignature);

          saveHash(
            sessionData,
            commonBody.messageType,
            getHash(transferProposalReceiptMessage),
          );

          saveTimestamp(
            sessionData,
            commonBody.messageType,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, sending TransferProposalResponseMessage...`);

          return transferProposalReceiptMessage;
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

  async transferProposalErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<TransferProposalResponse> {
    const fnTag = `${this.getServiceIdentifier()}#transferProposalErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(TransferProposalResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.PRE_INIT_RECEIPT,
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

  async transferCommenceErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<TransferCommenceResponse> {
    const fnTag = `${this.getServiceIdentifier()}#transferCommenceErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(TransferCommenceResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.TRANSFER_COMMENCE_RESPONSE,
        });

        if (!(error instanceof SessionNotFoundError) && session != undefined) {
          commonBody.sessionId = session.getServerSessionData().id;
        }
        errorResponse.common = commonBody;

        // v13: per-message signatures removed; JWS wrapping used instead
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

  async transferCommenceResponse(
    request: TransferCommenceRequest,
    session: SATPSession,
  ): Promise<void | TransferCommenceResponse> {
    const stepTag = `transferCommenceResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.TRANSFER_COMMENCE_RESPONSE];
        this.Log.debug(`${fnTag}, transferCommenceResponse...`);

        verifyTransferCommenceResponse(fnTag, session);
        const sessionData = session.getServerSessionData();
        sessionData.lastSequenceNumber += BigInt(1);
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          const commonBody = create(CommonSatpSchema, {
            version: sessionData.version,
            sessionId: sessionData.id,
            transferContextId: sessionData.transferContextId,
            messageType: MessageType.TRANSFER_COMMENCE_RESPONSE,
          });
          const transferCommenceResponseMessage = create(
            TransferCommenceResponseSchema,
            {
              common: commonBody,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.TRANSFER_COMMENCE_REQUEST,
              ),
            },
          );

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferCommenceResponseMessage),
            ),
          );

          // v13: per-message signatures removed; JWS wrapping used instead
          saveSignature(
            sessionData,
            MessageType.TRANSFER_COMMENCE_RESPONSE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.TRANSFER_COMMENCE_RESPONSE,
            getHash(transferCommenceResponseMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.TRANSFER_COMMENCE_RESPONSE,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending TransferCommenceResponseMessage...`);

          return transferCommenceResponseMessage;
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

  async checkTransferProposalRequestMessage(
    request: TransferProposalRequest,
    session: SATPSession,
    supportedDLTs: NetworkId[],
  ): Promise<void> {
    const stepTag = `checkTransferProposalRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkTransferProposalRequestMessage...`);

        const rejected = verifyTransferProposalRequestMessage(
          fnTag,
          request,
          session,
          supportedDLTs,
          this.Log,
        );

        const sessionData = session.getServerSessionData();

        if (rejected) {
          sessionData.state = State.REJECTED;
          return;
        }

        this.#populateSessionFromProposal(sessionData, request);

        verifyTransferProposalRequestSignature(
          fnTag,
          this.Signer,
          request,
          session,
        );

        saveHash(sessionData, MessageType.INIT_PROPOSAL, getHash(request));
        saveTimestamp(
          sessionData,
          MessageType.INIT_PROPOSAL,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, TransferProposalRequest passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  #populateSessionFromProposal(
    sessionData: SessionData,
    request: TransferProposalRequest,
  ): void {
    sessionData.version = request.common!.version;
    sessionData.digitalAssetId = request.transferInitClaims!.digitalAssetId;
    sessionData.senderGatewayNetworkId =
      request.transferInitClaims!.senderGatewayNetworkId;
    sessionData.recipientGatewayNetworkId =
      request.transferInitClaims!.recipientGatewayNetworkId;
    sessionData.clientGatewayPubkey =
      request.transferInitClaims!.senderGatewaySignaturePublicKey;
    sessionData.serverGatewayPubkey =
      request.transferInitClaims!.receiverGatewaySignaturePublicKey;
    sessionData.receiverGatewayOwnerId =
      request.transferInitClaims!.receiverGatewayOwnerId;
    sessionData.senderGatewayOwnerId =
      request.transferInitClaims!.senderGatewayOwnerId;
    sessionData.signatureAlgorithm =
      request.networkCapabilities!.gatewayDefaultSignatureAlgorithm;
    sessionData.lockType = request.networkCapabilities!.networkLockType;
    sessionData.lockExpirationTime =
      request.networkCapabilities!.networkLockExpirationTime;
    sessionData.gatewayTlsScheme =
      request.networkCapabilities!.gatewayTlsScheme;
  }

  async checkTransferCommenceRequestMessage(
    request: TransferCommenceRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCommenceRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        verifyTransferCommenceRequestMessage(
          fnTag,
          this.Signer,
          request,
          session,
        );

        const sessionData = session.getServerSessionData();
        saveHash(
          sessionData,
          MessageType.TRANSFER_COMMENCE_REQUEST,
          getHash(request),
        );
        saveTimestamp(
          sessionData,
          MessageType.TRANSFER_COMMENCE_REQUEST,
          TimestampType.RECEIVED,
        );
        sessionData.state = State.ONGOING;

        this.Log.info(`${fnTag}, TransferCommenceRequest passed all checks.`);
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
