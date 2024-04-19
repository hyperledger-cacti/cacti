import { JsObjectSigner, Logger, LoggerProvider } from "@hyperledger/cactus-common";
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
import { SessionData } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import {
  bufArray2HexStr,
  getHash,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import { ISATPServerServiceOptions, SATPService } from "../../types";
import { SATPSession } from "../../../types/satp-session";

export class Stage3ServerService implements SATPService {
  public static readonly CLASS_NAME = "Stage3ServerService";
  private _log: Logger;
  private signer: JsObjectSigner;

  constructor(ops: ISATPServerServiceOptions) {
    const level = "INFO";
    const label = Stage3ServerService.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
    this.signer = ops.signer;
  }

  public get className(): string {
    return Stage3ServerService.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async commitReady(
    request: CommitPreparationRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitReadyResponseMessage> {
    const fnTag = `${this.className}#commitReady()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_PREPARE, getHash(request));

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_READY;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_PREPARE,
    );
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
      sign(this.signer, JSON.stringify(commitReadyMessage)),
    );

    saveSignature(sessionData, MessageType.COMMIT_READY, messageSignature);

    saveHash(
      sessionData,
      MessageType.COMMIT_READY,
      getHash(commitReadyMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitReady",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */
    this.log.info(`${fnTag}, sending commitReadyMessage...`);

    return commitReadyMessage;
  }

  async commitFinalAcknowledgementReceiptResponse(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitFinalAcknowledgementReceiptResponseMessage> {
    const fnTag = `${this.className}#commitFinalAcknowledgementReceiptResponse()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_FINAL, getHash(request));

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ACK_COMMIT_FINAL;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_FINAL,
    );
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
        this.signer,
        JSON.stringify(commitFinalAcknowledgementReceiptResponseMessage),
      ),
    );

    saveSignature(sessionData, MessageType.ACK_COMMIT_FINAL, messageSignature);

    saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(request));

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitFinalAcknowledgementReceiptResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */
    this.log.info(
      `${fnTag}, sending commitFinalAcknowledgementReceiptResponseMessage...`,
    );

    return commitFinalAcknowledgementReceiptResponseMessage;
  }

  async checkCommitPreparationRequestMessage(
    request: CommitPreparationRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
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

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
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
      getMessageHash(sessionData, MessageType.ASSERTION_RECEIPT) !=
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
        this.signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    this.log.info(`CommitPreparationRequestMessage passed all checks.`);

    return sessionData;
  }

  async checkCommitFinalAssertionRequestMessage(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
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

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
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
      getMessageHash(sessionData, MessageType.COMMIT_READY) !=
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
        this.signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (request.burnAssertionClaim == undefined) {
      throw new Error(`${fnTag}, mintAssertionClaims is missing`);
    }

    //todo check burn

    this.log.info(`CommitFinalAssertionRequestMessage passed all checks.`);

    return sessionData;
  }

  async checkTransferCompleteRequestMessage(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const fnTag = `${this.className}#checkTransferCompleteRequestMessage()`;

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (request.common.messageType != MessageType.COMMIT_TRANSFER_COMPLETE) {
      throw new Error(`${fnTag}, message type is not COMMIT_TRANSFER_COMPLETE`);
    }

    this.log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
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
      getMessageHash(sessionData, MessageType.COMMIT_FINAL) !=
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
        this.signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    this.log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );

    return sessionData;
  }
}
