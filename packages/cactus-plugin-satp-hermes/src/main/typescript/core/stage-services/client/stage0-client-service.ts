import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  CommonSatp,
  TransferClaims,
  NetworkCapabilities,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATP_VERSION } from "../../constants";
import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  checkSessionData,
} from "../../session-utils";
import { SupportedChain } from "../../types";
import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";

export class Stage0ClientService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;

  constructor(ops: ISATPClientServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ClientService.SERVICE_TYPE,
    };
    super(commonOptions);
  }

  async transferProposalRequest(
    sessionID: string,
    session: SATPSession,
    supportedDLTs: SupportedChain[],
  ): Promise<void | TransferProposalRequestMessage> {
    const stepTag = `transferProposalRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    const sessionData = session.getSessionData();

    if (sessionData == undefined || !checkSessionData(sessionData)) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (
      !supportedDLTs.includes(
        sessionData.senderGatewayNetworkId as SupportedChain,
      )
    ) {
      throw new Error( //todo change this to the transferClaims check
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    if (sessionData.version != SATP_VERSION) {
      throw new Error(`${fnTag}, unsupported SATP version`);
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.PRE_INIT_PROPOSAL;
    commonBody.sessionId = sessionData.id;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
    commonBody.resourceUrl = "";

    if (sessionData.transferContextId != undefined) {
      commonBody.transferContextId = sessionData.transferContextId;
    }

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

    sessionData.hashTransferInitClaims = getHash(transferInitClaims);

    const networkCapabilities = new NetworkCapabilities();
    networkCapabilities.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    networkCapabilities.signatureAlgorithm = sessionData.signatureAlgorithm;
    networkCapabilities.lockType = sessionData.lockType;
    networkCapabilities.lockExpirationTime = sessionData.lockExpirationTime;
    networkCapabilities.credentialProfile = sessionData.credentialProfile;
    networkCapabilities.loggingProfile = sessionData.loggingProfile;
    networkCapabilities.accessControlProfile = sessionData.accessControlProfile;

    if (sessionData.permissions != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: permissions...`);
      networkCapabilities.permissions = sessionData.permissions;
    }

    if (sessionData.developerUrn != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: developerUrn...`);
      networkCapabilities.developerUrn = sessionData.developerUrn;
    }

    if (sessionData.applicationProfile != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: applicationProfile...`,
      );
      networkCapabilities.applicationProfile = sessionData.applicationProfile;
    }

    if (sessionData.subsequentCalls != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: subsequentCalls...`);
      networkCapabilities.subsequentCalls = sessionData.subsequentCalls;
    }

    if (sessionData.history != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: history...`);
      networkCapabilities.history = sessionData.history;
    }

    const transferProposalRequestMessage = new TransferProposalRequestMessage();
    transferProposalRequestMessage.common = commonBody;
    transferProposalRequestMessage.transferInitClaims = transferInitClaims;
    transferProposalRequestMessage.networkCapabilities = networkCapabilities;

    if (sessionData.transferClaimsFormat != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: transferInitClaimsFormat...`,
      );
      transferProposalRequestMessage.transferInitClaimsFormat =
        sessionData.transferClaimsFormat;
    }
    if (sessionData.multipleCancelsAllowed != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: multipleCancelsAllowed...`,
      );
      transferProposalRequestMessage.multipleCancelsAllowed =
        sessionData.multipleCancelsAllowed;
    }
    if (sessionData.multipleClaimsAllowed != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: multipleClaimsAllowed...`,
      );
      transferProposalRequestMessage.multipleClaimsAllowed =
        sessionData.multipleClaimsAllowed;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferProposalRequestMessage)),
    );

    transferProposalRequestMessage.common.signature = messageSignature;

    saveSignature(sessionData, MessageType.INIT_PROPOSAL, messageSignature);

    saveHash(
      sessionData,
      MessageType.INIT_PROPOSAL,
      getHash(transferProposalRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionID,
      type: "transferProposalRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending TransferProposalRequest...`);

    return transferProposalRequestMessage;
  }

  async transferCommenceRequest(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<void | TransferCommenceRequestMessage> {
    const stepTag = `transferCommenceRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (!response || !response.common) {
      throw new Error("Response or response.common is undefined");
    }

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error("Session data not loaded successfully");
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_REQUEST;
    commonBody.sequenceNumber = response.common.sequenceNumber + BigInt(1);

    //todo check when reject
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.INIT_RECEIPT,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const transferCommenceRequestMessage = new TransferCommenceRequestMessage();
    transferCommenceRequestMessage.common = commonBody;
    transferCommenceRequestMessage.hashTransferInitClaims =
      sessionData.hashTransferInitClaims;

    // transferCommenceRequestMessage.clientTransferNumber = sessionData.clientTransferNumber;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferCommenceRequestMessage)),
    );

    transferCommenceRequestMessage.common.signature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      messageSignature,
    );

    saveHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      getHash(transferCommenceRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferCommenceRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending TransferCommenceRequest...`);

    return transferCommenceRequestMessage;
  }

  async checkTransferProposalReceiptMessage(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<boolean> {
    const stepTag = `checkTransferProposalReceiptMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
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

    // const sessionId = response.common.sessionId;

    const sessionData = session.getSessionData();

    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, session data not found for session id ${response.common.sessionId}`,
      );
    }

    if (
      sessionData.serverGatewayPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined
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
        getMessageHash(sessionData, MessageType.INIT_PROPOSAL)
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
      !verifySignature(this.Signer, response, sessionData.serverGatewayPubkey)
    ) {
      throw new Error(
        `${fnTag}, TransferProposalReceipt message signature verification failed`,
      );
    }

    if (
      response.common.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims == undefined
    ) {
      sessionData.completed = true;
      return false;
    } else if (
      response.common.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims != undefined
    ) {
      if (
        await this.checkProposedTransferClaims(response.transferCounterClaims)
      ) {
        sessionData.proposedTransferInitClaims = getHash(
          response.transferCounterClaims,
        );
        return true;
      } else {
        this.Log.info(
          `TransferProposalReceipt proposedTransferClaims were rejected`,
        );
        sessionData.completed = true;
        return false;
      }
    }
    this.Log.info(`TransferProposalReceipt passed all checks.`);
    return true;
  }

  async checkProposedTransferClaims(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    counterTransfer: TransferClaims,
  ): Promise<boolean> {
    //const fnTag = `${this.className}#checkCounterTransferClaims()`;
    //todo
    return true;
  }
}
