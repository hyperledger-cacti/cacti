import {
  PreTransferCommenceRequestMessage,
  PreTransferCommenceResponseMessage,
  PreTransferVerificationAndContextEstablishmentRequest,
  PreTransferVerificationAndContextEstablishmentResponse,
} from "../../../generated/proto/cacti/satp/v02/stage_0_pb";
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

export class Stage0ServerService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;

  constructor(ops: ISATPServerServiceOptions) {
    // for now stage0serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ServerService.SERVICE_TYPE,
    };
    super(commonOptions);
  }

  async preTransferProposalResponse(
    request: PreTransferVerificationAndContextEstablishmentRequest,
    session: SATPSession | undefined,
  ): Promise<void | PreTransferVerificationAndContextEstablishmentResponse> {
    const stepTag = `transferProposalResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (request.context == undefined || request.transferClaims == undefined) {
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
        `${fnTag}, session data not found for session id ${request.context.sessionId}`,
      );
    }

    saveSignature(
      sessionData,
      MessageType.PRE_INIT_PROPOSAL,
      request.context.signature,
    );

    sessionData.sourceLedgerAssetId =
      request.transferClaims.verifiedOriginatorEntityId;
    sessionData.recipientLedgerAssetId =
      request.transferClaims.verifiedBeneficiaryEntityId; // todo shouldn't be the server to create this id?

    sessionData.hashTransferInitClaims = getHash(request.transferClaims);

    saveHash(sessionData, MessageType.PRE_INIT_PROPOSAL, getHash(request));

    sessionData.lastSequenceNumber = request.context.sequenceNumber + BigInt(1);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;

    commonBody.sessionId = sessionData.id;
    commonBody.sequenceNumber = request.context.sequenceNumber + BigInt(1);
    commonBody.resourceUrl = request.context.resourceUrl;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.PRE_INIT_PROPOSAL,
    );

    const preTransferProposalReceiptMessage =
      new PreTransferVerificationAndContextEstablishmentResponse();
    preTransferProposalReceiptMessage.context = commonBody;
    preTransferProposalReceiptMessage.hashPreTransferVerificationAndContext =
      sessionData.hashTransferInitClaims;
    preTransferProposalReceiptMessage.timestamp = getMessageTimestamp(
      sessionData,
      MessageType.PRE_INIT_PROPOSAL,
      TimestampType.RECEIVED,
    );

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(preTransferProposalReceiptMessage)),
    );

    preTransferProposalReceiptMessage.context.signature = messageSignature;

    saveSignature(sessionData, commonBody.messageType, messageSignature);

    saveHash(
      sessionData,
      commonBody.messageType,
      getHash(preTransferProposalReceiptMessage),
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
    this.Log.info(
      `${fnTag}, sending PreTransferVerificationAndContextEstablishmentResponse...`,
    );

    return preTransferProposalReceiptMessage;
  }

  async transferCommenceResponse(
    request: PreTransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<void | PreTransferCommenceResponseMessage> {
    const stepTag = `transferCommenceResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

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
    commonBody.messageType = MessageType.PRE_TRANSFER_COMMENCE_RESPONSE;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;

    const preTransferCommenceResponseMessage =
      new PreTransferCommenceResponseMessage();
    preTransferCommenceResponseMessage.common = commonBody;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(preTransferCommenceResponseMessage)),
    );

    preTransferCommenceResponseMessage.common.signature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.PRE_TRANSFER_COMMENCE_RESPONSE,
      messageSignature,
    );

    saveHash(
      sessionData,
      MessageType.PRE_TRANSFER_COMMENCE_RESPONSE,
      getHash(preTransferCommenceResponseMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferCommenceResponse",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });
    */

    this.Log.info(`${fnTag}, sending PreTransferCommenceResponseMessage...`);

    return preTransferCommenceResponseMessage;
  }

  async checkPreTransferProposalRequestMessage(
    request: PreTransferVerificationAndContextEstablishmentRequest,
    session: SATPSession | undefined,
    //supportedDLTs: SupportedChain[],
  ): Promise<SessionData | boolean> {
    const stepTag = `checkTransferProposalRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (
      request.context == undefined ||
      request.context.version == undefined ||
      request.context.messageType == undefined ||
      request.context.sessionId == undefined ||
      // request.context.transferContextId == undefined ||
      request.context.sequenceNumber == undefined ||
      request.context.resourceUrl == undefined ||
      // request.context.actionResponse == undefined ||
      // request.context.payloadProfile == undefined ||
      // request.context.applicationProfile == undefined ||
      request.context.signature == undefined ||
      request.context.clientGatewayPubkey == undefined ||
      request.context.serverGatewayPubkey == undefined
    ) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (request.context.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    if (
      !verifySignature(
        this.Signer,
        request.context,
        request.context.clientGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferProposalRequest message signature verification failed`,
      );
    }

    if (request.context.messageType != MessageType.INIT_PROPOSAL) {
      throw new Error(
        `${fnTag}, wrong message type for TransferProposalRequest`,
      );
    }

    if (request.transferClaims == undefined) {
      throw new Error(
        `${fnTag}, TransferProposalRequest message does not contain transfer initialization claims`,
      );
    }

    const senderId = request.transferClaims
      .senderGatewayNetworkId as SupportedChain;

    this.Log.info(`TransferProposalRequest passed all checks.`);

    if (!this.checkTransferClaims(request.transferClaims)) {
      throw new Error();
    }
    return true;
  }

  async checkTransferCommenceRequestMessage(
    request: PreTransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<SessionData> {
    const stepTag = `checkTransferCommenceRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (
      request.common == undefined ||
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
      request.hashPreTransferVerificationAndContext == undefined ||
      request.hashPreTransferVerificationAndContext !=
        sessionData.hashTransferInitClaims
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

    this.Log.info(`TransferCommenceRequest passed all checks.`);
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
