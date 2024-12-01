import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  CommonSatpSchema,
  LockAssertionClaimFormatSchema,
  LockAssertionClaimSchema,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  LockAssertionRequestMessage,
  LockAssertionRequestMessageSchema,
} from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { SATPSession } from "../../../core/satp-session";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  SATPService,
  ISATPClientServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { ISATPServiceOptions } from "../satp-service";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  LockAssertionExpirationError,
  MissingBridgeManagerError,
  LockAssertionClaimError,
  LockAssertionClaimFormatError,
  SessionError,
  TokenIdMissingError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import { create } from "@bufbuild/protobuf";

export class Stage2ClientService extends SATPService {
  public static readonly SATP_STAGE = "2";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage2ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage2ClientService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
      dbLogger: ops.dbLogger,
    };
    super(commonOptions);

    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  async lockAssertionRequest(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): Promise<void | LockAssertionRequestMessage> {
    const stepTag = `lockAssertionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.LOCK_ASSERT];
    this.Log.debug(`${fnTag}, lockAssertionRequest...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
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
        LockAssertionRequestMessageSchema,
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

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
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
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async checkTransferCommenceResponseMessage(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCommenceResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCommenceResponseMessage...`);

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

    this.Log.info(`${fnTag}, TransferCommenceResponse passed all checks.`);
  }

  async lockAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.info(`${fnTag}, Locking Asset...`);
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${stepTag}`);
    this.dbLogger.storeProof({
      sessionID: sessionData.id,
      type: "lock-asset",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "lock-asset",
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, Locking Asset...`);
      const assetId = sessionData.senderAsset?.tokenId;
      const amount = sessionData.senderAsset?.amount;

      this.Log.debug(`${fnTag}, Lock Asset ID: ${assetId} amount: ${amount}`);

      if (assetId == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (amount == undefined) {
        throw new Error(`${fnTag}, Amount is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.senderGatewayNetworkId,
      );

      sessionData.lockAssertionClaim = create(LockAssertionClaimSchema, {});
      sessionData.lockAssertionClaim.receipt = await bridge.lockAsset(
        assetId,
        Number(amount),
      );
      sessionData.lockAssertionClaim.proof = await bridge.getProof(assetId);

      sessionData.lockAssertionClaimFormat = create(
        LockAssertionClaimFormatSchema,
        {
          format: bridge.getReceiptFormat(),
        },
      );

      sessionData.lockAssertionExpiration = BigInt(99999999999); //todo implement

      sessionData.lockAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.lockAssertionClaim.receipt),
      );

      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "lock-asset",
        operation: "done",
        data: safeStableStringify(sessionData.lockAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "lock-asset",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "LockAsset", error);
    }
  }
}
