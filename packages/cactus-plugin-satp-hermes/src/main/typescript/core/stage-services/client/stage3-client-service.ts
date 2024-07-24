import {
  BurnAssertionClaim,
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
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import { getMessageHash, saveHash, saveSignature } from "../../session-utils";
import {
  SATPService,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { SATPSession } from "../../satp-session";
import { LockAssertionReceiptMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";

export class Stage3ClientService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ClientService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
    };
    super(commonOptions);

    if (ops.bridgeManager == undefined) {
      throw new Error(
        `${this.getServiceIdentifier()}#constructor(), bridgeManager is missing`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  async commitPreparation(
    response: LockAssertionReceiptMessage,
    session: SATPSession,
  ): Promise<void | CommitPreparationRequestMessage> {
    const stepTag = `commitPreparation()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitPreparation...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.ASSERTION_RECEIPT, getHash(response));

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_PREPARE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ASSERTION_RECEIPT,
    );
    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitPreparationRequestMessage =
      new CommitPreparationRequestMessage();
    commitPreparationRequestMessage.common = commonBody;

    if (sessionData.transferContextId != undefined) {
      commitPreparationRequestMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.clientTransferNumber != undefined) {
      commitPreparationRequestMessage.clientTransferNumber =
        sessionData.clientTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(commitPreparationRequestMessage)),
    );

    commitPreparationRequestMessage.common.signature = messageSignature;

    saveSignature(sessionData, MessageType.COMMIT_PREPARE, messageSignature);

    saveHash(
      sessionData,
      MessageType.COMMIT_PREPARE,
      getHash(commitPreparationRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitPreparation",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending CommitPreparationMessage...`);

    return commitPreparationRequestMessage;
  }

  async commitFinalAssertion(
    response: CommitReadyResponseMessage,
    session: SATPSession,
  ): Promise<void | CommitFinalAssertionRequestMessage> {
    const stepTag = `commitFinalAssertion()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitFinalAssertion...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_FINAL;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_READY,
    );

    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitFinalAssertionRequestMessage =
      new CommitFinalAssertionRequestMessage();
    commitFinalAssertionRequestMessage.common = commonBody;

    commitFinalAssertionRequestMessage.burnAssertionClaim =
      sessionData.burnAssertionClaim;

    if (sessionData.burnAssertionClaimFormat != undefined) {
      commitFinalAssertionRequestMessage.burnAssertionClaimFormat =
        sessionData.burnAssertionClaimFormat;
    }

    if (sessionData.transferContextId != undefined) {
      commitFinalAssertionRequestMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.clientTransferNumber != undefined) {
      commitFinalAssertionRequestMessage.clientTransferNumber =
        sessionData.clientTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(commitFinalAssertionRequestMessage)),
    );

    commitFinalAssertionRequestMessage.common.signature = messageSignature;

    saveSignature(sessionData, MessageType.COMMIT_FINAL, messageSignature);

    saveHash(
      sessionData,
      MessageType.COMMIT_FINAL,
      getHash(commitFinalAssertionRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitFinalAssertion",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending CommitFinalAssertionMessage...`);

    return commitFinalAssertionRequestMessage;
  }

  async transferComplete(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    session: SATPSession,
  ): Promise<void | TransferCompleteRequestMessage> {
    const stepTag = `transferComplete()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, TransferComplete...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
      );
    }

    saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(response));

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_TRANSFER_COMPLETE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
    );

    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const transferCompleteRequestMessage = new TransferCompleteRequestMessage();
    transferCompleteRequestMessage.common = commonBody;

    if (sessionData.transferContextId != undefined) {
      transferCompleteRequestMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.clientTransferNumber != undefined) {
      transferCompleteRequestMessage.clientTransferNumber =
        sessionData.clientTransferNumber;
    }

    transferCompleteRequestMessage.hashTransferCommence = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferCompleteRequestMessage)),
    );

    transferCompleteRequestMessage.common.signature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      messageSignature,
    );

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      getHash(transferCompleteRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferComplete",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending TransferCompleteMessage...`);

    return transferCompleteRequestMessage;
  }

  checkLockAssertionReceiptMessage(
    response: LockAssertionReceiptMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkLockAssertionReceiptMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CheckLockAssertionReceiptMessage...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.ASSERTION_RECEIPT) {
      throw new Error(`${fnTag}, message type is not ASSERTION_RECEIPT`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
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
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.LOCK_ASSERT)
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
        this.Signer,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    this.Log.info(`${fnTag}, LockAssertionReceiptMessage passed all checks.`);
  }

  checkCommitReadyResponseMessage(
    response: CommitReadyResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkCommitReadyResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitReadyResponse...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.COMMIT_READY) {
      throw new Error(`${fnTag}, message type is not COMMIT_READY`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
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
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.COMMIT_PREPARE)
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
        this.Signer,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (response.mintAssertionClaimFormat != undefined) {
      //todo
      this.Log.info(
        `${fnTag},  Optional variable loaded: mintAssertionClaimsFormat `,
      );
      sessionData.mintAssertionClaimFormat = response.mintAssertionClaimFormat;
    }

    if (response.mintAssertionClaim == undefined) {
      //todo
      throw new Error(`${fnTag}, mintAssertionClaims is missing`);
    }

    sessionData.mintAssertionClaim = response.mintAssertionClaim;

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    this.Log.info(`${fnTag}, CommitReadyResponseMessage passed all checks.`);
  }

  checkCommitFinalAcknowledgementReceiptResponseMessage(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkCommitFinalAcknowledgementReceiptResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitFinalAcknowledgementReceipt...`);

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (response.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (response.common.messageType != MessageType.ACK_COMMIT_FINAL) {
      throw new Error(`${fnTag}, message type is not ACK_COMMIT_FINAL`);
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
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
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.COMMIT_FINAL)
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
        this.Signer,
        response.common,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }

    if (response.assignmentAssertionClaim == undefined) {
      throw new Error(`${fnTag}, assignmentAssertionClaim is missing`);
    }

    sessionData.assignmentAssertionClaim = response.assignmentAssertionClaim;

    if (response.assignmentAssertionClaimFormat != undefined) {
      this.Log.info(
        `${fnTag},  Optional variable loaded: assignmentAssertionClaimFormat `,
      );
      sessionData.assignmentAssertionClaimFormat =
        response.assignmentAssertionClaimFormat;
    }

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    this.Log.info(
      `${fnTag}, CommitFinalAcknowledgementReceiptResponseMessage passed all checks.`,
    );
  }

  async burnAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Burning Asset...`);
      const sessionData = session.getSessionData();
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountFromOriginator;

      this.Log.debug(`${fnTag}, Burn Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      // const bridge = this.bridgeManager.getBridge(
      //   sessionData.senderGatewayNetworkId,
      // );

      // sessionData.burnAssertionClaim = new BurnAssertionClaim();
      // sessionData.burnAssertionClaim.receipt = await bridge.burnAsset(
      //   assetId,
      //   Number(amount),
      // );
      // sessionData.burnAssertionClaim.signature = bufArray2HexStr(
      //   sign(this.Signer, sessionData.burnAssertionClaim.receipt),
      // );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Burn Asset ${error}`);
    }
  }
}
