import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SessionData } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { SATPSession } from "../../../core/satp-session";
import {
  HashMissMatch,
  MessageTypeMissMatch,
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
    };
    super(commonOptions);
  }

  async lockAssertionResponse(
    request: LockAssertionRequestMessage,
    session: SATPSession,
  ): Promise<void | LockAssertionReceiptMessage> {
    const stepTag = `lockAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, lockAssertionResponse...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ASSERTION_RECEIPT;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.LOCK_ASSERT,
    );
    commonBody.sessionId = request.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const lockAssertionReceiptMessage = new LockAssertionReceiptMessage();
    lockAssertionReceiptMessage.common = commonBody;

    if (sessionData.transferContextId != undefined) {
      lockAssertionReceiptMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.serverTransferNumber != undefined) {
      lockAssertionReceiptMessage.serverTransferNumber =
        sessionData.serverTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(lockAssertionReceiptMessage)),
    );

    lockAssertionReceiptMessage.serverSignature = messageSignature;

    saveSignature(sessionData, MessageType.ASSERTION_RECEIPT, messageSignature);

    saveHash(
      sessionData,
      MessageType.ASSERTION_RECEIPT,
      getHash(lockAssertionReceiptMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "lockAssertionResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending LockAssertionResponseMessage...`);

    return lockAssertionReceiptMessage;
  }

  async checkLockAssertionRequestMessage(
    request: LockAssertionRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const stepTag = `checkLockAssertionRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkLockAssertionRequestMessage...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (
      sessionData == undefined ||
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      request.clientSignature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined ||
      request.common.hashPreviousMessage == undefined
    ) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (request.common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (request.common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, request.common.serverGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (request.common.messageType != MessageType.LOCK_ASSERT) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.LOCK_ASSERT.toString(),
      );
    }

    if (
      request.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        request.common.sequenceNumber,
        sessionData.lastSequenceNumber,
      );
    }

    if (
      request.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_RESPONSE)
    ) {
      throw HashMissMatch(
        fnTag,
        request.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_RESPONSE),
      );
    }

    if (request.lockAssertionClaim == undefined) {
      throw MissingLockAssertionClaim(fnTag);
    }

    sessionData.lockAssertionClaim = request.lockAssertionClaim;

    if (request.lockAssertionClaimFormat == undefined) {
      throw MissingLockAssertionClaimFormat(fnTag);
    }

    sessionData.lockAssertionClaimFormat = request.lockAssertionClaimFormat; //todo check if valid

    if (request.lockAssertionExpiration == undefined) {
      throw MissingLockAssertionExpiration(fnTag);
    }

    sessionData.lockAssertionExpiration = request.lockAssertionExpiration; //todo check if expired

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        request.common.transferContextId,
        sessionData.transferContextId,
      );
    }

    if (
      sessionData.clientTransferNumber != undefined &&
      request.clientTransferNumber != sessionData.clientTransferNumber
    ) {
      // This does not throw an error because the clientTransferNumber is only meaningful to the client.
      this.Log.info(
        `${fnTag}, LockAssertionRequest clientTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.LOCK_ASSERT, getHash(request));

    this.Log.info(`${fnTag}, LockAssertionRequest passed all checks.`);
    return sessionData;
  }
}
