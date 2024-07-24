import {
  TransferCommenceResponseMessage,
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  CommonSatp,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SessionData } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../constants";
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import { TransferClaims } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  TimestampType,
  getMessageHash,
  getMessageTimestamp,
  saveHash,
  saveSignature,
} from "../../session-utils";
import { SupportedChain } from "../../types";
import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";

export class Stage1ServerService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;

  constructor(ops: ISATPServerServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage1ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage1ServerService.SERVICE_TYPE,
    };
    super(commonOptions);
  }

  async transferProposalResponse(
    request: TransferProposalRequestMessage,
    session: SATPSession | undefined,
  ): Promise<void | TransferProposalReceiptMessage> {
    const stepTag = `transferProposalResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferProposalResponse...`);

    if (
      request.common == undefined ||
      request.transferInitClaims == undefined ||
      request.networkCapabilities == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (session == undefined) {
      throw new Error(`${fnTag}, session is undefined`);
    }
    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    saveSignature(
      sessionData,
      MessageType.INIT_PROPOSAL,
      request.common.signature,
    );

    sessionData.sourceLedgerAssetId =
      request.transferInitClaims.verifiedOriginatorEntityId;
    sessionData.recipientLedgerAssetId =
      request.transferInitClaims.verifiedBeneficiaryEntityId; // todo shouldn't be the server to create this id?

    sessionData.hashTransferInitClaims = getHash(request.transferInitClaims);

    saveHash(sessionData, MessageType.INIT_PROPOSAL, getHash(request));

    sessionData.lastSequenceNumber = request.common.sequenceNumber + BigInt(1);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;

    commonBody.sessionId = sessionData.id;
    commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
    commonBody.resourceUrl = request.common.resourceUrl;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.INIT_PROPOSAL,
    );

    const transferProposalReceiptMessage = new TransferProposalReceiptMessage();
    transferProposalReceiptMessage.common = commonBody;
    transferProposalReceiptMessage.hashTransferInitClaims =
      sessionData.hashTransferInitClaims;
    transferProposalReceiptMessage.timestamp = getMessageTimestamp(
      sessionData,
      MessageType.INIT_PROPOSAL,
      TimestampType.RECEIVED,
    );

    /*
    if (reject) {
      commonBody.messageType = MessageType.INIT_REJECT;
      const counterProposalTransferClaims = this.counterProposalTransferClaims(
        request.transferInitClaims,
      );

      if (!counterProposalTransferClaims) {
        this.Log.info(`${fnTag}, ProposalTransferClaims were rejected...`);
        sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_REJECTED;
      } else {
        sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_CONDITIONAL;
        transferProposalReceiptMessage.transferCounterClaims =
          counterProposalTransferClaims;
      }
    } else {
      commonBody.messageType = MessageType.INIT_RECEIPT;
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_ACCEPTED;
    }
    */

    if (sessionData.transferContextId != undefined) {
      transferProposalReceiptMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferProposalReceiptMessage)),
    );

    transferProposalReceiptMessage.common.signature = messageSignature;

    saveSignature(sessionData, commonBody.messageType, messageSignature);

    saveHash(
      sessionData,
      commonBody.messageType,
      getHash(transferProposalReceiptMessage),
    );

    // TODO: store logs in the database using session ID; refactor storelog not to need gateway as input
    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferProposalResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending TransferProposalResponseMessage...`);

    return transferProposalReceiptMessage;
  }

  async transferCommenceResponse(
    request: TransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<void | TransferCommenceResponseMessage> {
    const stepTag = `transferCommenceResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferCommenceResponse...`);

    if (request.common == undefined) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (session == undefined) {
      throw new Error(`${fnTag}, session is undefined`);
    }
    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
      );
    }

    saveHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      getHash(request),
    );

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_RESPONSE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;

    const transferCommenceResponseMessage =
      new TransferCommenceResponseMessage();
    transferCommenceResponseMessage.common = commonBody;

    if (sessionData.transferContextId != undefined) {
      transferCommenceResponseMessage.common.transferContextId =
        sessionData.transferContextId;
    }

    if (sessionData.serverTransferNumber != undefined) {
      transferCommenceResponseMessage.serverTransferNumber =
        sessionData.serverTransferNumber;
    }

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferCommenceResponseMessage)),
    );

    transferCommenceResponseMessage.common.signature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
      messageSignature,
    );

    saveHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_RESPONSE,
      getHash(transferCommenceResponseMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferCommenceResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending TransferCommenceResponseMessage...`);

    return transferCommenceResponseMessage;
  }

  async checkTransferProposalRequestMessage(
    request: TransferProposalRequestMessage,
    session: SATPSession | undefined,
    supportedDLTs: SupportedChain[],
  ): Promise<SessionData> {
    const stepTag = `checkTransferProposalRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferProposalRequestMessage...`);

    if (session == undefined) {
      throw new Error(`${fnTag}, session is undefined`);
    }
    const sessionData = session.getSessionData();

    if (request.common == undefined) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    if (
      !verifySignature(
        this.Signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
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
    const senderId = request.transferInitClaims
      .senderGatewayNetworkId as SupportedChain;

    if (!supportedDLTs.includes(senderId)) {
      throw new Error( //todo change this to the transferClaims check
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    this.Log.info(`TransferProposalRequest passed all checks.`);

    sessionData.version = request.common.version;
    sessionData.digitalAssetId = request.transferInitClaims.digitalAssetId;
    sessionData.originatorPubkey = request.transferInitClaims.originatorPubkey;
    sessionData.beneficiaryPubkey =
      request.transferInitClaims.beneficiaryPubkey;
    sessionData.senderGatewayNetworkId =
      request.transferInitClaims.senderGatewayNetworkId;
    sessionData.recipientGatewayNetworkId =
      request.transferInitClaims.recipientGatewayNetworkId;
    sessionData.clientGatewayPubkey =
      request.transferInitClaims.clientGatewayPubkey;
    sessionData.serverGatewayPubkey =
      request.transferInitClaims.serverGatewayPubkey;
    sessionData.receiverGatewayOwnerId =
      request.transferInitClaims.receiverGatewayOwnerId;
    sessionData.senderGatewayOwnerId =
      request.transferInitClaims.senderGatewayOwnerId;
    sessionData.signatureAlgorithm =
      request.networkCapabilities.signatureAlgorithm;
    sessionData.lockType = request.networkCapabilities.lockType;
    sessionData.lockExpirationTime =
      request.networkCapabilities.lockExpirationTime;
    sessionData.credentialProfile =
      request.networkCapabilities.credentialProfile;
    sessionData.loggingProfile = request.networkCapabilities.loggingProfile;
    sessionData.accessControlProfile =
      request.networkCapabilities.accessControlProfile;

    this.Log.info(`Session data created for session id ${sessionData.id}`);
    if (!this.checkTransferClaims(request.transferInitClaims)) {
      throw new Error();
    }
    return sessionData;
  }

  async checkTransferCommenceRequestMessage(
    request: TransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<SessionData> {
    const stepTag = `checkTransferCommenceRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      request.common.signature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined ||
      request.common.hashPreviousMessage == undefined ||
      request.common.signature == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.common.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    if (session == undefined) {
      throw new Error(`${fnTag}, session is undefined`);
    }
    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${request.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage1.transferProposalReceiptMessageHash ==
        undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(`${fnTag}, session data was not load correctly`);
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

    if (
      !verifySignature(
        this.Signer,
        request.common,
        request.common.clientGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }

    if (request.common.messageType != MessageType.TRANSFER_COMMENCE_REQUEST) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceRequest`,
      );
    }

    if (
      request.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest Message sequence number is wrong`,
      );
    }

    if (
      request.common.hashPreviousMessage !=
      sessionData.hashes.stage1.transferProposalReceiptMessageHash
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest previous message hash does not match the one that was sent`,
      );
    }

    if (
      request.hashTransferInitClaims == undefined ||
      request.hashTransferInitClaims != sessionData.hashTransferInitClaims
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message does not contain transfer claims`,
      );
    }

    if (
      !verifySignature(this.Signer, request, sessionData.clientGatewayPubkey)
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }

    if (
      sessionData.transferContextId != undefined &&
      request.common.transferContextId != sessionData.transferContextId
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message transfer context id does not match the one that was sent`,
      );
    }

    if (request.clientTransferNumber != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: clientTransferNumber...`,
      );
      sessionData.clientTransferNumber = request.clientTransferNumber;
    }

    this.Log.info(`${fnTag}, TransferCommenceRequest passed all checks.`);
    return sessionData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkTransferClaims(transferClaims: TransferClaims): boolean {
    //todo
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private counterProposalTransferClaims(
    oldClaims: TransferClaims,
  ): TransferClaims {
    //todo
    return oldClaims;
  }
}
