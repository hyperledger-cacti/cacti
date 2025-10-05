import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionResponseSchema,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitPreparationResponse,
  CommitPreparationResponseSchema,
  TransferCompleteRequest,
  TransferCompleteResponse,
  TransferCompleteResponseSchema,
} from "../../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import {
  AssignmentAssertionClaimFormatSchema,
  AssignmentAssertionClaimSchema,
  ClaimFormat,
  CommonSatpSchema,
  MessageType,
  MintAssertionClaimFormatSchema,
  MintAssertionClaimSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { SATPSession } from "../../../core/satp-session";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  AssignmentAssertionClaimError,
  BurnAssertionClaimError,
  MintAssertionClaimError,
  MissingBridgeManagerError,
  SessionError,
} from "../../errors/satp-service-errors";
import {
  FailedToProcessError,
  SessionNotFoundError,
} from "../../errors/satp-handler-errors";
import { SATPInternalError } from "../../errors/satp-errors";
import { State } from "../../../generated/proto/cacti/satp/v02/session/session_pb";
import { create } from "@bufbuild/protobuf";
import { type BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { buildAndCheckAsset, SessionSide } from "../../satp-utils";

export class Stage3ServerService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPServerServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ServerService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
      dbLogger: ops.dbLogger,
      monitorService: ops.monitorService,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }
    this.claimFormat = ops.claimFormat || ClaimFormat.DEFAULT;
    this.bridgeManager = ops.bridgeManager;
  }

  async commitReadyResponse(
    request: CommitPreparationRequest,
    session: SATPSession,
  ): Promise<void | CommitPreparationResponse> {
    const stepTag = `commitReady()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.COMMIT_READY];
        this.Log.debug(`${fnTag}, commitReady...`);

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
            messageType: MessageType.COMMIT_READY,
            sequenceNumber: request.common!.sequenceNumber + BigInt(1),
            hashPreviousMessage: getMessageHash(
              sessionData,
              MessageType.COMMIT_PREPARE,
            ),
            sessionId: request.common!.sessionId,
            clientGatewayPubkey: sessionData.clientGatewayPubkey,
            serverGatewayPubkey: sessionData.serverGatewayPubkey,
            resourceUrl: sessionData.resourceUrl,
          });

          sessionData.lastSequenceNumber = commonBody.sequenceNumber;

          const commitReadyMessage = create(CommitPreparationResponseSchema, {
            common: commonBody,
          });

          if (sessionData.mintAssertionClaim == undefined) {
            throw new MintAssertionClaimError(fnTag);
          }

          commitReadyMessage.mintAssertionClaim =
            sessionData.mintAssertionClaim;
          commitReadyMessage.mintAssertionClaimFormat =
            sessionData.mintAssertionClaimFormat;

          if (sessionData.transferContextId != undefined) {
            commitReadyMessage.common!.transferContextId =
              sessionData.transferContextId;
          }

          if (sessionData.serverTransferNumber != undefined) {
            commitReadyMessage.serverTransferNumber =
              sessionData.serverTransferNumber;
          }

          const messageSignature = bufArray2HexStr(
            sign(this.Signer, safeStableStringify(commitReadyMessage)),
          );

          commitReadyMessage.serverSignature = messageSignature;

          saveSignature(
            sessionData,
            MessageType.COMMIT_READY,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.COMMIT_READY,
            getHash(commitReadyMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.COMMIT_READY,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, sending commitReadyMessage...`);

          return commitReadyMessage;
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

  async commitReadyErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<CommitPreparationResponse> {
    const fnTag = `${this.getServiceIdentifier()}#commitReadyErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(CommitPreparationResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.COMMIT_READY,
          error: true,
          errorCode: error.getSATPErrorType(),
        });

        if (!(error instanceof SessionNotFoundError) && session != undefined) {
          commonBody.sessionId = session.getServerSessionData().id;
        }
        errorResponse.common = commonBody;

        const messageSignature = bufArray2HexStr(
          sign(this.Signer, safeStableStringify(errorResponse)),
        );

        errorResponse.serverSignature = messageSignature;

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

  async commitFinalAcknowledgementReceiptResponse(
    request: CommitFinalAssertionRequest,
    session: SATPSession,
  ): Promise<void | CommitFinalAssertionResponse> {
    const stepTag = `commitFinalAcknowledgementReceiptResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.ACK_COMMIT_FINAL];
        this.Log.debug(
          `${fnTag}, commitFinalAcknowledgementReceiptResponse...`,
        );

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
            messageType: MessageType.ACK_COMMIT_FINAL,
            sequenceNumber: request.common!.sequenceNumber + BigInt(1),
            hashPreviousMessage: getMessageHash(
              sessionData,
              MessageType.COMMIT_FINAL,
            ),
            sessionId: request.common!.sessionId,
            clientGatewayPubkey: sessionData.clientGatewayPubkey,
            serverGatewayPubkey: sessionData.serverGatewayPubkey,
            resourceUrl: sessionData.resourceUrl,
          });

          sessionData.lastSequenceNumber =
            request.common!.sequenceNumber + BigInt(1);

          const commitFinalAcknowledgementReceiptResponseMessage = create(
            CommitFinalAssertionResponseSchema,
            {
              common: commonBody,
            },
          );

          if (sessionData.assignmentAssertionClaim == undefined) {
            throw new AssignmentAssertionClaimError(fnTag);
          }

          commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaim =
            sessionData.assignmentAssertionClaim;

          if (sessionData.assignmentAssertionClaimFormat != undefined) {
            commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaimFormat =
              sessionData.assignmentAssertionClaimFormat;
          }

          if (sessionData.transferContextId != undefined) {
            commitFinalAcknowledgementReceiptResponseMessage.common!.transferContextId =
              sessionData.transferContextId;
          }

          if (sessionData.serverTransferNumber != undefined) {
            commitFinalAcknowledgementReceiptResponseMessage.serverTransferNumber =
              sessionData.serverTransferNumber;
          }

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(
                commitFinalAcknowledgementReceiptResponseMessage,
              ),
            ),
          );

          commitFinalAcknowledgementReceiptResponseMessage.serverSignature =
            messageSignature;

          saveSignature(
            sessionData,
            MessageType.ACK_COMMIT_FINAL,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.ACK_COMMIT_FINAL,
            getHash(commitFinalAcknowledgementReceiptResponseMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.ACK_COMMIT_FINAL,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(
            `${fnTag}, sending commitFinalAcknowledgementReceiptResponseMessage...`,
          );

          return commitFinalAcknowledgementReceiptResponseMessage;
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

  async commitFinalAcknowledgementReceiptErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<CommitFinalAssertionResponse> {
    const fnTag = `${this.getServiceIdentifier()}#commitFinalAcknowledgementReceiptErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(CommitFinalAssertionResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.ACK_COMMIT_FINAL,
          error: true,
          errorCode: error.getSATPErrorType(),
        });

        if (!(error instanceof SessionNotFoundError) && session != undefined) {
          commonBody.sessionId = session.getServerSessionData().id;
        }
        errorResponse.common = commonBody;

        const messageSignature = bufArray2HexStr(
          sign(this.Signer, safeStableStringify(errorResponse)),
        );

        errorResponse.serverSignature = messageSignature;

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

  async checkCommitPreparationRequest(
    request: CommitPreparationRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitPreparationRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkCommitPreparationRequest...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);

        const sessionData = session.getServerSessionData();

        if (request.common == undefined) {
          commonBodyVerifier(
            fnTag,
            request.common,
            sessionData,
            MessageType.COMMIT_PREPARE,
          );
        }

        signatureVerifier(fnTag, this.Signer, request, sessionData);

        if (
          sessionData.clientTransferNumber != "" &&
          request.clientTransferNumber != sessionData.clientTransferNumber
        ) {
          // This does not throw an error because the clientTransferNumber is only meaningful to the client.
          this.Log.info(
            `${fnTag}, LockAssertionRequest clientTransferNumber does not match the one that was sent`,
          );
        }

        saveHash(sessionData, MessageType.COMMIT_PREPARE, getHash(request));

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_PREPARE,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, CommitPreparationRequest passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkCommitFinalAssertionRequest(
    request: CommitFinalAssertionRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitFinalAssertionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkCommitFinalAssertionRequest...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);

        const sessionData = session.getServerSessionData();

        if (request.common == undefined) {
          commonBodyVerifier(
            fnTag,
            request.common,
            sessionData,
            MessageType.COMMIT_FINAL,
          );
        }

        signatureVerifier(fnTag, this.Signer, request, sessionData);

        //todo check burn
        if (request.burnAssertionClaim == undefined) {
          throw new BurnAssertionClaimError(fnTag);
        }

        sessionData.burnAssertionClaim = request.burnAssertionClaim;

        if (request.burnAssertionClaimFormat != undefined) {
          this.Log.info(
            `${fnTag}, optional variable loaded: burnAssertionClaimFormat`,
          );
          sessionData.burnAssertionClaimFormat =
            request.burnAssertionClaimFormat;
        }

        if (
          sessionData.clientTransferNumber != undefined &&
          request.clientTransferNumber != sessionData.clientTransferNumber
        ) {
          // This does not throw an error because the clientTransferNumber is only meaningful to the client.
          this.Log.info(
            `${fnTag}, CommitFinalAssertionRequest clientTransferNumber does not match the one that was sent`,
          );
        }

        saveHash(sessionData, MessageType.COMMIT_FINAL, getHash(request));

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_FINAL,
          TimestampType.RECEIVED,
        );

        this.Log.info(
          `${fnTag}, CommitFinalAssertionRequest passed all checks.`,
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkTransferCompleteRequest(
    request: TransferCompleteRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCompleteRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkTransferCompleteRequest...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);

        const sessionData = session.getServerSessionData();

        if (request.common == undefined) {
          commonBodyVerifier(
            fnTag,
            request.common,
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE,
          );
        }

        signatureVerifier(fnTag, this.Signer, request, sessionData);

        if (
          sessionData.clientTransferNumber != undefined &&
          request.clientTransferNumber != sessionData.clientTransferNumber
        ) {
          // This does not throw an error because the clientTransferNumber is only meaningful to the client.
          this.Log.info(
            `${fnTag}, TransferCompleteRequest clientTransferNumber does not match the one that was sent`,
          );
        }
        this.Log.info(`${fnTag}, TransferCompleteRequest passed all checks.`);

        sessionData.state = State.COMPLETED;

        saveHash(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE,
          getHash(request),
        );

        saveTimestamp(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, TransferCompleteRequest passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async transferCompleteResponse(
    request: TransferCompleteRequest,
    session: SATPSession,
  ): Promise<TransferCompleteResponse> {
    const stepTag = `createTransferCompleteResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType =
          MessageType[MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE];
        this.Log.debug(`${fnTag}, createTransferCompleteResponse...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER, false, true);

        const sessionData = session.getServerSessionData();

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
            messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            sequenceNumber: request.common!.sequenceNumber + BigInt(1),
            hashPreviousMessage: getMessageHash(
              sessionData,
              MessageType.COMMIT_TRANSFER_COMPLETE,
            ),
            sessionId: request.common!.sessionId,
            clientGatewayPubkey: sessionData.clientGatewayPubkey,
            serverGatewayPubkey: sessionData.serverGatewayPubkey,
            resourceUrl: sessionData.resourceUrl,
          });

          sessionData.lastSequenceNumber =
            request.common!.sequenceNumber + BigInt(1);

          const transferCompleteResponseMessage = create(
            TransferCompleteResponseSchema,
            {
              common: commonBody,
            },
          );

          if (sessionData.transferContextId != undefined) {
            transferCompleteResponseMessage.common!.transferContextId =
              sessionData.transferContextId;
          }

          if (sessionData.serverTransferNumber != undefined) {
            transferCompleteResponseMessage.serverTransferNumber =
              sessionData.serverTransferNumber;
          }

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferCompleteResponseMessage),
            ),
          );

          transferCompleteResponseMessage.serverSignature = messageSignature;

          saveSignature(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            getHash(transferCompleteResponseMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, sending transferCompleteResponseMessage...`);

          return transferCompleteResponseMessage;
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

  async transferCompleteErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<TransferCompleteResponse> {
    const fnTag = `${this.getServiceIdentifier()}#transferCompleteErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const errorResponse = create(TransferCompleteResponseSchema, {});
        const commonBody = create(CommonSatpSchema, {
          messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
          error: true,
          errorCode: error.getSATPErrorType(),
        });

        if (!(error instanceof SessionNotFoundError) && session != undefined) {
          commonBody.sessionId = session.getServerSessionData().id;
        }
        errorResponse.common = commonBody;

        const messageSignature = bufArray2HexStr(
          sign(this.Signer, safeStableStringify(errorResponse)),
        );

        errorResponse.serverSignature = messageSignature;

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

  async mintAsset(session: SATPSession): Promise<void> {
    const stepTag = `mintAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);

        const sessionData = session.getServerSessionData();
        this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: "mint-asset",
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`exec-${stepTag}`);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "mint-asset",
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, Minting Asset...`);

          const tokenBuildData = buildAndCheckAsset(
            fnTag,
            stepTag,
            this.Log,
            sessionData,
            SessionSide.SERVER,
          );

          const bridge = this.bridgeManager.getSATPExecutionLayer(
            tokenBuildData.networkId,
            this.claimFormat,
          );

          sessionData.mintAssertionClaim = create(MintAssertionClaimSchema, {});

          const res = await bridge.mintAsset(tokenBuildData.token);

          sessionData.mintAssertionClaim.receipt = res.receipt;

          this.Log.debug(
            `${fnTag}, Mint Operation Receipt: ${sessionData.mintAssertionClaim.receipt}`,
          );

          sessionData.mintAssertionClaim.proof = res.proof;
          sessionData.mintAssertionClaimFormat = create(
            MintAssertionClaimFormatSchema,
            {
              format: this.claimFormat,
            },
          );

          sessionData.mintAssertionClaim.signature = bufArray2HexStr(
            sign(this.Signer, sessionData.mintAssertionClaim.receipt),
          );
          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "mint-asset",
            operation: "done",
            data: safeStableStringify(sessionData.mintAssertionClaim.proof),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, done-${fnTag}`);
        } catch (error) {
          this.logger.debug(`Crash in ${fnTag}`, error);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "mint-asset",
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw new FailedToProcessError(fnTag, "MintAsset", error);
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

  async assignAsset(session: SATPSession): Promise<void> {
    const stepTag = `assignAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.SERVER);
        const sessionData = session.getServerSessionData();
        this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: "assign-asset",
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`${fnTag}, Assigning Asset...`);
          this.Log.info(`exec-${stepTag}`);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "assign-asset",
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          const tokenBuildData = buildAndCheckAsset(
            fnTag,
            stepTag,
            this.Log,
            sessionData,
            SessionSide.SERVER,
          );

          const bridge = this.bridgeManager.getSATPExecutionLayer(
            tokenBuildData.networkId,
            this.claimFormat,
          );

          sessionData.assignmentAssertionClaim = create(
            AssignmentAssertionClaimSchema,
            {},
          );

          const res = await bridge.assignAsset(tokenBuildData.token);

          sessionData.assignmentAssertionClaim.receipt = res.receipt;

          this.Log.debug(
            `${fnTag}, Assign Operation Receipt: ${sessionData.assignmentAssertionClaim.receipt}`,
          );

          sessionData.assignmentAssertionClaim.proof = res.proof;
          sessionData.assignmentAssertionClaimFormat = create(
            AssignmentAssertionClaimFormatSchema,
            {
              format: this.claimFormat,
            },
          );
          sessionData.assignmentAssertionClaim.signature = bufArray2HexStr(
            sign(this.Signer, sessionData.assignmentAssertionClaim.receipt),
          );
          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "assign-asset",
            operation: "done",
            data: safeStableStringify(
              sessionData.assignmentAssertionClaim.proof,
            ),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, done-${fnTag}`);
        } catch (error) {
          this.logger.debug(`Crash in ${fnTag}`, error);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "assign-asset",
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw new FailedToProcessError(fnTag, "AssignAsset", error);
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
