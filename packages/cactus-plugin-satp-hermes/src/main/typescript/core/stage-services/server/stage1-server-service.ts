import { IJsObjectSignerOptions, JsObjectSigner, Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { SATPGateway } from "../../../plugin-satp-hermes-gateway";
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
import {
  ACCEPTANCE,
  SessionData,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../constants";
import {
  bufArray2HexStr,
  getHash,
  sign,
  storeLog,
  verifySignature,
} from "../../../gateway-utils";
import { TransferClaims } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  TimestampType,
  createSessionData,
  getMessageHash,
  getMessageTimestamp,
  saveHash,
  saveSignature,
} from "../../session-utils";
import { SupportedGatewayImplementations } from "../../types";
import { SATPSession } from "../../../core/satp-session";
import { SATPService, ISATPServerServiceOptions } from "../../../types/satp-protocol";

export class Stage1ServerService implements SATPService {
  public static readonly CLASS_NAME = "Stage2ServerService";
  private _log: Logger;
  private signer: JsObjectSigner;
;

  constructor(ops: ISATPServerServiceOptions) {
    const level = "INFO";
    const label = Stage1ServerService.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
    this.signer = ops.signer;
  }

  public get className(): string {
    return Stage1ServerService.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async transferProposalResponse(
    request: TransferProposalRequestMessage,
    session: SATPSession | undefined,
  ): Promise<void | TransferProposalReceiptMessage> {
    const fnTag = `${this.className}#transferProposalResponse()`;

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
      throw new Error(
        `${fnTag}, session is undefined`,
      );
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

    const transferProposalReceiptMessage =
      new TransferProposalReceiptMessage();
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
        this.log.info(`${fnTag}, ProposalTransferClaims were rejected...`);
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

    const messageSignature = bufArray2HexStr(
      sign(
        this.signer,
        JSON.stringify(transferProposalReceiptMessage),
      ),
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
    this.log.info(`${fnTag}, sending TransferProposalResponseMessage...`);

    return transferProposalReceiptMessage;
  }

  async transferCommenceResponse(
    request: TransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<void | TransferCommenceResponseMessage> {
    const fnTag = `${this.className}#transferCommenceResponse()`;

    if (request.common == undefined) {
      throw new Error(
        `${fnTag}, message satp common body is missing or is missing required fields`,
      );
    }

    if (session == undefined) {
      throw new Error(
        `${fnTag}, session is undefined`,
      );
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

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const messageSignature = bufArray2HexStr(
      sign(
        this.signer,
        JSON.stringify(transferCommenceResponseMessage),
      ),
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
   
    this.log.info(`${fnTag}, sending TransferCommenceResponseMessage...`);

    return transferCommenceResponseMessage;
  }

  async checkTransferProposalRequestMessage(
    request: TransferProposalRequestMessage,
    session: SATPSession | undefined,
    supportedDLTs: SupportedGatewayImplementations[],
  ): Promise<SessionData> {
    const fnTag = `${this.className}#checkTransferProposalRequestMessage()`;

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

    if (
      !verifySignature(
        this.signer,
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
    const senderId = request.transferInitClaims.senderGatewayNetworkId as SupportedGatewayImplementations;

    if (
      !supportedDLTs.includes(senderId)
    ) {
      throw new Error( //todo change this to the transferClaims check
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    this.log.info(`TransferProposalRequest passed all checks.`);

    const sessionData = createSessionData(
      request.common.sessionId,
      request.common.version,
      request.transferInitClaims.digitalAssetId,
      request.transferInitClaims.senderGatewayNetworkId,
      request.transferInitClaims.recipientGatewayNetworkId,
      request.transferInitClaims.originatorPubkey,
      request.transferInitClaims.beneficiaryPubkey,
      request.transferInitClaims.senderGatewayOwnerId,
      request.transferInitClaims.receiverGatewayOwnerId,
      request.transferInitClaims.clientGatewayPubkey,
      request.transferInitClaims.serverGatewayPubkey,
      request.networkCapabilities.signatureAlgorithm,
      request.networkCapabilities.lockType,
      request.networkCapabilities.lockExpirationTime,
      request.networkCapabilities.credentialProfile,
      request.networkCapabilities.loggingProfile,
      request.networkCapabilities.accessControlProfile,
    );

    this.log.info(`Session data created for session id ${sessionData.id}`);
    if (!this.checkTransferClaims(request.transferInitClaims))  {
      throw new Error();
    }
    return sessionData;
  }

  async checkTransferCommenceRequestMessage(
    request: TransferCommenceRequestMessage,
    session: SATPSession | undefined,
  ): Promise<SessionData> {
    const fnTag = `${this.className}#transferCommenceResponse()`;

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
      throw new Error(
        `${fnTag}, session is undefined`,
      );
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
        this.signer,
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
      !verifySignature(
        this.signer,
        request,
        sessionData.clientGatewayPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }

    this.log.info(`TransferCommenceRequest passed all checks.`);
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
