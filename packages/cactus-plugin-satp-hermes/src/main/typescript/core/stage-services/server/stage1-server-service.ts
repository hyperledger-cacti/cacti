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
// eslint-disable-next-line prettier/prettier
import { ACCEPTANCE, SessionData } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
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
import {
  DLTNotSupported,
  HashMissMatch,
  MessageTypeMissMatch,
  MissingClientGatewayPubkey,
  MissingNetworkCapabilities,
  MissingSatpCommonBody,
  MissingServerGatewayPubkey,
  MissingTransferInitClaims,
  SATPVersionUnsupported,
  SequenceNumberMissMatch,
  SessionDataNotLoadedCorrectly,
  SessionUndefined,
  SignatureVerificationFailed,
  TransferContextIdMissMatch,
} from "../errors";
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
      throw MissingSatpCommonBody(fnTag);
    }

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }
    const sessionData = session.getServerSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    sessionData.sourceLedgerAssetId =
      request.transferInitClaims.verifiedOriginatorEntityId;
    sessionData.recipientLedgerAssetId =
      request.transferInitClaims.verifiedBeneficiaryEntityId; // todo shouldn't be the server to create this id?

    sessionData.hashTransferInitClaims = getHash(request.transferInitClaims);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;

    commonBody.sessionId = sessionData.id;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      request.common.sequenceNumber + BigInt(1);
    commonBody.resourceUrl = request.common.resourceUrl;
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.transferContextId = sessionData.transferContextId;

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

    //TODO implement reject
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
    commonBody.messageType = MessageType.INIT_RECEIPT;
    sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_ACCEPTED;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferProposalReceiptMessage)),
    );

    transferProposalReceiptMessage.serverSignature = messageSignature;

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
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_RESPONSE;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      request.common.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;
    commonBody.resourceUrl = request.common.resourceUrl;
    commonBody.transferContextId = sessionData.transferContextId;

    const transferCommenceResponseMessage =
      new TransferCommenceResponseMessage();
    transferCommenceResponseMessage.common = commonBody;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferCommenceResponseMessage)),
    );

    transferCommenceResponseMessage.serverSignature = messageSignature;

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
      throw SessionUndefined(fnTag);
    }
    const sessionData = session.getServerSessionData();

    if (sessionData == undefined) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (
      request.common == undefined ||
      request.common.version == undefined ||
      request.common.messageType == undefined ||
      request.common.sessionId == undefined ||
      request.common.sequenceNumber == undefined ||
      request.common.resourceUrl == undefined ||
      // request.common.actionResponse == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      request.clientSignature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined
    ) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (
      !verifySignature(this.Signer, request, request.common.clientGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (request.common.messageType != MessageType.INIT_PROPOSAL) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.INIT_PROPOSAL.toString(),
      );
    }

    if (request.transferInitClaims == undefined) {
      throw MissingTransferInitClaims(fnTag);
    }

    if (request.networkCapabilities == undefined) {
      throw MissingNetworkCapabilities(fnTag);
    }

    const senderId = request.transferInitClaims
      .senderGatewayNetworkId as SupportedChain;

    if (!supportedDLTs.includes(senderId)) {
      throw DLTNotSupported(fnTag, senderId); //todo change this to the transferClaims check
    }

    if (!this.checkTransferClaims(request.transferInitClaims)) {
      throw new Error();
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

    this.Log.info(
      `${fnTag}, Session data created for session id ${sessionData.id}`,
    );

    saveHash(sessionData, MessageType.INIT_PROPOSAL, getHash(request));

    this.Log.info(`${fnTag}, TransferProposalRequest passed all checks.`);

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
      // request.common.actionResponse == undefined ||
      // request.common.payloadProfile == undefined ||
      // request.common.applicationProfile == undefined ||
      request.clientSignature == undefined ||
      request.common.clientGatewayPubkey == undefined ||
      request.common.serverGatewayPubkey == undefined
    ) {
      throw MissingSatpCommonBody(fnTag);
    }

    if (request.common.version != SATP_VERSION) {
      throw SATPVersionUnsupported(fnTag, request.common.version, SATP_VERSION);
    }

    if (session == undefined) {
      throw SessionUndefined(fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (
      sessionData == undefined ||
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.hashes == undefined ||
      sessionData.hashes.stage1 == undefined ||
      sessionData.hashes.stage1.transferProposalReceiptMessageHash ==
        undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw SessionDataNotLoadedCorrectly(fnTag);
    }

    if (request.common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
      throw MissingServerGatewayPubkey(fnTag);
    }

    if (request.common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
      throw MissingClientGatewayPubkey(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, request.common.clientGatewayPubkey)
    ) {
      throw SignatureVerificationFailed(fnTag);
    }

    if (request.common.messageType != MessageType.TRANSFER_COMMENCE_REQUEST) {
      throw MessageTypeMissMatch(
        fnTag,
        request.common.messageType.toString(),
        MessageType.TRANSFER_COMMENCE_REQUEST.toString(),
      );
    }

    if (
      request.common.sequenceNumber !=
      sessionData.lastSequenceNumber + BigInt(1)
    ) {
      throw SequenceNumberMissMatch(
        fnTag,
        request.common.sequenceNumber,
        sessionData.lastSequenceNumber + BigInt(1),
      );
    }

    if (
      request.common.hashPreviousMessage !=
      sessionData.hashes.stage1.transferProposalReceiptMessageHash
    ) {
      throw HashMissMatch(
        fnTag,
        request.common.hashPreviousMessage,
        sessionData.hashes.stage1.transferProposalReceiptMessageHash,
      );
    }

    if (
      request.hashTransferInitClaims == undefined ||
      request.hashTransferInitClaims != sessionData.hashTransferInitClaims
    ) {
      throw MissingTransferInitClaims(fnTag);
    }

    if (
      !verifySignature(this.Signer, request, sessionData.clientGatewayPubkey)
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

    if (request.clientTransferNumber != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: clientTransferNumber...`,
      );
      sessionData.clientTransferNumber = request.clientTransferNumber;
    }

    saveHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      getHash(request),
    );

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
