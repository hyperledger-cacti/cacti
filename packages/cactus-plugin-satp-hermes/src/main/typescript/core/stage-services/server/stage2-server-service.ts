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
export class Stage2ServerService extends SATPService {
  public static readonly SATP_STAGE = "2";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;

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

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.LOCK_ASSERT, getHash(request));

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

    lockAssertionReceiptMessage.common.signature = messageSignature;

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

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined ||
      request.common.hashPreviousMessage == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(`${fnTag}, session data was not load correctly`);
    }

    if (request.common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
      throw new Error(
        `${fnTag}, LockAssertionRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (request.common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
      throw new Error(
        `${fnTag}, LockAssertionRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    if (
      !verifySignature(
        this.Signer,
        request.common,
        request.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, LockAssertionRequest message signature verification failed`,
      );
    }

    if (request.common.messageType != MessageType.LOCK_ASSERT) {
      throw new Error(`${fnTag}, wrong message type for LockAssertionRequest`);
    }

    if (
      request.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw new Error(
        `${fnTag}, LockAssertionRequest Message sequence number is wrong`,
      );
    }

    if (
      request.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_RESPONSE)
    ) {
      throw new Error(
        `${fnTag}, LockAssertionRequest previous message hash does not match the one that was sent`,
      );
    }

    if (request.lockAssertionClaim == undefined) {
      throw new Error(
        `${fnTag}, LockAssertionRequest lockAssertionClaim is missing`,
      );
    }

    sessionData.lockAssertionClaim = request.lockAssertionClaim;

    if (request.lockAssertionClaimFormat == undefined) {
      throw new Error(
        `${fnTag},  LockAssertionRequest lockAssertionFormat is missing`,
      );
    }

    sessionData.lockAssertionClaimFormat = request.lockAssertionClaimFormat;

    if (request.lockAssertionExpiration == undefined) {
      throw new Error(
        `${fnTag}, LockAssertionRequest lockAssertionExpiration is missing`,
      );
    }

    sessionData.lockAssertionExpiration = request.lockAssertionExpiration; //todo check if expired

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(
        `${fnTag}, LockAssertionRequest transferContextId does not match the one that was sent`,
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

    this.Log.info(`${fnTag}, LockAssertionRequest passed all checks.`);
    return sessionData;
  }
}
