import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPGateway } from "../../../gateway-refactor";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  Stage3Hashes,
  Stage3Signatures,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SHA256 } from "crypto-js";
import {
  bufArray2HexStr,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";

export class Stage3ServerHandler {
  public static readonly CLASS_NAME = "Stage3Handler-Server";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = Stage3ServerHandler.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return Stage3ServerHandler.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async commitReady(
    request: CommitPreparationRequestMessage,
    gateway: SATPGateway,
  ): Promise<void | CommitReadyResponseMessage> {
    const fnTag = `${this.className}#commitReady()`;

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

    sessionData.hashes.stage3 = new Stage3Hashes();

    sessionData.hashes.stage3.commitPreparationRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_READY;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage3.commitPreparationRequestMessageHash;
    commonBody.sessionId = request.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitReadyMessage = new CommitReadyResponseMessage();
    commitReadyMessage.common = commonBody;

    commitReadyMessage.mintAssertionClaims = sessionData.mintAssertionClaims;
    commitReadyMessage.mintAssertionClaimsFormat =
      sessionData.mintAssertionClaimsFormat;

    const messageSignature = bufArray2HexStr(
      sign(gateway.gatewaySigner, JSON.stringify(commitReadyMessage)),
    );

    commitReadyMessage.common.signature = messageSignature;

    sessionData.signatures.stage3 = new Stage3Signatures();
    sessionData.signatures.stage3.commitReadyResponseMessageServerSignature =
      messageSignature;

    sessionData.hashes.stage3.commitReadyResponseMessageHash = SHA256(
      JSON.stringify(commitReadyMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitReady",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending commitReadyMessage...`);

    return commitReadyMessage;
  }

  async commitFinalAcknowledgementReceiptResponse(
    request: CommitFinalAssertionRequestMessage,
    gateway: SATPGateway,
  ): Promise<void | CommitFinalAcknowledgementReceiptResponseMessage> {
    const fnTag = `${this.className}#commitFinalAcknowledgementReceiptResponse()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = gateway.getSession(request.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.hashes.stage3.commitReadyResponseMessageHash == undefined ||
      sessionData.signatures == undefined ||
      sessionData.signatures.stage3 == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ACK_COMMIT_FINAL;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash;
    commonBody.sessionId = request.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitFinalAcknowledgementReceiptResponseMessage =
      new CommitFinalAcknowledgementReceiptResponseMessage();
    commitFinalAcknowledgementReceiptResponseMessage.common = commonBody;

    commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaim =
      sessionData.assignmentAssertionClaim;
    commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaimFormat =
      sessionData.assignmentAssertionClaimFormat;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(commitFinalAcknowledgementReceiptResponseMessage),
      ),
    );

    commitFinalAcknowledgementReceiptResponseMessage.common.signature =
      messageSignature;

    sessionData.signatures.stage3.commitFinalAcknowledgementReceiptResponseMessageServerSignature =
      messageSignature;

    sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash = SHA256(
      JSON.stringify(commitFinalAcknowledgementReceiptResponseMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitFinalAcknowledgementReceiptResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(
      `${fnTag}, sending commitFinalAcknowledgementReceiptResponseMessage...`,
    );

    return commitFinalAcknowledgementReceiptResponseMessage;
  }

  checkCommitPreparationRequestMessage(
    request: CommitPreparationRequestMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkCommitPreparationRequestMessage()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (request.common.messageType != MessageType.COMMIT_PREPARE) {
      throw new Error(`${fnTag}, message type is not COMMIT_PREPARE`);
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
      sessionData.hashes.stage2 == undefined ||
      sessionData.hashes.stage2.lockAssertionReceiptMessageHash == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      request.common.sequenceNumber
    ) {
      throw new Error(`${fnTag}, sequenceNumber does not match`);
    }

    if (
      sessionData.hashes.stage2.lockAssertionReceiptMessageHash !=
      request.common.hashPreviousMessage
    ) {
      throw new Error(`${fnTag}, hashPreviousMessage does not match`);
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    this.log.info(`CommitPreparationRequestMessage passed all checks.`);
  }

  checkCommitFinalAssertionRequestMessage(
    request: CommitFinalAssertionRequestMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkCommitFinalAssertionRequestMessage()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (request.common.messageType != MessageType.COMMIT_FINAL) {
      throw new Error(`${fnTag}, message type is not COMMIT_FINAL`);
    }

    const sessionData = gateway.getSession(request.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.hashes.stage3.commitReadyResponseMessageHash == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      request.common.sequenceNumber
    ) {
      throw new Error(`${fnTag}, sequenceNumber does not match`);
    }

    if (
      sessionData.hashes.stage3.commitReadyResponseMessageHash !=
      request.common.hashPreviousMessage
    ) {
      throw new Error(`${fnTag}, hashPreviousMessage does not match`);
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (request.burnAssertionClaim == undefined) {
      throw new Error(`${fnTag}, mintAssertionClaims is missing`);
    }

    this.log.info(`CommitFinalAssertionRequestMessage passed all checks.`);
  }
}
