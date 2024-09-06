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
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  AssignmentAssertionClaimError,
  BurnAssertionClaimError,
  MintAssertionClaimError,
  MissingBridgeManagerError,
  MissingRecipientError,
  SessionError,
  TokenIdMissingError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";

export class Stage3ServerService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

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
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_READY;
    commonBody.sequenceNumber = request.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_PREPARE,
    );
    commonBody.sessionId = request.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitReadyMessage = new CommitReadyResponseMessage();
    commitReadyMessage.common = commonBody;

    if (sessionData.mintAssertionClaim == undefined) {
      throw new MintAssertionClaimError(fnTag);
    }

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

    commitReadyMessage.serverSignature = messageSignature;

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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.ACK_COMMIT_FINAL;
    commonBody.sequenceNumber = request.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_FINAL,
    );
    commonBody.sessionId = request.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const commitFinalAcknowledgementReceiptResponseMessage =
      new CommitFinalAcknowledgementReceiptResponseMessage();
    commitFinalAcknowledgementReceiptResponseMessage.common = commonBody;

    if (sessionData.assignmentAssertionClaim == undefined) {
      throw new AssignmentAssertionClaimError(fnTag);
    }

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

    commitFinalAcknowledgementReceiptResponseMessage.serverSignature =
      messageSignature;

    saveSignature(sessionData, MessageType.ACK_COMMIT_FINAL, messageSignature);

    saveHash(
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
      getHash(commitFinalAcknowledgementReceiptResponseMessage),
    );

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
  ): Promise<void> {
    const stepTag = `checkCommitPreparationRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkCommitPreparationRequestMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    if (request.common == undefined) {
      commonBodyVerifier(
        fnTag,
        request.common,
        sessionData,
        MessageType.COMMIT_PREPARE,
      );
    }

    signatureVerifier(fnTag, this.Signer, request, sessionData);

    if (
      sessionData.clientTransferNumber != "" &&
      request.clientTransferNumber != sessionData.clientTransferNumber
    ) {
      // This does not throw an error because the clientTransferNumber is only meaningful to the client.
      this.Log.info(
        `${fnTag}, LockAssertionRequest clientTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_PREPARE, getHash(request));

    this.Log.info(
      `${fnTag}, CommitPreparationRequestMessage passed all checks.`,
    );
  }

  async checkCommitFinalAssertionRequestMessage(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitFinalAssertionRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkCommitFinalAssertionRequestMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    if (request.common == undefined) {
      commonBodyVerifier(
        fnTag,
        request.common,
        sessionData,
        MessageType.COMMIT_FINAL,
      );
    }

    signatureVerifier(fnTag, this.Signer, request, sessionData);

    //todo check burn
    if (request.burnAssertionClaim == undefined) {
      throw new BurnAssertionClaimError(fnTag);
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

    saveHash(sessionData, MessageType.COMMIT_FINAL, getHash(request));

    this.Log.info(
      `${fnTag}, CommitFinalAssertionRequestMessage passed all checks.`,
    );
  }

  async checkTransferCompleteRequestMessage(
    request: TransferCompleteRequestMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCompleteRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCompleteRequestMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    if (request.common == undefined) {
      commonBodyVerifier(
        fnTag,
        request.common,
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE,
      );
    }

    signatureVerifier(fnTag, this.Signer, request, sessionData);

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
    sessionData.completed = true;

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      getHash(request),
    );

    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );
  }

  async mintAsset(session: SATPSession): Promise<void> {
    const stepTag = `mintAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Minting Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      session.verify(fnTag, SessionType.SERVER);

      const sessionData = session.getServerSessionData();

      const assetId = sessionData.receiverAsset?.tokenId;
      const amount = sessionData.receiverAsset?.amount;

      this.logger.debug(
        `${fnTag}, Mint Asset ID: ${assetId} amount: ${amount}`,
      );
      if (assetId == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (amount == undefined) {
        throw new Error(`${fnTag}, Amount is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.recipientGatewayNetworkId,
      );

      sessionData.mintAssertionClaim = new MintAssertionClaim();
      sessionData.mintAssertionClaim.receipt = await bridge.mintAsset(
        assetId,
        Number(amount),
      );
      sessionData.mintAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.mintAssertionClaim.receipt),
      );
    } catch (error) {
      throw new FailedToProcessError(fnTag, "MintAsset");
    }
  }

  async assignAsset(session: SATPSession): Promise<void> {
    const stepTag = `assignAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Assigning Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      session.verify(fnTag, SessionType.SERVER);

      const sessionData = session.getServerSessionData();

      const assetId = sessionData.receiverAsset?.tokenId;
      const amount = sessionData.receiverAsset?.amount;
      const recipient = sessionData.receiverAsset?.owner;

      if (recipient == undefined) {
        throw new MissingRecipientError(fnTag);
      }
      this.logger.debug(
        `${fnTag}, Assign Asset ID: ${assetId} amount: ${amount} recipient: ${recipient}`,
      );
      if (assetId == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (amount == undefined) {
        throw new Error(`${fnTag}, Amount is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.recipientGatewayNetworkId,
      );

      sessionData.assignmentAssertionClaim = new AssignmentAssertionClaim();
      sessionData.assignmentAssertionClaim.receipt = await bridge.assignAsset(
        assetId,
        recipient,
        Number(amount),
      );
      sessionData.assignmentAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.assignmentAssertionClaim.receipt),
      );
    } catch (error) {
      throw new FailedToProcessError(fnTag, "AssignAsset");
    }
  }
}
