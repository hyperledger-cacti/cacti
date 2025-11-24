import { TransferCommenceResponse } from "../../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  ClaimFormat,
  CommonSatpSchema,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  LockAssertionRequest,
  LockAssertionRequestSchema,
} from "../../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { SATPSession } from "../../../core/satp-session";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  SATPService,
  ISATPClientServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { ISATPServiceOptions } from "../satp-service";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  LockAssertionExpirationError,
  MissingBridgeManagerError,
  LockAssertionClaimError,
  LockAssertionClaimFormatError,
  SessionError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import { create } from "@bufbuild/protobuf";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { buildAndCheckAsset, SessionSide } from "../../satp-utils";

export class Stage2ClientService extends SATPService {
  public static readonly SATP_STAGE = "2";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage2ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage2ClientService.SERVICE_TYPE,
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

  async lockAssertionRequest(
    response: TransferCommenceResponse,
    session: SATPSession,
  ): Promise<void | LockAssertionRequest> {
    const stepTag = `lockAssertionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.LOCK_ASSERT];
        this.Log.debug(`${fnTag}, lockAssertionRequest...`);

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
            version: sessionData.version,
            messageType: MessageType.LOCK_ASSERT,
            hashPreviousMessage: getMessageHash(
              sessionData,
              MessageType.TRANSFER_COMMENCE_RESPONSE,
            ),
            sessionId: response.common!.sessionId,
            clientGatewayPubkey: sessionData.clientGatewayPubkey,
            serverGatewayPubkey: sessionData.serverGatewayPubkey,
            resourceUrl: sessionData.resourceUrl,
          });

          sessionData.lastSequenceNumber = commonBody.sequenceNumber =
            response.common!.sequenceNumber + BigInt(1);

          const lockAssertionRequestMessage = create(
            LockAssertionRequestSchema,
            {
              common: commonBody,
            },
          );

          if (sessionData.lockAssertionClaim == undefined) {
            throw new LockAssertionClaimError(fnTag);
          }
          lockAssertionRequestMessage.lockAssertionClaim =
            sessionData.lockAssertionClaim;

          if (sessionData.lockAssertionClaimFormat == undefined) {
            throw new LockAssertionClaimFormatError(fnTag);
          }
          lockAssertionRequestMessage.lockAssertionClaimFormat =
            sessionData.lockAssertionClaimFormat;
          if (
            sessionData.lockAssertionExpiration == undefined ||
            sessionData.lockAssertionExpiration == BigInt(0)
          ) {
            throw new LockAssertionExpirationError(fnTag);
          }

          lockAssertionRequestMessage.lockAssertionExpiration =
            sessionData.lockAssertionExpiration;

          if (sessionData.transferContextId != undefined) {
            lockAssertionRequestMessage.common!.transferContextId =
              sessionData.transferContextId;
          }
          if (sessionData.clientTransferNumber != undefined) {
            lockAssertionRequestMessage.clientTransferNumber =
              sessionData.clientTransferNumber;
          }

          const messageSignature = bufArray2HexStr(
            sign(this.Signer, safeStableStringify(lockAssertionRequestMessage)),
          );

          lockAssertionRequestMessage.clientSignature = messageSignature;

          saveSignature(sessionData, MessageType.LOCK_ASSERT, messageSignature);

          saveHash(
            sessionData,
            MessageType.LOCK_ASSERT,
            getHash(lockAssertionRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.LOCK_ASSERT,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending LockAssertionMessage...`);

          return lockAssertionRequestMessage;
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
   * Validates the TransferCommenceResponse from Stage 1.
   * Note: This method validates a Stage 1 message but is implemented in Stage 2
   * because it's called at the start of the Stage 2 client workflow.
   */
  async checkTransferCommenceResponse(
    response: TransferCommenceResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCommenceResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkTransferCommenceResponse...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();

        commonBodyVerifier(
          fnTag,
          response.common,
          sessionData,
          MessageType.TRANSFER_COMMENCE_RESPONSE,
        );

        signatureVerifier(fnTag, this.Signer, response, sessionData);

        if (response.serverTransferNumber != undefined) {
          this.Log.info(
            `${fnTag}, Optional variable loaded: serverTransferNumber...`,
          );
          sessionData.serverTransferNumber = response.serverTransferNumber;
        }

        saveHash(
          sessionData,
          MessageType.TRANSFER_COMMENCE_RESPONSE,
          getHash(response),
        );

        saveTimestamp(
          sessionData,
          MessageType.TRANSFER_COMMENCE_RESPONSE,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, TransferCommenceResponse passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async lockAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.Log.info(`${fnTag}, Locking Asset...`);
        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);

        const sessionData = session.getClientSessionData();
        this.Log.info(`init-${stepTag}`);
        this.dbLogger.storeProof({
          sessionId: sessionData.id,
          type: "lock-asset",
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`exec-${stepTag}`);
          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "lock-asset",
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, Locking Asset...`);

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

          sessionData.lockAssertionClaim = create(LockAssertionClaimSchema, {});

          const res = await bridge.lockAsset(tokenBuildData.token);

          sessionData.lockAssertionClaim.receipt = res.receipt;

          this.Log.debug(
            `${fnTag}, Lock Operation Receipt: ${sessionData.lockAssertionClaim.receipt}`,
          );

          sessionData.lockAssertionClaim.proof = res.proof;

          sessionData.lockAssertionClaimFormat = create(
            LockAssertionClaimFormatSchema,
            {
              format: this.claimFormat,
            },
          );

          sessionData.lockAssertionExpiration = BigInt(99999999999); //todo implement

          sessionData.lockAssertionClaim.signature = bufArray2HexStr(
            sign(this.Signer, sessionData.lockAssertionClaim.receipt),
          );

          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "lock-asset",
            operation: "done",
            data: safeStableStringify(sessionData.lockAssertionClaim.proof),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, done-${fnTag}`);
        } catch (error) {
          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "lock-asset",
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw new FailedToProcessError(fnTag, "LockAsset", error);
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
