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
import {
  HashMissMatch,
  MessageTypeMissMatch,
  MissingAssignmentAssertionClaim,
  MissingBridgeManager,
  MissingBurnAssertionClaim,
  MissingClientGatewayPubkey,
  MissingMintAssertionClaim,
  MissingSatpCommonBody,
  MissingServerGatewayPubkey,
  SATPVersionUnsupported,
  SequenceNumberMissMatch,
  SessionDataNotLoadedCorrectly,
  SessionUndefined,
  SignatureVerificationFailed,
  TransferContextIdMissMatch,
} from "../errors";

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
      throw MissingBridgeManager(`${this.getServiceIdentifier()}#constructor`);
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
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_PREPARE;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ASSERTION_RECEIPT,
    );
    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

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

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_FINAL;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.COMMIT_READY,
    );

    commonBody.sessionId = response.common.sessionId;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

    const commitFinalAssertionRequestMessage =
      new CommitFinalAssertionRequestMessage();
    commitFinalAssertionRequestMessage.common = commonBody;

    if (sessionData.burnAssertionClaim == undefined) {
      throw MissingBurnAssertionClaim(fnTag);
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
      sign(this.Signer, JSON.stringify(commitFinalAssertionRequestMessage)),
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

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    const commonBody = new CommonSatp();
    commonBody.version = SATP_VERSION;
    commonBody.messageType = MessageType.COMMIT_TRANSFER_COMPLETE;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      response.common.sequenceNumber + BigInt(1);

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
    );

    commonBody.sessionId = response.common.sessionId;
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
      sign(this.Signer, JSON.stringify(transferCompleteRequestMessage)),
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

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (response.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(
        fnTag,
        response.common.version,
        SATP_VERSION,
      );
    }

    if (response.common.messageType != MessageType.ASSERTION_RECEIPT) {
      throw MessageTypeMissMatch(
        fnTag,
        response.common.messageType.toString(),
        MessageType.ASSERTION_RECEIPT.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        response.common.sequenceNumber,
        sessionData.lastSequenceNumber + BigInt(1),
      );
    }

    if (
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.LOCK_ASSERT)
    ) {
      throw HashMissMatch(
        fnTag,
        response.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.LOCK_ASSERT),
      );
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(
        this.Signer,
        response,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        response.common.transferContextId,
        sessionData.transferContextId,
      );
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

  checkCommitReadyResponseMessage(
    response: CommitReadyResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkCommitReadyResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitReadyResponse...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (response.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(
        fnTag,
        response.common.version,
        SATP_VERSION,
      );
    }

    if (response.common.messageType != MessageType.COMMIT_READY) {
      throw MessageTypeMissMatch(
        fnTag,
        response.common.messageType.toString(),
        MessageType.COMMIT_READY.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        response.common.sequenceNumber,
        sessionData.lastSequenceNumber + BigInt(1),
      );
    }

    if (
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.COMMIT_PREPARE)
    ) {
      throw HashMissMatch(
        fnTag,
        response.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.COMMIT_PREPARE),
      );
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(
        this.Signer,
        response,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw SignatureVerificationFailed(fnTag);
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
      throw MissingMintAssertionClaim(fnTag);
    }

    sessionData.mintAssertionClaim = response.mintAssertionClaim;

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        response.common.transferContextId,
        sessionData.transferContextId,
      );
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

    saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));

    this.Log.info(`${fnTag}, CommitReadyResponseMessage passed all checks.`);
  }

  checkCommitFinalAcknowledgementReceiptResponseMessage(
    response: CommitFinalAcknowledgementReceiptResponseMessage,
    session: SATPSession,
  ): void {
    const stepTag = `checkCommitFinalAcknowledgementReceiptResponseMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitFinalAcknowledgementReceipt...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getClientSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (response.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (response.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(
        fnTag,
        response.common.version,
        SATP_VERSION,
      );
    }

    if (response.common.messageType != MessageType.ACK_COMMIT_FINAL) {
      throw MessageTypeMissMatch(
        fnTag,
        response.common.messageType.toString(),
        MessageType.ACK_COMMIT_FINAL.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      response.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        response.common.sequenceNumber,
        sessionData.lastSequenceNumber + BigInt(1),
      );
    }

    if (
      response.common.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.COMMIT_FINAL)
    ) {
      throw HashMissMatch(
        fnTag,
        response.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.COMMIT_FINAL),
      );
    }

    if (
      sessionData.clientGatewayPubkey != response.common.clientGatewayPubkey
    ) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      sessionData.serverGatewayPubkey != response.common.serverGatewayPubkey
    ) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(
        this.Signer,
        response,
        response.common.serverGatewayPubkey,
      )
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (
      sessionData.transferContextId != undefined &&
      response.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        response.common.transferContextId,
        sessionData.transferContextId,
      );
    }

    if (response.assignmentAssertionClaim == undefined) {
      throw MissingAssignmentAssertionClaim(fnTag);
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
      const sessionData = session.getClientSessionData();
      if (sessionData == undefined) {
        throw new Error(`${fnTag}, Session data is missing`);
      }
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountFromOriginator;

      this.Log.debug(`${fnTag}, Burn Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.senderGatewayNetworkId,
      );

      sessionData.burnAssertionClaim = new BurnAssertionClaim();
      sessionData.burnAssertionClaim.receipt = await bridge.burnAsset(
        assetId,
        Number(amount),
      );
      sessionData.burnAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.burnAssertionClaim.receipt),
      );
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process Burn Asset ${error}`);
    }
  }
}
