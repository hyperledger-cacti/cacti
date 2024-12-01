import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAcknowledgementReceiptResponseMessageSchema,
  CommitFinalAssertionRequestMessage,
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  CommitReadyResponseMessageSchema,
  TransferCompleteRequestMessage,
  TransferCompleteResponseMessage,
  TransferCompleteResponseMessageSchema,
} from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
import {
  AssignmentAssertionClaimFormatSchema,
  AssignmentAssertionClaimSchema,
  CommonSatpSchema,
  MessageType,
  MintAssertionClaimFormatSchema,
  MintAssertionClaimSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

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
import {
  FailedToProcessError,
  SessionNotFoundError,
} from "../../errors/satp-handler-errors";
import { SATPInternalError } from "../../errors/satp-errors";
import { State } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { create } from "@bufbuild/protobuf";

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
      dbLogger: ops.dbLogger,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  async commitReadyResponse(
    request: CommitPreparationRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitReadyResponseMessage> {
    const stepTag = `commitReady()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_READY];
    this.Log.debug(`${fnTag}, commitReady...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();
    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      const commonBody = create(CommonSatpSchema, {
        version: sessionData.version,
        messageType: MessageType.COMMIT_READY,
        sequenceNumber: request.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.COMMIT_PREPARE,
        ),
        sessionId: request.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber;

      const commitReadyMessage = create(CommitReadyResponseMessageSchema, {
        common: commonBody,
      });

      if (sessionData.mintAssertionClaim == undefined) {
        throw new MintAssertionClaimError(fnTag);
      }

      commitReadyMessage.mintAssertionClaim = sessionData.mintAssertionClaim;
      commitReadyMessage.mintAssertionClaimFormat =
        sessionData.mintAssertionClaimFormat;

      if (sessionData.transferContextId != undefined) {
        commitReadyMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.serverTransferNumber != undefined) {
        commitReadyMessage.serverTransferNumber =
          sessionData.serverTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(commitReadyMessage)),
      );

      commitReadyMessage.serverSignature = messageSignature;

      saveSignature(sessionData, MessageType.COMMIT_READY, messageSignature);

      saveHash(
        sessionData,
        MessageType.COMMIT_READY,
        getHash(commitReadyMessage),
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, sending commitReadyMessage...`);

      return commitReadyMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async commitReadyErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<CommitReadyResponseMessage> {
    const errorResponse = create(CommitReadyResponseMessageSchema, {});
    const commonBody = create(CommonSatpSchema, {
      messageType: MessageType.COMMIT_READY,
      error: true,
      errorCode: error.getSATPErrorType(),
    });

    if (!(error instanceof SessionNotFoundError) && session != undefined) {
      commonBody.sessionId = session.getServerSessionData().id;
    }
    errorResponse.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(errorResponse)),
    );

    errorResponse.serverSignature = messageSignature;

    return errorResponse;
  }

  async commitFinalAcknowledgementReceiptResponse(
    request: CommitFinalAssertionRequestMessage,
    session: SATPSession,
  ): Promise<void | CommitFinalAcknowledgementReceiptResponseMessage> {
    const stepTag = `commitFinalAcknowledgementReceiptResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.ACK_COMMIT_FINAL];
    this.Log.debug(`${fnTag}, commitFinalAcknowledgementReceiptResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      const commonBody = create(CommonSatpSchema, {
        version: sessionData.version,
        messageType: MessageType.ACK_COMMIT_FINAL,
        sequenceNumber: request.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.COMMIT_FINAL,
        ),
        sessionId: request.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber =
        request.common!.sequenceNumber + BigInt(1);

      const commitFinalAcknowledgementReceiptResponseMessage = create(
        CommitFinalAcknowledgementReceiptResponseMessageSchema,
        {
          common: commonBody,
        },
      );

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
        commitFinalAcknowledgementReceiptResponseMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.serverTransferNumber != undefined) {
        commitFinalAcknowledgementReceiptResponseMessage.serverTransferNumber =
          sessionData.serverTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(
          this.Signer,
          safeStableStringify(commitFinalAcknowledgementReceiptResponseMessage),
        ),
      );

      commitFinalAcknowledgementReceiptResponseMessage.serverSignature =
        messageSignature;

      saveSignature(
        sessionData,
        MessageType.ACK_COMMIT_FINAL,
        messageSignature,
      );

      saveHash(
        sessionData,
        MessageType.ACK_COMMIT_FINAL,
        getHash(commitFinalAcknowledgementReceiptResponseMessage),
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(
        `${fnTag}, sending commitFinalAcknowledgementReceiptResponseMessage...`,
      );

      return commitFinalAcknowledgementReceiptResponseMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async commitFinalAcknowledgementReceiptErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<CommitFinalAcknowledgementReceiptResponseMessage> {
    const errorResponse = create(
      CommitFinalAcknowledgementReceiptResponseMessageSchema,
      {},
    );
    const commonBody = create(CommonSatpSchema, {
      messageType: MessageType.ACK_COMMIT_FINAL,
      error: true,
      errorCode: error.getSATPErrorType(),
    });

    if (!(error instanceof SessionNotFoundError) && session != undefined) {
      commonBody.sessionId = session.getServerSessionData().id;
    }
    errorResponse.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(errorResponse)),
    );

    errorResponse.serverSignature = messageSignature;

    return errorResponse;
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

    sessionData.state = State.COMPLETED;

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      getHash(request),
    );

    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );
  }

  async transferCompleteResponse(
    request: TransferCompleteRequestMessage,
    session: SATPSession,
  ): Promise<TransferCompleteResponseMessage> {
    const stepTag = `createTransferCompleteResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType =
      MessageType[MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE];
    this.Log.debug(`${fnTag}, createTransferCompleteResponseMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER, false, true);

    const sessionData = session.getServerSessionData();

    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      const commonBody = create(CommonSatpSchema, {
        version: sessionData.version,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
        sequenceNumber: request.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.COMMIT_TRANSFER_COMPLETE,
        ),
        sessionId: request.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber =
        request.common!.sequenceNumber + BigInt(1);

      const transferCompleteResponseMessage = create(
        TransferCompleteResponseMessageSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.transferContextId != undefined) {
        transferCompleteResponseMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.serverTransferNumber != undefined) {
        transferCompleteResponseMessage.serverTransferNumber =
          sessionData.serverTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(transferCompleteResponseMessage)),
      );

      transferCompleteResponseMessage.serverSignature = messageSignature;

      saveSignature(
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
        messageSignature,
      );

      saveHash(
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
        getHash(transferCompleteResponseMessage),
      );
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, sending transferCompleteResponseMessage...`);

      return transferCompleteResponseMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async transferCompleteErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<TransferCompleteResponseMessage> {
    const errorResponse = create(TransferCompleteResponseMessageSchema, {});
    const commonBody = create(CommonSatpSchema, {
      messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      error: true,
      errorCode: error.getSATPErrorType(),
    });

    if (!(error instanceof SessionNotFoundError) && session != undefined) {
      commonBody.sessionId = session.getServerSessionData().id;
    }
    errorResponse.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(errorResponse)),
    );

    errorResponse.serverSignature = messageSignature;

    return errorResponse;
  }

  async mintAsset(session: SATPSession): Promise<void> {
    const stepTag = `mintAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "mint-asset",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "mint-asset",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, Minting Asset...`);

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

      sessionData.mintAssertionClaim = create(MintAssertionClaimSchema, {});
      sessionData.mintAssertionClaim.receipt = await bridge.mintAsset(
        assetId,
        Number(amount),
      );
      sessionData.mintAssertionClaim.proof = await bridge.getProof(assetId);
      sessionData.mintAssertionClaimFormat = create(
        MintAssertionClaimFormatSchema,
        {
          format: bridge.getReceiptFormat(),
        },
      );
      sessionData.mintAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.mintAssertionClaim.receipt),
      );
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "mint-asset",
        operation: "done",
        data: safeStableStringify(sessionData.mintAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "mint-asset",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "MintAsset", error);
    }
  }

  async assignAsset(session: SATPSession): Promise<void> {
    const stepTag = `assignAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);
    const sessionData = session.getServerSessionData();
    this.Log.info(`init-${stepTag}`);
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "assign-asset",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`${fnTag}, Assigning Asset...`);
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "assign-asset",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

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

      sessionData.assignmentAssertionClaim = create(
        AssignmentAssertionClaimSchema,
        {},
      );
      sessionData.assignmentAssertionClaim.receipt = await bridge.assignAsset(
        assetId,
        recipient,
        Number(amount),
      );
      sessionData.assignmentAssertionClaim.proof =
        await bridge.getProof(assetId);
      sessionData.assignmentAssertionClaimFormat = create(
        AssignmentAssertionClaimFormatSchema,
        {
          format: bridge.getReceiptFormat(),
        },
      );
      sessionData.assignmentAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.assignmentAssertionClaim.receipt),
      );
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "assign-asset",
        operation: "done",
        data: safeStableStringify(sessionData.assignmentAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "assign-asset",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "AssignAsset", error);
    }
  }
}
