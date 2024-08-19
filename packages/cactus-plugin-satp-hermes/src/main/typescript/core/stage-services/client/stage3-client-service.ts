import {
  BurnAssertionClaim,
  BurnAssertionClaimFormat,
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
    this.Log.debug(`${fnTag}, CommitPreparation...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_PREPARE;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ASSERTION_RECEIPT,
    );
    commonBody.sessionId = response.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

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
      sign(this.Signer, safeStableStringify(commitPreparationRequestMessage)),
    );

    commitPreparationRequestMessage.clientSignature = messageSignature;

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
      data: safeStableStringify(sessionData),
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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_FINAL;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_READY,
    );

    commonBody.sessionId = response.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.resourceUrl = sessionData.resourceUrl;

    const commitFinalAssertionRequestMessage =
      new CommitFinalAssertionRequestMessage();
    commitFinalAssertionRequestMessage.common = commonBody;

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
      commitFinalAssertionRequestMessage.common.transferContextId =
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

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "commitFinalAssertion",
      operation: "lock",
      data: safeStableStringify(sessionData),
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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_TRANSFER_COMPLETE;
    commonBody.resourceUrl = sessionData.resourceUrl;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common!.sequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
    );

    commonBody.sessionId = response.common!.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

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
      sign(this.Signer, safeStableStringify(transferCompleteRequestMessage)),
    );

    transferCompleteRequestMessage.clientSignature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      messageSignature,
    );
    sessionData.completed = true;
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
      data: safeStableStringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending TransferCompleteMessage...`);

    return transferCompleteRequestMessage;
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

  async burnAsset(session: SATPSession): Promise<void> {
    const stepTag = `lockAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.debug(`${fnTag}, Burning Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      session.verify(fnTag, SessionType.CLIENT);

      const sessionData = session.getClientSessionData();

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

      sessionData.burnAssertionClaim = new BurnAssertionClaim();
      sessionData.burnAssertionClaim.receipt = await bridge.burnAsset(
        assetId,
        Number(amount),
      );
      sessionData.burnAssertionClaim.proof = await bridge.getProof(assetId);

      sessionData.burnAssertionClaimFormat = new BurnAssertionClaimFormat();
      sessionData.burnAssertionClaimFormat.format = bridge.getReceiptFormat();
      sessionData.burnAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.burnAssertionClaim.receipt),
      );
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      throw new FailedToProcessError(fnTag, "BurnAsset");
    }
  }
}
