import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { SATPSession } from "../../../core/satp-session";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  LockAssertionClaimError,
  LockAssertionClaimFormatError,
  LockAssertionExpirationError,
  SessionError,
} from "../../errors/satp-service-errors";
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
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ASSERTION_RECEIPT;
    commonBody.sequenceNumber = request.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.LOCK_ASSERT,
    );
    commonBody.sessionId = request.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

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
  ): Promise<void> {
    const stepTag = `checkLockAssertionRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkLockAssertionRequestMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    commonBodyVerifier(
      fnTag,
      request.common,
      sessionData,
      MessageType.LOCK_ASSERT,
    );

    signatureVerifier(fnTag, this.Signer, request, sessionData);

    if (request.lockAssertionClaim == undefined) {
      throw new LockAssertionClaimError(fnTag);
    }

    sessionData.lockAssertionClaim = request.lockAssertionClaim;

    if (request.lockAssertionClaimFormat == undefined) {
      throw new LockAssertionClaimFormatError(fnTag);
    }

    sessionData.lockAssertionClaimFormat = request.lockAssertionClaimFormat; //todo check if valid

    if (request.lockAssertionExpiration == BigInt(0)) {
      throw new LockAssertionExpirationError(fnTag);
    }

    sessionData.lockAssertionExpiration = request.lockAssertionExpiration; //todo check if expired

    if (
      sessionData.clientTransferNumber != "" &&
      request.clientTransferNumber != sessionData.clientTransferNumber
    ) {
      // This does not throw an error because the clientTransferNumber is only meaningful to the client.
      this.Log.info(
        `${fnTag}, LockAssertionRequest clientTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.LOCK_ASSERT, getHash(request));

    this.Log.info(`${fnTag}, LockAssertionRequest passed all checks.`);
  }
}
