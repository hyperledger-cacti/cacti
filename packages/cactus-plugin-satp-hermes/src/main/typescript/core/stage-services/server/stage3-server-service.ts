import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
import { SATP_VERSION } from "../../constants";
import {
  AssignmentAssertionClaim,
  CommonSatp,
  MessageType,
  MintAssertionClaim,
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
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";

export class Stage3ServerService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPServerServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ServerService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new Error(
        `${this.getServiceIdentifier()}#constructor() bridgeManager is required`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  async commitReady(
    request: CommitPreparationRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitReadyResponseMessage> {
    const stepTag = `commitReady()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, commitReady...`);

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

    commitReadyMessage.mintAssertionClaim = sessionData.mintAssertionClaim;
    commitReadyMessage.mintAssertionClaimFormat =
      sessionData.mintAssertionClaimFormat;

    if (sessionData.transferContextId != undefined) {
      commitReadyMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.serverTransferNumber != undefined) {
      commitReadyMessage.serverTransferNumber =
        sessionData.serverTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(commitReadyMessage)),
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
    this.Log.info(`${fnTag}, sending commitReadyMessage...`);

    return commitReadyMessage;
  }

  async commitFinalAcknowledgementReceiptResponse(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitFinalAcknowledgementReceiptResponseMessage> {
    const stepTag = `commitFinalAcknowledgementReceiptResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, commitFinalAcknowledgementReceiptResponse...`);

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

    if (sessionData.assignmentAssertionClaimFormat != undefined) {
      commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaimFormat =
        sessionData.assignmentAssertionClaimFormat;
    }

    if (sessionData.transferContextId != undefined) {
      commitFinalAcknowledgementReceiptResponseMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.serverTransferNumber != undefined) {
      commitFinalAcknowledgementReceiptResponseMessage.serverTransferNumber =
        sessionData.serverTransferNumber;
    }

    const messageSignature = bufArray2HexStr(
      sign(
        this.Signer,
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
    this.Log.info(
      `${fnTag}, sending commitFinalAcknowledgementReceiptResponseMessage...`,
    );

    return commitFinalAcknowledgementReceiptResponseMessage;
  }

  async checkCommitPreparationRequestMessage(
    request: CommitPreparationRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const stepTag = `checkCommitPreparationRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkCommitPreparationRequestMessage...`);

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
        this.Signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
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

    this.Log.info(
      `${fnTag}, CommitPreparationRequestMessage passed all checks.`,
    );

    return sessionData;
  }

  async checkCommitFinalAssertionRequestMessage(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const stepTag = `checkCommitFinalAssertionRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkCommitFinalAssertionRequestMessage...`);

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
        this.Signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }
    //todo check burn
    if (request.burnAssertionClaim == undefined) {
      throw new Error(`${fnTag}, mintAssertionClaims is missing`);
    }

    sessionData.burnAssertionClaim = request.burnAssertionClaim;

    if (request.burnAssertionClaimFormat != undefined) {
      this.Log.info(
        `${fnTag}, optional variable loaded: burnAssertionClaimFormat`,
      );
      sessionData.burnAssertionClaimFormat = request.burnAssertionClaimFormat;
    }

    if (
      sessionData.clientTransferNumber != undefined &&
      request.clientTransferNumber != sessionData.clientTransferNumber
    ) {
      // This does not throw an error because the clientTransferNumber is only meaningful to the client.
      this.Log.info(
        `${fnTag}, CommitFinalAssertionRequest clientTransferNumber does not match the one that was sent`,
      );
    }

    this.Log.info(
      `${fnTag}, CommitFinalAssertionRequestMessage passed all checks.`,
    );

    return sessionData;
  }

  async checkTransferCompleteRequestMessage(
    request: TransferCompleteRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const stepTag = `checkTransferCompleteRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCompleteRequestMessage...`);

    if (request.common == undefined) {
      throw new Error(`${fnTag}, message common body is missing`);
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, message version is not ${SATP_VERSION}`);
    }

    if (request.common.messageType != MessageType.COMMIT_TRANSFER_COMPLETE) {
      throw new Error(`${fnTag}, message type is not COMMIT_TRANSFER_COMPLETE`);
    }

    this.Log.info(
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

    if (
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_REQUEST) !=
      request.hashTransferCommence
    ) {
      throw new Error(`${fnTag}, hashTransferCommence does not match`);
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw new Error(`${fnTag}, clientGatewayPubkey does not match`);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw new Error(`${fnTag}, serverGatewayPubkey does not match`);
    }

    if (
      !verifySignature(
        this.Signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(`${fnTag}, message signature verification failed`);
    }

    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(`${fnTag}, transferContextId does not match`);
    }

    if (
      sessionData.clientTransferNumber != undefined &&
      request.clientTransferNumber != sessionData.clientTransferNumber
    ) {
      // This does not throw an error because the clientTransferNumber is only meaningful to the client.
      this.Log.info(
        `${fnTag}, TransferCompleteRequest clientTransferNumber does not match the one that was sent`,
      );
    }
    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );

    return sessionData;
  }
  async mintAsset(session: SATPSession): Promise<void> {
    const stepTag = `mintAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Minting Asset...`);
      const sessionData = session.getSessionData();
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountToBeneficiary;

      this.logger.debug(
        `${fnTag}, Mint Asset ID: ${assetId} amount: ${amount}`,
      );
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      // const bridge = this.bridgeManager.getBridge(
      //   sessionData.recipientGatewayNetworkId,
      // );

      // sessionData.mintAssertionClaim = new MintAssertionClaim();
      // sessionData.mintAssertionClaim.receipt = await bridge.mintAsset(
      //   assetId,
      //   Number(amount),
      // );
      // sessionData.mintAssertionClaim.signature = bufArray2HexStr(
      //   sign(this.Signer, sessionData.mintAssertionClaim.receipt),
      // );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Mint Asset ${error}`);
    }
  }

  async assignAsset(session: SATPSession): Promise<void> {
    const stepTag = `assignAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Assigning Asset...`);
      const sessionData = session.getSessionData();
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountToBeneficiary;
      const recipient = sessionData.transferInitClaims?.beneficiaryPubkey;

      if (recipient == undefined) {
        throw new Error(`${fnTag}, Recipient is missing`);
      }
      this.logger.debug(
        `${fnTag}, Assign Asset ID: ${assetId} amount: ${amount} recipient: ${recipient}`,
      );
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      // const bridge = this.bridgeManager.getBridge(
      //   sessionData.recipientGatewayNetworkId,
      // );

      // sessionData.assignmentAssertionClaim = new AssignmentAssertionClaim();
      // sessionData.assignmentAssertionClaim.receipt = await bridge.assignAsset(
      //   assetId,
      //   recipient,
      //   Number(amount),
      // );
      // sessionData.assignmentAssertionClaim.signature = bufArray2HexStr(
      //   sign(this.Signer, sessionData.assignmentAssertionClaim.receipt),
      // );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Assign Asset ${error}`);
    }
  }
}
