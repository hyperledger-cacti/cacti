import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { LockAssertionReceiptMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATPGateway } from "../../../gateway-refactor";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
import { SHA256 } from "crypto-js";
import {
  SessionData,
  Stage3Hashes,
  Stage3Signatures,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import {
  bufArray2HexStr,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";

export class Stage3ClientHandler {
  public static readonly CLASS_NAME = "Stage3Handler-Client";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = Stage3ClientHandler.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return Stage3ClientHandler.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async commitPreparation(
    response: LockAssertionReceiptMessage,
    gateway: SATPGateway,
  ): Promise<void | CommitPreparationRequestMessage> {
    const fnTag = `${this.className}#commitPreparation()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = gateway.getSession(response.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage2 == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    sessionData.hashes.stage2.lockAssertionReceiptMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_PREPARE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage2.lockAssertionReceiptMessageHash;
    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitPreparationRequestMessage =
      new CommitPreparationRequestMessage();
    commitPreparationRequestMessage.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(commitPreparationRequestMessage),
      ),
    );

    commitPreparationRequestMessage.common.signature = messageSignature;

    sessionData.signatures.stage3 = new Stage3Signatures();
    sessionData.signatures.stage3.commitPreparationRequestMessageClientSignature =
      messageSignature;

    sessionData.hashes.stage3 = new Stage3Hashes();
    sessionData.hashes.stage3.commitPreparationRequestMessageHash = SHA256(
      JSON.stringify(commitPreparationRequestMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitPreparation",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending CommitPreparationMessage...`);

    return commitPreparationRequestMessage;
  }

  async commitFinalAssertion(
    response: CommitReadyResponseMessage,
    gateway: SATPGateway,
  ): Promise<void | CommitFinalAssertionRequestMessage> {
    const fnTag = `${this.className}#commitPreparation()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    //const sessionData = gateway.sessions.get(response.common.sessionId);
    const sessionData = new SessionData(); //todo change

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.signatures == undefined ||
      sessionData.signatures.stage3 == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    sessionData.hashes.stage3.commitReadyResponseMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_FINAL;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage3.commitReadyResponseMessageHash;
    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitFinalAssertionRequestMessage =
      new CommitFinalAssertionRequestMessage();
    commitFinalAssertionRequestMessage.common = commonBody;

    commitFinalAssertionRequestMessage.burnAssertionClaim =
      sessionData.burnAssertionClaim;
    commitFinalAssertionRequestMessage.burnAssertionClaimFormat =
      sessionData.burnAssertionClaimFormat;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(commitFinalAssertionRequestMessage),
      ),
    );

    commitFinalAssertionRequestMessage.common.signature = messageSignature;

    sessionData.signatures.stage3.commitFinalAssertionRequestMessageClientSignature =
      messageSignature;

    sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash = SHA256(
      JSON.stringify(commitFinalAssertionRequestMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitFinalAssertion",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending CommitFinalAssertionMessage...`);

    return commitFinalAssertionRequestMessage;
  }

  async transferComplete(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    gateway: SATPGateway,
  ): Promise<void | TransferCompleteRequestMessage> {
    const fnTag = `${this.className}#transferComplete()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    //const sessionData = gateway.sessions.get(response.common.sessionId);
    const sessionData = new SessionData(); //todo change

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.signatures == undefined ||
      sessionData.signatures.stage3 == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    sessionData.hashes.stage3.commitFinalAcknowledgementReceiptResponseMessageHash =
      SHA256(JSON.stringify(response)).toString();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_TRANSFER_COMPLETE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage3.commitFinalAcknowledgementReceiptResponseMessageHash;
    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const transferCompleteRequestMessage = new TransferCompleteRequestMessage();
    transferCompleteRequestMessage.common = commonBody;
    transferCompleteRequestMessage.hashTransferCommence =
      sessionData.hashes.stage1.transferCommenceRequestMessageHash;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(transferCompleteRequestMessage),
      ),
    );

    transferCompleteRequestMessage.common.signature = messageSignature;

    sessionData.signatures.stage3.transferCompleteRequestMessageClientSignature =
      messageSignature;

    sessionData.hashes.stage3.transferCompleteRequestMessageHash = SHA256(
      JSON.stringify(transferCompleteRequestMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferComplete",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferCompleteMessage...`);

    return transferCompleteRequestMessage;
  }

  checkLockAssertionReceiptMessage(
    response: LockAssertionReceiptMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkLockAssertionReceiptMessage()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.ASSERTION_RECEIPT) {
      throw new Error(`${fnTag}, message type is not ASSERTION_RECEIPT`);
    }

    const sessionData = gateway.getSession(response.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage2 == undefined ||
      sessionData.hashes.stage2.lockAssertionRequestMessageHash == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw new Error(`${fnTag}, sequenceNumber does not match`);
    }

    if (
      sessionData.hashes.stage2.lockAssertionRequestMessageHash !=
      response.common.hashPreviousMessage
    ) {
      throw new Error(`${fnTag}, hashPreviousMessage does not match`);
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    this.log.info(`LockAssertionReceiptMessage passed all checks.`);
  }

  checkCommitReadyResponseMessage(
    response: CommitReadyResponseMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkCommitReadyResponseMessage()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.COMMIT_READY) {
      throw new Error(`${fnTag}, message type is not COMMIT_READY`);
    }

    const sessionData = gateway.getSession(response.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.hashes.stage3.commitPreparationRequestMessageHash ==
        undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw new Error(`${fnTag}, sequenceNumber does not match`);
    }

    if (
      sessionData.hashes.stage3.commitPreparationRequestMessageHash !=
      response.common.hashPreviousMessage
    ) {
      throw new Error(`${fnTag}, hashPreviousMessage does not match`);
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (response.mintAssertionClaims == undefined) {
      //todo
      throw new Error(`${fnTag}, mintAssertionClaims is missing`);
    }

    this.log.info(`CommitReadyResponseMessage passed all checks.`);
  }

  checkCommitFinalAcknowledgementReceiptResponseMessage(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    gateway: SATPGateway,
  ): void {
    const fnTag = `${this.className}#checkCommitFinalAcknowledgementReceiptResponseMessage()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.ACK_COMMIT_FINAL) {
      throw new Error(`${fnTag}, message type is not ACK_COMMIT_FINAL`);
    }

    const sessionData = gateway.getSession(response.common.sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.hashes == undefined ||
      sessionData.hashes.stage3 == undefined ||
      sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash ==
        undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw new Error(`${fnTag}, sequenceNumber does not match`);
    }

    if (
      sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash !=
      response.common.hashPreviousMessage
    ) {
      throw new Error(`${fnTag}, hashPreviousMessage does not match`);
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (response.assignmentAssertionClaim == undefined) {
      throw new Error(`${fnTag}, assignmentAssertionClaim is missing`);
    }

    this.log.info(
      `CommitFinalAcknowledgementReceiptResponseMessage passed all checks.`,
    );
  }
}
