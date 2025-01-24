import {
  BurnAssertionClaimFormatSchema,
  BurnAssertionClaimSchema,
  CommonSatpSchema,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAssertionRequestMessage,
  CommitFinalAssertionRequestMessageSchema,
  CommitPreparationRequestMessage,
  CommitPreparationRequestMessageSchema,
  CommitReadyResponseMessage,
  TransferCompleteRequestMessage,
  TransferCompleteRequestMessageSchema,
  TransferCompleteResponseMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
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
  ISATPClientServiceOptions,
  ISATPServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { SATPSession } from "../../satp-session";
import { LockAssertionReceiptMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  AssignmentAssertionClaimError,
  BurnAssertionClaimError,
  MintAssertionClaimError,
  MissingBridgeManagerError,
  SessionError,
  TokenIdMissingError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import { State } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { create } from "@bufbuild/protobuf";

export class Stage3ClientService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ClientService.SERVICE_TYPE,
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

  async commitPreparation(
    response: LockAssertionReceiptMessage,
    session: SATPSession,
  ): Promise<void | CommitPreparationRequestMessage> {
    const stepTag = `commitPreparation()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_PREPARE];
    this.Log.debug(`${fnTag}, CommitPreparation...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
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
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_PREPARE,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.ASSERTION_RECEIPT,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      const commitPreparationRequestMessage = create(
        CommitPreparationRequestMessageSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.transferContextId != undefined) {
        commitPreparationRequestMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.clientTransferNumber != undefined) {
        commitPreparationRequestMessage.clientTransferNumber =
          sessionData.clientTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(commitPreparationRequestMessage)),
      );

      commitPreparationRequestMessage.clientSignature = messageSignature;

      saveSignature(sessionData, MessageType.COMMIT_PREPARE, messageSignature);

      saveHash(
        sessionData,
        MessageType.COMMIT_PREPARE,
        getHash(commitPreparationRequestMessage),
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending CommitPreparationMessage...`);

      return commitPreparationRequestMessage;
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

  async commitFinalAssertion(
    response: CommitReadyResponseMessage,
    session: SATPSession,
  ): Promise<void | CommitFinalAssertionRequestMessage> {
    const stepTag = `commitFinalAssertion()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_FINAL];
    this.Log.debug(`${fnTag}, CommitFinalAssertion...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
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
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_FINAL,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.COMMIT_READY,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });
      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      commonBody.sessionId = response.common!.sessionId;
      commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
      commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
      commonBody.resourceUrl = sessionData.resourceUrl;

      const commitFinalAssertionRequestMessage = create(
        CommitFinalAssertionRequestMessageSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.burnAssertionClaim == undefined) {
        throw new BurnAssertionClaimError(fnTag);
      }

      commitFinalAssertionRequestMessage.burnAssertionClaim =
        sessionData.burnAssertionClaim;

      if (sessionData.burnAssertionClaimFormat != undefined) {
        commitFinalAssertionRequestMessage.burnAssertionClaimFormat =
          sessionData.burnAssertionClaimFormat;
      }

      if (sessionData.transferContextId != undefined) {
        commitFinalAssertionRequestMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.clientTransferNumber != undefined) {
        commitFinalAssertionRequestMessage.clientTransferNumber =
          sessionData.clientTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(
          this.Signer,
          safeStableStringify(commitFinalAssertionRequestMessage),
        ),
      );

      commitFinalAssertionRequestMessage.clientSignature = messageSignature;

      saveSignature(sessionData, MessageType.COMMIT_FINAL, messageSignature);

      saveHash(
        sessionData,
        MessageType.COMMIT_FINAL,
        getHash(commitFinalAssertionRequestMessage),
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending CommitFinalAssertionMessage...`);

      return commitFinalAssertionRequestMessage;
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

  async transferComplete(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    session: SATPSession,
  ): Promise<void | TransferCompleteRequestMessage> {
    const stepTag = `transferComplete()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_TRANSFER_COMPLETE];
    this.Log.debug(`${fnTag}, TransferComplete...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
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
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.ACK_COMMIT_FINAL,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      const transferCompleteRequestMessage = create(
        TransferCompleteRequestMessageSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.transferContextId != undefined) {
        transferCompleteRequestMessage.common!.transferContextId =
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
        sign(this.Signer, safeStableStringify(transferCompleteRequestMessage)),
      );

      transferCompleteRequestMessage.clientSignature = messageSignature;
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

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending TransferCompleteMessage...`);

      return transferCompleteRequestMessage;
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

  async checkLockAssertionReceiptMessage(
    response: LockAssertionReceiptMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkLockAssertionReceiptMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CheckLockAssertionReceiptMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.ASSERTION_RECEIPT,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.ASSERTION_RECEIPT, getHash(response));

    this.Log.info(`${fnTag}, LockAssertionReceiptMessage passed all checks.`);
  }

  async checkCommitReadyResponseMessage(
    response: CommitReadyResponseMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitReadyResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitReadyResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.COMMIT_READY,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (response.mintAssertionClaimFormat != undefined) {
      //todo
      this.Log.info(
        `${fnTag},  Optional variable loaded: mintAssertionClaimsFormat `,
      );
      sessionData.mintAssertionClaimFormat = response.mintAssertionClaimFormat;
    }

    if (response.mintAssertionClaim == undefined) {
      //todo
      throw new MintAssertionClaimError(fnTag);
    }

    sessionData.mintAssertionClaim = response.mintAssertionClaim;

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));

    this.Log.info(`${fnTag}, CommitReadyResponseMessage passed all checks.`);
  }

  async checkCommitFinalAcknowledgementReceiptResponseMessage(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitFinalAcknowledgementReceiptResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitFinalAcknowledgementReceipt...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (response.assignmentAssertionClaim == undefined) {
      throw new AssignmentAssertionClaimError(fnTag);
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
      sessionData.serverTransferNumber != "" &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(response));

    this.Log.info(
      `${fnTag}, CommitFinalAcknowledgementReceiptResponseMessage passed all checks.`,
    );
  }

  async checkTransferCompleteResponseMessage(
    response: TransferCompleteResponseMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCompleteResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, TransferComplete...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      sessionData.serverTransferNumber != "" &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    sessionData.state = State.COMPLETED;

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      getHash(response),
    );

    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );
  }

  async burnAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${stepTag}`);
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "burn-asset",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    this.Log.debug(`${fnTag}, Burning Asset...`);
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      const assetId = sessionData.senderAsset?.tokenId;
      const amount = sessionData.senderAsset?.amount;

      this.Log.debug(`${fnTag}, Burn Asset ID: ${assetId} amount: ${amount}`);

      if (assetId == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (amount == undefined) {
        throw new Error(`${fnTag}, Amount is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.senderGatewayNetworkId,
      );

      sessionData.burnAssertionClaim = create(BurnAssertionClaimSchema, {});
      sessionData.burnAssertionClaim.receipt = await bridge.burnAsset(
        assetId,
        Number(amount),
      );
      sessionData.burnAssertionClaim.proof = await bridge.getProof(assetId);

      sessionData.burnAssertionClaimFormat = create(
        BurnAssertionClaimFormatSchema,
        {},
      );
      sessionData.burnAssertionClaimFormat.format = bridge.getReceiptFormat();
      sessionData.burnAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.burnAssertionClaim.receipt),
      );
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "done",
        data: safeStableStringify(sessionData.burnAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "BurnAsset", error);
    }
  }
}
