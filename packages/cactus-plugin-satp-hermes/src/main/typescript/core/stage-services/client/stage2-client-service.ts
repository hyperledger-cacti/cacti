import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  LockAssertionClaim,
  LockAssertionClaimFormat,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LockAssertionRequestMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  ISATPClientServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { ISATPServiceOptions } from "../satp-service";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import {
  HashMissMatch,
  MessageTypeMissMatch,
  MissingBridgeManager,
  MissingClientGatewayPubkey,
  MissingLockAssertionClaim,
  MissingLockAssertionClaimFormat,
  MissingLockAssertionExpiration,
  MissingSatpCommonBody,
  MissingServerGatewayPubkey,
  SATPVersionUnsupported,
  SequenceNumberMissMatch,
  SessionDataNotLoadedCorrectly,
  SessionUndefined,
  SignatureVerificationFailed,
  TransferContextIdMissMatch,
} from "../errors";

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
      throw MissingBridgeManager(`${this.getServiceIdentifier()}#constructor`);
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
      throw SessionUndefined(`${fnTag}`);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(`${fnTag}`);
    }

    const sessionData = session.getClientSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(`${fnTag}`);
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.LOCK_ASSERT;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common.sequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
    );

    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    const lockAssertionRequestMessage = new LockAssertionRequestMessage();
    lockAssertionRequestMessage.common = commonBody;

    if (sessionData.lockAssertionClaim == undefined) {
      throw MissingLockAssertionClaim(fnTag);
    }
    lockAssertionRequestMessage.lockAssertionClaim =
      sessionData.lockAssertionClaim;

    if (sessionData.lockAssertionClaimFormat == undefined) {
      throw MissingLockAssertionClaimFormat(fnTag);
    }
    lockAssertionRequestMessage.lockAssertionClaimFormat =
      sessionData.lockAssertionClaimFormat;
    if (sessionData.lockAssertionExpiration == undefined) {
      throw MissingLockAssertionExpiration(fnTag);
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
      sign(this.Signer, JSON.stringify(lockAssertionRequestMessage)),
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
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending LockAssertionMessage...`);

    return lockAssertionRequestMessage;
  }

  checkTransferCommenceResponseMessage(
    response: TransferCommenceResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkTransferCommenceResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCommenceResponseMessage...`);

    if (
      response.common == undefined ||
      response.common.version == undefined ||
      response.common.messageType == undefined ||
      response.common.sessionId == undefined ||
      response.common.sequenceNumber == undefined ||
      response.common.resourceUrl == undefined ||
      response.serverSignature == undefined ||
      response.common.clientGatewayPubkey == undefined ||
      response.common.serverGatewayPubkey == undefined ||
      response.common.hashPreviousMessage == undefined
    ) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (response.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(
        fnTag,
        response.common.version,
        SATP_VERSION,
      );
    }

    const sessionData = session.getClientSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (
      response.common.serverGatewayPubkey != sessionData.serverGatewayPubkey
    ) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      response.common.clientGatewayPubkey != sessionData.clientGatewayPubkey
    ) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(
        this.Signer,
        response,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (response.common.messageType != MessageType.TRANSFER_COMMENCE_RESPONSE) {
      throw MessageTypeMissMatch(
        fnTag,
        response.common.messageType.toString(),
        MessageType.TRANSFER_COMMENCE_RESPONSE.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber == undefined ||
      response.common.sequenceNumber !=
        sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        response.common.sequenceNumber,
        sessionData.lastSequenceNumber,
      );
    }

    if (
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_REQUEST)
    ) {
      throw HashMissMatch(
        fnTag,
        response.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_REQUEST),
      );
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        response.common.transferContextId,
        sessionData.transferContextId,
      );
    }

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
      const sessionData = session.getClientSessionData();
      if (sessionData == undefined) {
        throw SessionDataNotLoadedCorrectly(fnTag);
      }
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountFromOriginator;

      this.Log.debug(`${fnTag}, Lock Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.senderGatewayNetworkId,
      );

      sessionData.lockAssertionClaim = new LockAssertionClaim();
      sessionData.lockAssertionClaim.receipt = await bridge.lockAsset(
        assetId,
        Number(amount),
      );

      sessionData.lockAssertionClaimFormat = new LockAssertionClaimFormat();

      sessionData.lockAssertionExpiration = BigInt(99999999999); //todo implement

      sessionData.lockAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.lockAssertionClaim.receipt),
      );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Lock Asset ${error}`);
    }
  }
}
