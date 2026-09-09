import {
  BurnAssertionClaimFormatSchema,
  BurnAssertionClaimSchema,
  ClaimFormat,
  CommonSatpSchema,
  MessageType,
  //TokenType,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitFinalAssertionRequestSchema,
  CommitPreparationRequest,
  CommitPreparationRequestSchema,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteRequestSchema,
  TransferCompleteResponse,
} from "../../../generated/proto/cacti/satp/v13/service/stage_3_pb";
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
  ISATPClientServiceOptions,
  ISATPServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { SATPSession } from "../../satp-session";
import { State } from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import { LockAssertionResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_2_pb";
import {
  verifyCommitFinalAssertionResponseMessage,
  verifyCommitPreparationResponseMessage,
  verifyLockAssertionResponseMessage,
  verifyTransferCompleteResponseMessage,
} from "../verifier/stage-3-client-service-verifications";
import {
  BurnAssertionClaimError,
  MissingBridgeManagerError,
  SessionError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import { create } from "@bufbuild/protobuf";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { buildAndCheckAsset, SessionSide } from "../../satp-utils";

export class Stage3ClientService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ClientService.SERVICE_TYPE,
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

  async commitPreparation(
    response: LockAssertionResponse,
    session: SATPSession,
  ): Promise<void | CommitPreparationRequest> {
    const stepTag = `commitPreparation()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.COMMIT_PREPARE];
        this.Log.debug(`${fnTag}, CommitPreparation...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();
        this.Log.info(`init-${messageType}`);
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
            version: SATP_VERSION,
            messageType: MessageType.COMMIT_PREPARE,
            sessionId: response.common!.sessionId,
            transferContextId: sessionData.transferContextId ?? "",
          });

          sessionData.lastSequenceNumber =
            sessionData.lastSequenceNumber + BigInt(1);

          const commitPreparationRequestMessage = create(
            CommitPreparationRequestSchema,
            {
              common: commonBody,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.ASSERTION_RECEIPT,
              ),
            },
          );

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(commitPreparationRequestMessage),
            ),
          );

          // v13: per-message signatures removed; JWS wrapping used instead
          saveSignature(
            sessionData,
            MessageType.COMMIT_PREPARE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.COMMIT_PREPARE,
            getHash(commitPreparationRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.COMMIT_PREPARE,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending CommitPreparationMessage...`);

          return commitPreparationRequestMessage;
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

  async commitFinalAssertion(
    response: CommitPreparationResponse,
    session: SATPSession,
  ): Promise<void | CommitFinalAssertionRequest> {
    const stepTag = `commitFinalAssertion()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.COMMIT_FINAL];
        this.Log.debug(`${fnTag}, CommitFinalAssertion...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();
        this.Log.info(`init-${messageType}`);
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
            version: SATP_VERSION,
            messageType: MessageType.COMMIT_FINAL,
            sessionId: response.common!.sessionId,
            transferContextId: sessionData.transferContextId ?? "",
          });
          sessionData.lastSequenceNumber =
            sessionData.lastSequenceNumber + BigInt(1);

          const commitFinalAssertionRequestMessage = create(
            CommitFinalAssertionRequestSchema,
            {
              common: commonBody,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.COMMIT_READY,
              ),
            },
          );

          if (sessionData.burnAssertionClaim == undefined) {
            throw new BurnAssertionClaimError(fnTag);
          }

          commitFinalAssertionRequestMessage.burnAssertionClaim =
            sessionData.burnAssertionClaim;

          if (sessionData.burnAssertionClaimFormat != undefined) {
            commitFinalAssertionRequestMessage.burnAssertionClaimFormat =
              sessionData.burnAssertionClaimFormat;
          }

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(commitFinalAssertionRequestMessage),
            ),
          );

          // v13: per-message signatures removed; JWS wrapping used instead
          saveSignature(
            sessionData,
            MessageType.COMMIT_FINAL,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.COMMIT_FINAL,
            getHash(commitFinalAssertionRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.COMMIT_FINAL,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending CommitFinalAssertionMessage...`);

          return commitFinalAssertionRequestMessage;
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

  async transferComplete(
    response: CommitFinalAssertionResponse,
    session: SATPSession,
  ): Promise<void | TransferCompleteRequest> {
    const stepTag = `transferComplete()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.COMMIT_TRANSFER_COMPLETE];
        this.Log.debug(`${fnTag}, TransferComplete...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();
        this.Log.info(`init-${messageType}`);
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
            version: SATP_VERSION,
            messageType: MessageType.COMMIT_TRANSFER_COMPLETE,
            sessionId: response.common!.sessionId,
            transferContextId: sessionData.transferContextId ?? "",
          });

          sessionData.lastSequenceNumber =
            sessionData.lastSequenceNumber + BigInt(1);

          const transferCompleteRequestMessage = create(
            TransferCompleteRequestSchema,
            {
              common: commonBody,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.ACK_COMMIT_FINAL,
              ),
            },
          );

          transferCompleteRequestMessage.hashTransferCommence = getMessageHash(
            sessionData,
            MessageType.TRANSFER_COMMENCE_REQUEST,
          );

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferCompleteRequestMessage),
            ),
          );

          // v13: per-message signatures removed; JWS wrapping used instead
          saveSignature(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE,
            getHash(transferCompleteRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.COMMIT_TRANSFER_COMPLETE,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending TransferCompleteMessage...`);

          return transferCompleteRequestMessage;
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

  /**
   * Validates the LockAssertionResponse from Stage 2.
   * Note: This method validates a Stage 2 message but is implemented in Stage 3
   * because it's called at the start of the Stage 3 client workflow.
   */
  async checkLockAssertionResponse(
    response: LockAssertionResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkLockAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, CheckLockAssertionResponse...`);

        verifyLockAssertionResponseMessage(
          fnTag,
          this.Signer,
          response,
          session,
        );

        const sessionData = session.getClientSessionData();
        saveHash(sessionData, MessageType.ASSERTION_RECEIPT, getHash(response));
        saveTimestamp(
          sessionData,
          MessageType.ASSERTION_RECEIPT,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, LockAssertionResponse passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkCommitPreparationResponse(
    response: CommitPreparationResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitPreparationResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, CommitPreparationResponse...`);

        verifyCommitPreparationResponseMessage(
          fnTag,
          this.Signer,
          response,
          session,
          this.Log,
        );

        const sessionData = session.getClientSessionData();
        if (response.mintAssertionClaimFormat != undefined) {
          sessionData.mintAssertionClaimFormat =
            response.mintAssertionClaimFormat;
        }
        sessionData.mintAssertionClaim = response.mintAssertionClaim!;
        saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));
        saveTimestamp(
          sessionData,
          MessageType.COMMIT_READY,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, CommitPreparationResponse passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkCommitFinalAssertionResponse(
    response: CommitFinalAssertionResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitFinalAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, CommitFinalAcknowledgementReceipt...`);

        verifyCommitFinalAssertionResponseMessage(
          fnTag,
          this.Signer,
          response,
          session,
          this.Log,
        );

        const sessionData = session.getClientSessionData();
        sessionData.assignmentAssertionClaim =
          response.assignmentAssertionClaim!;
        if (response.assignmentAssertionClaimFormat != undefined) {
          sessionData.assignmentAssertionClaimFormat =
            response.assignmentAssertionClaimFormat;
        }
        saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(response));
        saveTimestamp(
          sessionData,
          MessageType.ACK_COMMIT_FINAL,
          TimestampType.RECEIVED,
        );

        this.Log.info(
          `${fnTag}, CommitFinalAssertionResponse passed all checks.`,
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

  async checkTransferCompleteResponse(
    response: TransferCompleteResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCompleteResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, TransferComplete...`);

        verifyTransferCompleteResponseMessage(
          fnTag,
          this.Signer,
          response,
          session,
        );

        const sessionData = session.getClientSessionData();
        sessionData.state = State.COMPLETED;
        saveHash(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
          getHash(response),
        );
        saveTimestamp(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, TransferCompleteResponse passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async burnAsset(session: SATPSession): Promise<void> {
    const stepTag = `burnAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();
        this.Log.info(`init-${stepTag}`);
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: "burn-asset",
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        this.Log.debug(`${fnTag}, Burning Asset...`);
        try {
          this.Log.info(`exec-${stepTag}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "burn-asset",
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          const tokenBuildData = buildAndCheckAsset(
            fnTag,
            stepTag,
            this.Log,
            sessionData,
            SessionSide.CLIENT,
          );

          const bridge = this.bridgeManager.getSATPExecutionLayer(
            tokenBuildData.networkId,
            this.claimFormat,
          );

          sessionData.burnAssertionClaim = create(BurnAssertionClaimSchema, {});

          const res = await bridge.burnAsset(tokenBuildData.token);

          sessionData.burnAssertionClaim.receipt = res.receipt;

          this.Log.debug(
            `${fnTag}, Burn Operation Receipt: ${sessionData.burnAssertionClaim.receipt}`,
          );

          sessionData.burnAssertionClaim.proof = res.proof;

          sessionData.burnAssertionClaimFormat = create(
            BurnAssertionClaimFormatSchema,
            {
              format: this.claimFormat,
            },
          );

          sessionData.burnAssertionClaim.signature = bufArray2HexStr(
            sign(this.Signer, sessionData.burnAssertionClaim.receipt),
          );
          await this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "burn-asset",
            operation: "done",
            data: safeStableStringify(sessionData.burnAssertionClaim.proof),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, done-${fnTag}`);
        } catch (error) {
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "burn-asset",
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw new FailedToProcessError(fnTag, "BurnAsset", error);
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
