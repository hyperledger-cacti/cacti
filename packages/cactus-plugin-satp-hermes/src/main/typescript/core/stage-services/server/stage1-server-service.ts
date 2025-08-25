import {
  TransferCommenceResponseMessage,
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  CommonSatp,
  NetworkCapabilities,
  SignatureAlgorithm,
  LockType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
// eslint-disable-next-line prettier/prettier
import {
  ACCEPTANCE,
} from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import { TransferClaims } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  SessionType,
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
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  DLTNotSupportedError,
  NetworkCapabilitiesError,
  SessionError,
  TransferInitClaimsError,
  TransferInitClaimsHashError,
} from "../../errors/satp-service-errors";
export class Stage1ServerService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

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
    session: SATPSession,
  ): Promise<void | TransferProposalReceiptMessage> {
    const stepTag = `transferProposalResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferProposalResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    sessionData.sourceLedgerAssetId =
      request.transferInitClaims!.verifiedOriginatorEntityId;
    sessionData.recipientLedgerAssetId =
      request.transferInitClaims!.verifiedBeneficiaryEntityId; // todo shouldn't be the server to create this id?

    sessionData.hashTransferInitClaims = getHash(request.transferInitClaims);

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;

    commonBody.sessionId = sessionData.id;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      request.common!.sequenceNumber + BigInt(1);
    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.transferContextId = sessionData.transferContextId;
    commonBody.resourceUrl = sessionData.resourceUrl;

    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.INIT_PROPOSAL,
    );

    const transferProposalReceiptMessage = new TransferProposalReceiptMessage();
    if (sessionData.acceptance == ACCEPTANCE.ACCEPTANCE_REJECTED) {
      transferProposalReceiptMessage.common = commonBody;
      commonBody.messageType = MessageType.INIT_REJECT;
      transferProposalReceiptMessage.timestamp = getMessageTimestamp(
        sessionData,
        MessageType.INIT_REJECT,
        TimestampType.RECEIVED,
      );
    } else {
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_ACCEPTED;
      transferProposalReceiptMessage.common = commonBody;
      transferProposalReceiptMessage.hashTransferInitClaims =
        sessionData.hashTransferInitClaims;
      commonBody.messageType = MessageType.INIT_RECEIPT;
      transferProposalReceiptMessage.timestamp = getMessageTimestamp(
        sessionData,
        MessageType.INIT_PROPOSAL,
        TimestampType.RECEIVED,
      );
    }

    //TODO implement conditional reject

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
    session: SATPSession,
  ): Promise<void | TransferCommenceResponseMessage> {
    const stepTag = `transferCommenceResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferCommenceResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_RESPONSE;
    sessionData.lastSequenceNumber = commonBody.sequenceNumber =
      request.common!.sequenceNumber + BigInt(1);
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;
    commonBody.transferContextId = sessionData.transferContextId;
    commonBody.resourceUrl = sessionData.resourceUrl;

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
    session: SATPSession,
    supportedDLTs: SupportedChain[],
  ): Promise<void> {
    const stepTag = `checkTransferProposalRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferProposalRequestMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    const sessionData = session.getServerSessionData();

    this.checkNetworkCapabilities(request.networkCapabilities, fnTag);

    if (this.checkTransferClaims(request.transferInitClaims, fnTag)) {
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_ACCEPTED;
    } else {
      this.Log.info(`${fnTag}, TransferProposalRequest was rejected...`);
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_REJECTED;
      return;
    }

    const senderId = request.transferInitClaims!
      .senderGatewayNetworkId as SupportedChain;

    if (!supportedDLTs.includes(senderId)) {
      throw new DLTNotSupportedError(fnTag, senderId); //todo change this to the transferClaims check
    }

    sessionData.version = request.common!.version;
    sessionData.digitalAssetId = request.transferInitClaims!.digitalAssetId;
    sessionData.originatorPubkey = request.transferInitClaims!.originatorPubkey;
    sessionData.beneficiaryPubkey =
      request.transferInitClaims!.beneficiaryPubkey;
    sessionData.senderGatewayNetworkId =
      request.transferInitClaims!.senderGatewayNetworkId;
    sessionData.recipientGatewayNetworkId =
      request.transferInitClaims!.recipientGatewayNetworkId;
    sessionData.clientGatewayPubkey =
      request.transferInitClaims!.clientGatewayPubkey;
    sessionData.serverGatewayPubkey =
      request.transferInitClaims!.serverGatewayPubkey;
    sessionData.receiverGatewayOwnerId =
      request.transferInitClaims!.receiverGatewayOwnerId;
    sessionData.senderGatewayOwnerId =
      request.transferInitClaims!.senderGatewayOwnerId;
    sessionData.signatureAlgorithm =
      request.networkCapabilities!.signatureAlgorithm;
    sessionData.lockType = request.networkCapabilities!.lockType;
    sessionData.lockExpirationTime =
      request.networkCapabilities!.lockExpirationTime;
    sessionData.credentialProfile =
      request.networkCapabilities!.credentialProfile;
    sessionData.loggingProfile = request.networkCapabilities!.loggingProfile;
    sessionData.accessControlProfile =
      request.networkCapabilities!.accessControlProfile;
    sessionData.resourceUrl = request.common!.resourceUrl;

    session.verify(fnTag, SessionType.SERVER);

    commonBodyVerifier(
      fnTag,
      request.common,
      sessionData,
      MessageType.INIT_PROPOSAL,
    );

    signatureVerifier(fnTag, this.Signer, request, sessionData);

    this.Log.info(
      `${fnTag}, Session data created for session id ${sessionData.id}`,
    );

    saveHash(sessionData, MessageType.INIT_PROPOSAL, getHash(request));

    this.Log.info(`${fnTag}, TransferProposalRequest passed all checks.`);
  }

  async checkTransferCommenceRequestMessage(
    request: TransferCommenceRequestMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCommenceRequestMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.SERVER);

    const sessionData = session.getServerSessionData();

    commonBodyVerifier(
      fnTag,
      request.common,
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
    );

    signatureVerifier(fnTag, this.Signer, request, sessionData);

    if (
      request.hashTransferInitClaims == "" ||
      request.hashTransferInitClaims != sessionData.hashTransferInitClaims
    ) {
      throw new TransferInitClaimsHashError(fnTag);
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
  }

  private checkTransferClaims(
    transferClaims: TransferClaims | undefined,
    tag: string,
  ): boolean {
    if (transferClaims == undefined) {
      throw new TransferInitClaimsError(tag);
    }
    if (transferClaims.digitalAssetId == "") {
      this.Log.error(`${tag}, digitalAssetId is missing`);
    }
    if (transferClaims.assetProfileId == "") {
      this.Log.error(`${tag}, assetProfileId is missing`);
      return false;
    }
    if (transferClaims.verifiedOriginatorEntityId == "") {
      this.Log.error(`${tag}, verifiedOriginatorEntityId is missing`);
      return false;
    }
    if (transferClaims.verifiedBeneficiaryEntityId == "") {
      this.Log.error(`${tag}, verifiedBeneficiaryEntityId is missing`);
    }
    if (transferClaims.originatorPubkey == "") {
      this.Log.error(`${tag}, originatorPubkey is missing`);
      return false;
    }
    if (transferClaims.beneficiaryPubkey == "") {
      this.Log.error(`${tag}, beneficiaryPubkey is missing`);
      return false;
    }
    if (transferClaims.senderGatewayNetworkId != "") {
      this.Log.info(`${tag}, optional variable senderGatewayNetworkId loaded`);
    }
    if (transferClaims.recipientGatewayNetworkId != "") {
      this.Log.info(
        `${tag}, optional variable recipientGatewayNetworkId loaded`,
      );
    }
    if (transferClaims.clientGatewayPubkey == "") {
      this.Log.error(`${tag}, clientGatewayPubkey is missing`);
      return false;
    }
    if (transferClaims.serverGatewayPubkey == "") {
      this.Log.error(`${tag}, serverGatewayPubkey is missing`);
      return false;
    }
    if (transferClaims.senderGatewayOwnerId != "") {
      this.Log.info(`${tag}, optional variable senderGatewayNetworkId loaded`);
    }
    if (transferClaims.receiverGatewayOwnerId != "") {
      this.Log.info(`${tag}, optional variable receiverGatewayOwnerId loaded`);
    }
    //todo
    return true;
  }

  private checkNetworkCapabilities(
    networkCapabilities: NetworkCapabilities | undefined,
    tag: string,
  ): boolean {
    if (networkCapabilities == undefined) {
      throw new NetworkCapabilitiesError(tag);
    }
    if (networkCapabilities.senderGatewayNetworkId == "") {
    }
    if (
      networkCapabilities.signatureAlgorithm == SignatureAlgorithm.UNSPECIFIED
    ) {
    }
    if (networkCapabilities.supportedSignatureAlgorithms.length == 0) {
    }
    if (networkCapabilities.lockType == LockType.UNSPECIFIED) {
    }
    if (networkCapabilities.lockExpirationTime == BigInt(0)) {
    }
    if (networkCapabilities.permissions == undefined) {
    }
    if (networkCapabilities.developerUrn == "") {
    }
    if (networkCapabilities.credentialProfile == undefined) {
    }
    if (networkCapabilities.applicationProfile == "") {
    }
    if (networkCapabilities.loggingProfile == "") {
    }
    if (networkCapabilities.accessControlProfile == "") {
    }
    if (networkCapabilities.subsequentCalls == undefined) {
    }
    if (networkCapabilities.history == undefined) {
    }
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
