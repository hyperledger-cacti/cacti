import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";

import { SATPGateway } from "../../../gateway-refactor";
import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptRejectMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  CommonSatp,
  TransferClaims,
  NetworkCapabilities,
} from "../../../generated/proto/cacti/satp/v02/common/common_messages_pb";
import {
  MessageStagesHashes,
  MessageStagesSignatures,
  SessionData,
  Stage1Hashes,
  Stage1Signatures,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../constants";
import {
  bufArray2HexStr,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";

export class Stage1ClientHandler {
  public static readonly CLASS_NAME = "Stage1Handler-Client";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = Stage1ClientHandler.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return Stage1ClientHandler.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async transferProposalRequest(
    sessionID: string,
    gateway: SATPGateway,
  ): Promise<void | TransferProposalRequestMessage> {
    const fnTag = `${this.className}#transferProposalRequest()`;

    const sessionData = gateway.getSession(sessionID);

    if (
      sessionData == undefined ||
      sessionData.version == undefined ||
      sessionData.id == undefined ||
      //sessionData.transferContextId == undefined ||
      sessionData.digitalAssetId == undefined ||
      //sessionData.assetProfileId == undefined ||
      sessionData.originatorPubkey == undefined ||
      sessionData.beneficiaryPubkey == undefined ||
      sessionData.senderGatewayNetworkId == undefined ||
      sessionData.recipientGatewayNetworkId == undefined ||
      sessionData.clientGatewayPubkey == undefined ||
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.senderGatewayOwnerId == undefined ||
      sessionData.receiverGatewayOwnerId == undefined ||
      // sessionData.maxRetries == undefined ||
      // sessionData.maxTimeout == undefined ||
      sessionData.senderGatewayNetworkId == undefined ||
      sessionData.signatureAlgorithm == undefined ||
      sessionData.lockType == undefined ||
      sessionData.lockExpirationTime == undefined ||
      //sessionData.permitions == undefined ||
      //sessionData.developerUrn == undefined ||
      sessionData.credentialProfile == undefined ||
      //sessionData.applicationProfile == undefined ||
      sessionData.loggingProfile == undefined ||
      sessionData.accessControlProfile == undefined ||
      sessionData.lastSequenceNumber == undefined //||
      //sessionData.subsequentCalls == undefined ||
      //sessionData.history == undefined ||
      //sessionData.multipleClaimsAllowed == undefined ||
      //sessionData.multipleCancelsAllowed == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (
      !gateway.getSupportedDltIDs().includes(sessionData.senderGatewayNetworkId)
    ) {
      throw new Error(
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    if (sessionData.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.INIT_PROPOSAL;
    commonBody.sessionId = sessionData.id;
    // commonBody.transferContextId = sessionData.transferContextId;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.resourceUrl = "";

    //commonBody.actionResponse = new ActionResponse();
    // commonBody.credentialBlock = sessionData.credentialBlock;
    // commonBody.payloadProfile = sessionData.payloadProfile;
    // commonBody.applicationProfile = sessionData.applicationProfile;
    // commonBody.payload = new Payload();
    // commonBody.payloadHash = "";

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.hashPreviousMessage = "";

    const transferInitClaims = new TransferClaims();
    transferInitClaims.digitalAssetId = sessionData.digitalAssetId;
    transferInitClaims.assetProfileId = sessionData.assetProfileId;
    transferInitClaims.verifiedOriginatorEntityId =
      sessionData.verifiedOriginatorEntityId;
    transferInitClaims.verifiedBeneficiaryEntityId =
      sessionData.verifiedBeneficiaryEntityId;
    transferInitClaims.originatorPubkey = sessionData.originatorPubkey;
    transferInitClaims.beneficiaryPubkey = sessionData.beneficiaryPubkey;
    transferInitClaims.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    transferInitClaims.recipientGatewayNetworkId =
      sessionData.recipientGatewayNetworkId;
    transferInitClaims.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    transferInitClaims.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    transferInitClaims.senderGatewayOwnerId = sessionData.senderGatewayOwnerId;
    transferInitClaims.receiverGatewayOwnerId =
      sessionData.receiverGatewayOwnerId;

    const networkCapabilities = new NetworkCapabilities();
    networkCapabilities.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    networkCapabilities.signatureAlgorithm = sessionData.signatureAlgorithm;
    networkCapabilities.lockType = sessionData.lockType;
    networkCapabilities.lockExpirationTime = sessionData.lockExpirationTime;
    //networkCapabilities.permitions = sessionData.permitions;
    //networkCapabilities.developerUrn = sessionData.developerUrn;
    networkCapabilities.credentialProfile = sessionData.credentialProfile;
    //networkCapabilities.applicationProfile = sessionData.applicationProfile;
    networkCapabilities.loggingProfile = sessionData.loggingProfile;
    networkCapabilities.accessControlProfile = sessionData.accessControlProfile;
    //networkCapabilities.subsequentCalls = sessionData.subsequentCalls;
    //networkCapabilities.history = sessionData.history;

    const transferProposalRequestMessage = new TransferProposalRequestMessage();
    transferProposalRequestMessage.common = commonBody;
    transferProposalRequestMessage.transferInitClaims = transferInitClaims;
    // transferProposalRequestMessage.transferInitClaimsFormat = sessionData.transferInitClaimsFormat;
    transferProposalRequestMessage.networkCapabilities = networkCapabilities;
    // transferProposalRequestMessage.multipleClaimsAllowed = sessionData.multipleClaimsAllowed;
    // transferProposalRequestMessage.multipleCancelsAllowed = sessionData.multipleCancelsAllowed;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(transferProposalRequestMessage),
      ),
    );

    transferProposalRequestMessage.common.signature = messageSignature;

    sessionData.signatures = new MessageStagesSignatures();
    sessionData.signatures.stage1 = new Stage1Signatures();
    sessionData.signatures.stage1.transferCommenceRequestMessageClientSignature =
      messageSignature;

    sessionData.hashes = new MessageStagesHashes();
    sessionData.hashes.stage1 = new Stage1Hashes();

    sessionData.hashes.stage1.transferCommenceRequestMessageHash = SHA256(
      JSON.stringify(transferProposalRequestMessage),
    ).toString();

    await storeLog(gateway, {
      sessionID: sessionID,
      type: "transferProposalRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferProposalRequest...`);

    return transferProposalRequestMessage;
  }

  async transferCommenceRequest(
    response: TransferProposalReceiptRejectMessage,
    gateway: SATPGateway,
  ): Promise<void | TransferCommenceRequestMessage> {
    const fnTag = `${this.className}#transferCommenceRequest()`;

    if (!response || !response.common) {
      throw new Error("Response or response.common is undefined");
    }

    //const sessionData = gateway.sessions.get(response.common.sessionId);
    const sessionData = new SessionData(); //todo change

    if (
      sessionData == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined
    ) {
      throw new Error("Session data not loaded successfully");
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_REQUEST;
    commonBody.sequenceNumber = response.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage =
      sessionData.hashes.stage1.transferProposalReceiptMessageHash; //todo

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;

    const transferCommenceRequestMessage = new TransferCommenceRequestMessage();
    transferCommenceRequestMessage.common = commonBody;
    transferCommenceRequestMessage.hashTransferInitClaims =
      sessionData.hashTransferInitClaims;
    // transferCommenceRequestMessage.clientTransferNumber = sessionData.clientTransferNumber;

    const messageSignature = bufArray2HexStr(
      sign(
        gateway.gatewaySigner,
        JSON.stringify(transferCommenceRequestMessage),
      ),
    );

    transferCommenceRequestMessage.common.signature = messageSignature;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferCommenceRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferCommenceRequest...`);

    return transferCommenceRequestMessage;
  }

  async checkTransferProposalReceiptRejectMessage(
    response: TransferProposalReceiptRejectMessage,
    gateway: SATPGateway,
  ): Promise<void> {
    const fnTag = `${this.className}#checkTransferProposalReceiptRejectMessage()`;

    if (response.common == undefined) {
      throw new Error(`${fnTag}, message has no satp common body`);
    }

    if (
      response.common.version == undefined ||
      response.common.sequenceNumber == undefined ||
      response.common.hashPreviousMessage == undefined ||
      response.timestamp == undefined
    ) {
      throw new Error(`${fnTag}, satp common body is missing required fields`);
    }

    const sessionId = response.common.sessionId;

    const sessionData = gateway.getSession(sessionId);

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage1.transferProposalRequestMessageHash ==
        undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined
    ) {
      throw new Error(`${fnTag}, session data was not loaded correctly`);
    }

    if (response.common.version != sessionData.version) {
      throw new Error(`${fnTag}, TransferCommenceRequest version mismatch`);
    }

    if (
      response.common.messageType != MessageType.INIT_RECEIPT &&
      response.common.messageType != MessageType.INIT_REJECT
    ) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceRequest()`,
      );
    }

    if (
      response.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt Message sequence number is wrong`,
      );
    }

    if (
      response.common.hashPreviousMessage == undefined ||
      response.common.hashPreviousMessage !=
        sessionData.hashes.stage1.transferProposalRequestMessageHash
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt Message previous message hash is wrong`,
      );
    }

    if (
      response.common.hashPreviousMessage !=
      sessionData.hashes.stage1.transferProposalRequestMessageHash
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt previous message hash does not match the one that was sent`,
      );
    }

    if (
      response.common.serverGatewayPubkey != sessionData.serverGatewayPubkey
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      response.common.clientGatewayPubkey != sessionData.clientGatewayPubkey
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt clientIdentity public key does not match the one that was sent`,
      );
    }

    if (
      !verifySignature(
        gateway.gatewaySigner,
        response,
        sessionData.serverGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt message signature verification failed`,
      );
    }

    this.log.info(`TransferProposalReceipt passed all checks.`);
  }
}
