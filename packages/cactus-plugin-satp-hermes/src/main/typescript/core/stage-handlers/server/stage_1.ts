import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";

import { PluginSATPGateway } from "../../../plugin-satp-gateway";
import { TransferCommenceResponseMessage, TransferCommenceRequestMessage, TransferProposalRequestMessage, TransferProposalReceiptRejectMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import { MessageType, CommonSatp } from "../../../generated/proto/cacti/satp/v02/common/common_messages_pb";
import { MessageStagesHashes, MessageStagesSignatures, MessageStagesTimestamps, SessionData, Stage1Hashes, Stage1Signatures, Stage1Timestamps } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../constants";

export class Stage1Handler {
  public static readonly CLASS_NAME = "Stage1Handler-Server";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = Stage1Handler.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return Stage1Handler.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }
 
  async transferProposalResponse(
    request: TransferProposalRequestMessage,
    gateway: PluginSATPGateway,
  ): Promise<void | TransferProposalReceiptRejectMessage> {
    const fnTag = `${gateway.className}#transferProposalResponse()`;
    
    const recvTimestamp: string = Date.now().toString();

    if(request.common == undefined ||
      request.transferInitClaims == undefined ||
      request.networkCapabilities == undefined
      ){
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    const sessionData = new SessionData();
    sessionData.id = request.common.sessionId;
    sessionData.version = request.common.version;
    sessionData.digitalAssetId = request.transferInitClaims.digitalAssetId;
    //sessionData.assetProfile = request.common.payloadProfile.assetProfile;
    // sessionData.applicationProfile = request.networkCapabilities.applicationProfile;
    sessionData.originatorPubkey = request.common.clientGatewayPubkey;
    sessionData.beneficiaryPubkey = request.common.serverGatewayPubkey;
    sessionData.senderGatewayNetworkId = request.transferInitClaims.senderGatewayNetworkId;
    sessionData.recipientGatewayNetworkId = request.transferInitClaims.recipientGatewayNetworkId;
    sessionData.clientGatewayPubkey = request.common.clientGatewayPubkey;
    sessionData.serverGatewayPubkey = request.common.serverGatewayPubkey;
    sessionData.receiverGatewayOwnerId = request.transferInitClaims.receiverGatewayOwnerId;
    sessionData.senderGatewayOwnerId = request.transferInitClaims.senderGatewayOwnerId;
    sessionData.signatureAlgorithm = request.networkCapabilities.signatureAlgorithm;
    sessionData.lockType = request.networkCapabilities.lockType;
    sessionData.lockExpirationTime = request.networkCapabilities.lockExpirationTime;
    sessionData.credentialProfile = request.networkCapabilities.credentialProfile;
    sessionData.loggingProfile = request.networkCapabilities.loggingProfile;
    sessionData.accessControlProfile = request.networkCapabilities.accessControlProfile;

    // sessionData.maxRetries = request.transferInitClaims.maxRetries;
    // sessionData.maxTimeout = request.transferInitClaims.maxTimeout;
    
    sessionData.signatures = new MessageStagesSignatures();
    sessionData.signatures.stage1 = new Stage1Signatures();
    sessionData.signatures.stage1.transferCommenceRequestMessageClientSignature = request.common.signature;

    sessionData.lastMessageReceivedTimestamp = recvTimestamp;

    sessionData.sourceLedgerAssetId = request.transferInitClaims.verifiedOriginatorEntityId;
    sessionData.recipientLedgerAssetId = request.transferInitClaims.verifiedBeneficiaryEntityId; // todo souldnt be the server to create this id?


    sessionData.hashTransferInitClaims = SHA256(
      JSON.stringify(request.transferInitClaims),
    ).toString();

    sessionData.hashes = new MessageStagesHashes();
    sessionData.hashes.stage1 = new Stage1Hashes();

    sessionData.hashes.stage1.transferCommenceRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();
    

    sessionData.lastSequenceNumber = request.common.sequenceNumber + BigInt(1);

    sessionData.processedTimestamps = new MessageStagesTimestamps();
    sessionData.processedTimestamps.stage1 = new Stage1Timestamps();

    sessionData.receivedTimestamps = new MessageStagesTimestamps();
    sessionData.receivedTimestamps.stage1 = new Stage1Timestamps();
    
    sessionData.receivedTimestamps.stage1.transferCommenceRequestMessageTimestamp = recvTimestamp; 

    //gateway.sessions.set(request.common.sessionId, sessionData);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.INIT_RECEIPT;
    commonBody.sessionId = sessionData.id;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.resourceUrl = request.common.resourceUrl;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.hashPreviousMessage = sessionData.hashTransferInitClaims;

    //todo if rejection 
    const transferProposalReceiptMessage = new TransferProposalReceiptRejectMessage();
    transferProposalReceiptMessage.common = commonBody;

    sessionData.processedTimestamps.stage1.transferCommenceRequestMessageTimestamp = Date.now().toString();
    transferProposalReceiptMessage.timestamp = sessionData.processedTimestamps.stage1.transferCommenceRequestMessageTimestamp;
    
    const messageSignature = PluginSATPGateway.bufArray2HexStr(
        gateway.sign(JSON.stringify(transferProposalReceiptMessage)),
      );

    transferProposalReceiptMessage.common.signature = messageSignature;
    
    sessionData.signatures.stage1.transferProposalReceiptMessageServerSignature = messageSignature;
    sessionData.hashes.stage1.transferProposalReceiptMessageHash = SHA256(
      JSON.stringify(transferProposalReceiptMessage),
    ).toString();

    this.log.info(`${fnTag}, sending TransferProposalResponse...`);

    return transferProposalReceiptMessage;    
  }


  async transferCommenceResponse(
    request: TransferCommenceRequestMessage,
    gateway: PluginSATPGateway,
  ): Promise<void | TransferCommenceResponseMessage> {
    const fnTag = `${gateway.className}#transferCommenceResponse()`;

    const recvTimestamp: string = Date.now().toString();

    if(request.common == undefined){
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }
  
    //const sessionData = gateway.sessions.get(request.common.sessionId);
    const sessionData = new SessionData(); //todo change 

    if (sessionData == undefined || sessionData.hashes == undefined || sessionData.hashes.stage1 == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    sessionData.hashes.stage1.transferCommenceRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.lastMessageReceivedTimestamp = recvTimestamp;
    this.log.info(`TransferCommenceRequest passed all checks.`);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_RESPONSE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = sessionData.hashes.stage1.transferCommenceRequestMessageHash; //todo

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;

    const transferCommenceResponseMessage = new TransferCommenceResponseMessage();
    transferCommenceResponseMessage.common = commonBody;
    
    sessionData.lastSequenceNumber = commonBody.sequenceNumber;
    //sessionData.processedTimestamps.stage1.transferCommenceRequestMessageTimestamp = Date.now().toString();
    

    sessionData.hashes.stage1.transferCommenceResponseMessageHash = SHA256(
      JSON.stringify(transferCommenceResponseMessage),
    ).toString();

    this.log.info(`${fnTag}, sending TransferCommenceResponse...`);

    return transferCommenceResponseMessage;  
  }


  checkTransferProposalRequestMessage(
    request: TransferProposalRequestMessage,
    gateway: PluginSATPGateway,
  ): void{
    const fnTag = `${gateway.className}#checkTransferProposalRequestMessage()`;
    
    if(request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      // request.common.transferContextId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      // request.common.actionResponse == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined 
      ){
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(
        `${fnTag}, unsupported SATP version`,
      );
    }

    //todo there is not a session data already here?

    if (!gateway.verifySignature(request.common, request.common.clientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, TransferProposalRequest message signature verification failed`,
      );
    }

    if (request.common.messageType != MessageType.INIT_PROPOSAL) {
      throw new Error(
        `${fnTag}, wrong message type for TransferProposalRequest`,
      );
    }

    if (request.transferInitClaims == undefined) {
      throw new Error(
        `${fnTag}, TransferProposalRequest message does not contain transfer initialization claims`,
      );
    }

    if (request.networkCapabilities == undefined) {
      throw new Error(
        `${fnTag}, TransferProposalRequest message does not contain network capabilities and parameters`,
      );
    }

    if (!gateway.supportedDltIDs.includes(request.transferInitClaims.senderGatewayNetworkId)) {
      throw new Error(
        `${fnTag}, source gateway dlt system is not supported by this gateway`,
      );
    }

    this.log.info(`TransferProposalRequest passed all checks.`);
  }

  async checkTransferCommenceRequestMessage(
    request: TransferCommenceRequestMessage,
    gateway: PluginSATPGateway,
  ): Promise<void> {
    const fnTag = `${gateway.className}#transferCommenceResponse()`;

    const recvTimestamp: string = Date.now().toString();

    if(request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      // request.common.transferContextId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      // request.common.actionResponse == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined 
      ){
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(
        `${fnTag}, unsupported SATP version`,
      );
    }

    //const sessionData = gateway.sessions.get(request.common.sessionId);
    const sessionData = new SessionData(); //todo change 

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage1.transferProposalRequestMessageHash == undefined ||
      sessionData.lastSequenceNumber == undefined
      ) {
      throw new Error(
        `${fnTag}, session data was not load correctly`,
      );
    }

    if (request.common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (request.common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    if (!gateway.verifySignature(request.common, request.common.clientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }

    if (request.common.messageType != MessageType.TRANSFER_COMMENCE_REQUEST) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceRequest`,
      );
    }

    if (request.common.sequenceNumber != sessionData.lastSequenceNumber + BigInt(1)) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest Message sequence number is wrong`,
      );
    }

    if (
      request.common.hashPreviousMessage != sessionData.hashes.stage1.transferProposalReceiptMessageHash //todo 
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest previous message hash does not match the one that was sent`,
      );
    }

    if (request.hashTransferInitClaims == undefined || request.hashTransferInitClaims != sessionData.hashTransferInitClaims) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message does not contain transfer claims`,
      );
    }

    if (
      !gateway.verifySignature(request, sessionData.clientGatewayPubkey) //todo change
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }
  
    this.log.info(`TransferCommenceRequest passed all checks.`);
  }

}