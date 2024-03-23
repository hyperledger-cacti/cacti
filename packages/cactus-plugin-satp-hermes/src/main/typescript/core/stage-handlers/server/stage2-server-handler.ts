import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  LockAssertionReceiptMessage,
  LockAssertionRequestMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATPGateway } from "../../../gateway-refactor";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  Stage2Hashes,
  Stage2Signatures,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SHA256 } from "crypto-js";
import {
  bufArray2HexStr,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";

export class Stage2ServerHandler {
  public static readonly CLASS_NAME = "Stage2Handler-Server";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = Stage2ServerHandler.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return Stage2ServerHandler.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async lockAssertionResponse(
    request: LockAssertionRequestMessage,
    gateway: SATPGateway,
  ): Promise<void | LockAssertionReceiptMessage> {
    const fnTag = `${this.className}#lockAssertionResponse()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = gateway.getSession(request.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }
    if (
      sessionData == undefined ||
      sessionData.hashes == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    sessionData.hashes.stage2 = new Stage2Hashes();
    sessionData.hashes.stage2.lockAssertionRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ASSERTION_RECEIPT;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage2.lockAssertionRequestMessageHash;
    commonBody.sessionId = request.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const lockAssertionReceiptMessage = new LockAssertionReceiptMessage();
    lockAssertionReceiptMessage.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(gateway.gatewaySigner, JSON.stringify(lockAssertionReceiptMessage)),
    );

    lockAssertionReceiptMessage.common.signature = messageSignature;

    sessionData.signatures.stage2 = new Stage2Signatures();
    sessionData.signatures.stage2.lockAssertionRequestMessageClientSignature =
      messageSignature;

    sessionData.hashes.stage2 = new Stage2Hashes();
    sessionData.hashes.stage2.lockAssertionRequestMessageHash = SHA256(
      JSON.stringify(lockAssertionReceiptMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "lockAssertionResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending LockAssertionResponseMessage...`);

    return lockAssertionReceiptMessage;
  }

  checkLockAssertionRequestMessage(
    request: LockAssertionRequestMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkLockAssertionRequestMessage()`;

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      // request.common.transferContextId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      // request.common.actionrequest == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    const sessionData = gateway.getSession(request.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage1.transferCommenceResponseMessageHash ==
        undefined ||
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
        gateway.gatewaySigner,
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
      sessionData.hashes.stage1.transferCommenceResponseMessageHash
    ) {
      throw new Error(
        `${fnTag}, LockAssertionRequest previous message hash does not match the one that was sent`,
      );
    }

    if (
      request.lockAssertionFormat == undefined ||
      request.lockAssertionClaim == undefined
    ) {
      throw new Error(
        `${fnTag},  LockAssertionRequest lockAssertionFormat or lockAssertionClaim is missing`,
      );
    }

    this.log.info(`LockAssertionRequest passed all checks.`);
  }
}
