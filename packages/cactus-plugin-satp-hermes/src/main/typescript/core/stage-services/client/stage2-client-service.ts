import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  CommonSatp,
  LockAssertionClaim,
  LockAssertionClaimFormat,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LockAssertionRequestMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
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
    this.Log.debug(`${fnTag}, lockAssertionRequest...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.LOCK_ASSERT;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common!.sequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
    );

    //response was already verified in the check function so we can use ! to tell TS to trust us
    commonBody.sessionId = response.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

    const lockAssertionRequestMessage = new LockAssertionRequestMessage();
    lockAssertionRequestMessage.common = commonBody;

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
      lockAssertionRequestMessage.common.transferContextId =
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

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "lockAssertionRequest",
      operation: "lock",
      data: safeStableStringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending LockAssertionMessage...`);

    return lockAssertionRequestMessage;
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
    try {
      this.Log.info(`${fnTag}, Locking Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      session.verify(fnTag, SessionType.CLIENT);

      const sessionData = session.getClientSessionData();

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

      sessionData.lockAssertionClaim = new LockAssertionClaim();
      sessionData.lockAssertionClaim.receipt = await bridge.lockAsset(
        assetId,
        Number(amount),
      );
      sessionData.lockAssertionClaim.proof = await bridge.getProof(assetId);

      sessionData.lockAssertionClaimFormat = new LockAssertionClaimFormat();
      sessionData.lockAssertionClaimFormat.format = bridge.getReceiptFormat();

      sessionData.lockAssertionExpiration = BigInt(99999999999); //todo implement

      sessionData.lockAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.lockAssertionClaim.receipt),
      );
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      throw new FailedToProcessError(fnTag, "LockAsset");
    }
  }
}
