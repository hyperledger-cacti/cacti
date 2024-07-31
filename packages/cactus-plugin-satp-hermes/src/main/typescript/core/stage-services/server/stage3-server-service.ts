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
      throw MissingBridgeManager(`${this.getServiceIdentifier()}#constructor`);
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
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

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

    if (sessionData.mintAssertionClaim == undefined) {
      throw MissingMintAssertionClaim(fnTag);
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
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

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

    if (sessionData.assignmentAssertionClaim == undefined) {
      throw MissingAssignmentAssertionClaim(fnTag);
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
  ): Promise<SessionData> {
    const stepTag = `checkCommitPreparationRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkCommitPreparationRequestMessage...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (request.common.messageType != MessageType.COMMIT_PREPARE) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.COMMIT_PREPARE.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      request.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        sessionData.lastSequenceNumber,
        request.common.sequenceNumber,
      );
    }

    if (
      getMessageHash(sessionData, MessageType.ASSERTION_RECEIPT) !=
      request.common.hashPreviousMessage
    ) {
      throw HashMissMatch(
        fnTag,
        request.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.ASSERTION_RECEIPT),
      );
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, request.common.clientGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        request.common.transferContextId,
        sessionData.transferContextId,
      );
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

    saveHash(sessionData, MessageType.COMMIT_PREPARE, getHash(request));

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

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (request.common.messageType != MessageType.COMMIT_FINAL) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.COMMIT_FINAL.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      request.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        request.common.sequenceNumber,
        sessionData.lastSequenceNumber,
      );
    }

    if (
      getMessageHash(sessionData, MessageType.COMMIT_READY) !=
      request.common.hashPreviousMessage
    ) {
      throw HashMissMatch(
        fnTag,
        request.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.COMMIT_READY),
      );
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, request.common.clientGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        request.common.transferContextId,
        sessionData.transferContextId,
      );
    }
    //todo check burn
    if (request.burnAssertionClaim == undefined) {
      throw MissingBurnAssertionClaim(fnTag);
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

    return sessionData;
  }

  async checkTransferCompleteRequestMessage(
    request: TransferCompleteRequestMessage,
    session: SATPSession,
  ): Promise<SessionData> {
    const stepTag = `checkTransferCompleteRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferCompleteRequestMessage...`);

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.version == undefined ||
      sessionData.signatures == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common == undefined) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (request.common.messageType != MessageType.COMMIT_TRANSFER_COMPLETE) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.COMMIT_TRANSFER_COMPLETE.toString(),
      );
    }

    if (
      sessionData.lastSequenceNumber + BigInt(1) !=
      request.common.sequenceNumber
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        request.common.sequenceNumber,
        sessionData.lastSequenceNumber,
      );
    }

    if (
      getMessageHash(sessionData, MessageType.ACK_COMMIT_FINAL) !=
      request.common.hashPreviousMessage
    ) {
      throw HashMissMatch(
        fnTag,
        request.common.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.ACK_COMMIT_FINAL),
      );
    }

    if (
      getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_REQUEST) !=
      request.hashTransferCommence
    ) {
      throw HashMissMatch(
        fnTag,
        request.hashTransferCommence,
        getMessageHash(sessionData, MessageType.TRANSFER_COMMENCE_REQUEST),
      );
    }

    if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, request.common.clientGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    this.Log.info(
      `${fnTag}, TransferCompleteRequestMessage passed all checks.`,
    );

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw TransferContextIdMissMatch(
        fnTag,
        request.common.transferContextId,
        sessionData.transferContextId,
      );
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

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE,
      getHash(request),
    );

    return sessionData;
  }
  async mintAsset(session: SATPSession): Promise<void> {
    const stepTag = `mintAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Minting Asset...`);
      const sessionData = session.getServerSessionData();
      if (sessionData == undefined) {
        throw new Error(`${fnTag}, Session data not found`);
      }
      const assetId = sessionData.transferInitClaims?.digitalAssetId;
      const amount = sessionData.transferInitClaims?.amountToBeneficiary;

      this.logger.debug(
        `${fnTag}, Mint Asset ID: ${assetId} amount: ${amount}`,
      );
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
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
      throw new Error(`${fnTag}, Failed to process Mint Asset ${error}`);
    }
  }

  async assignAsset(session: SATPSession): Promise<void> {
    const stepTag = `assignAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Assigning Asset...`);
      const sessionData = session.getServerSessionData();
      if (sessionData == undefined) {
        throw new Error(`${fnTag}, Session data not found`);
      }
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
      throw new Error(`${fnTag}, Failed to process Assign Asset ${error}`);
    }
  }
}
