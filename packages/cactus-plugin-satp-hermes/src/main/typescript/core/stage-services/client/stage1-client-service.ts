import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
  TransferProposalRequestMessageSchema,
  TransferCommenceRequestMessageSchema,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  TransferClaims,
  CommonSatpSchema,
  TransferClaimsSchema,
  NetworkCapabilitiesSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import { State } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import {
  HashError,
  MessageTypeError,
  SessionError,
  TokenIdMissingError,
  TransferContextIdError,
  WrapAssertionClaimError,
} from "../../errors/satp-service-errors";
import { PreSATPTransferResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_0_pb";
import { create } from "@bufbuild/protobuf";
import { NetworkId } from "../../../network-identification/chainid-list";

export class Stage1ClientService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPClientServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage1ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage1ClientService.SERVICE_TYPE,
      dbLogger: ops.dbLogger,
    };
    super(commonOptions);
  }

  async transferProposalRequest(
    session: SATPSession,
    connectedDLTs: NetworkId[],
  ): Promise<void | TransferProposalRequestMessage> {
    const stepTag = `transferProposalRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferProposalRequest...`);
    const messageType = MessageType[MessageType.INIT_PROPOSAL];
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });

    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      if (
        !connectedDLTs
          .map((dlt) => {
            return dlt.id;
          })
          .includes(sessionData.senderGatewayNetworkId)
      ) {
        throw new Error( //todo change this to the transferClaims check
          `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
        );
      }

      sessionData.lastSequenceNumber =
        sessionData.lastSequenceNumber + BigInt(1);

      const commonBody = create(CommonSatpSchema, {
        version: sessionData.version,
        messageType: MessageType.INIT_PROPOSAL,
        sessionId: sessionData.id,
        sequenceNumber: sessionData.lastSequenceNumber,
        resourceUrl: sessionData.resourceUrl,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        hashPreviousMessage: "",
      });

      if (sessionData.transferContextId != undefined) {
        commonBody.transferContextId = sessionData.transferContextId;
      }

      const transferInitClaims = create(TransferClaimsSchema, {
        digitalAssetId: sessionData.digitalAssetId,
        assetProfileId: sessionData.assetProfileId,
        verifiedOriginatorEntityId: sessionData.verifiedOriginatorEntityId,
        verifiedBeneficiaryEntityId: sessionData.verifiedBeneficiaryEntityId,
        originatorPubkey: sessionData.originatorPubkey,
        beneficiaryPubkey: sessionData.beneficiaryPubkey,
        senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
        recipientGatewayNetworkId: sessionData.recipientGatewayNetworkId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        senderGatewayOwnerId: sessionData.senderGatewayOwnerId,
        receiverGatewayOwnerId: sessionData.receiverGatewayOwnerId,
      });

      sessionData.hashTransferInitClaims = getHash(transferInitClaims);

      const networkCapabilities = create(NetworkCapabilitiesSchema, {
        senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
        signatureAlgorithm: sessionData.signatureAlgorithm,
        lockType: sessionData.lockType,
        lockExpirationTime: sessionData.lockExpirationTime,
        credentialProfile: sessionData.credentialProfile,
        loggingProfile: sessionData.loggingProfile,
        accessControlProfile: sessionData.accessControlProfile,
      });

      if (sessionData.permissions != undefined) {
        this.Log.info(`${fnTag}, Optional variable loaded: permissions...`);
        networkCapabilities.permissions = sessionData.permissions;
      }

      if (sessionData.developerUrn != "") {
        this.Log.info(`${fnTag}, Optional variable loaded: developerUrn...`);
        networkCapabilities.developerUrn = sessionData.developerUrn;
      }

      if (sessionData.applicationProfile != "") {
        this.Log.info(
          `${fnTag}, Optional variable loaded: applicationProfile...`,
        );
        networkCapabilities.applicationProfile = sessionData.applicationProfile;
      }

      if (sessionData.subsequentCalls != undefined) {
        this.Log.info(`${fnTag}, Optional variable loaded: subsequentCalls...`);
        networkCapabilities.subsequentCalls = sessionData.subsequentCalls;
      }

      if (sessionData.history.length > 0) {
        this.Log.info(`${fnTag}, Optional variable loaded: history...`);
        networkCapabilities.history = sessionData.history;
      }

      const transferProposalRequestMessage = create(
        TransferProposalRequestMessageSchema,
        {
          common: commonBody,
          transferInitClaims: transferInitClaims,
          networkCapabilities: networkCapabilities,
        },
      );

      if (sessionData.transferClaimsFormat != undefined) {
        this.Log.info(
          `${fnTag}, Optional variable loaded: transferInitClaimsFormat...`,
        );
        transferProposalRequestMessage.transferInitClaimsFormat =
          sessionData.transferClaimsFormat;
      }
      if (sessionData.multipleCancelsAllowed) {
        this.Log.info(
          `${fnTag}, Optional variable loaded: multipleCancelsAllowed...`,
        );
        transferProposalRequestMessage.multipleCancelsAllowed =
          sessionData.multipleCancelsAllowed;
      }
      if (sessionData.multipleClaimsAllowed) {
        this.Log.info(
          `${fnTag}, Optional variable loaded: multipleClaimsAllowed...`,
        );
        transferProposalRequestMessage.multipleClaimsAllowed =
          sessionData.multipleClaimsAllowed;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(transferProposalRequestMessage)),
      );

      transferProposalRequestMessage.clientSignature = messageSignature;

      saveSignature(sessionData, MessageType.INIT_PROPOSAL, messageSignature);

      saveHash(
        sessionData,
        MessageType.INIT_PROPOSAL,
        getHash(transferProposalRequestMessage),
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, sending TransferProposalRequest...`);

      return transferProposalRequestMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async transferCommenceRequest(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<void | TransferCommenceRequestMessage> {
    const stepTag = `transferCommenceRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.TRANSFER_COMMENCE_REQUEST];
    this.Log.debug(`${fnTag}, transferCommenceRequest...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });

    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      const commonBody = create(CommonSatpSchema, {
        version: sessionData.version,
        messageType: MessageType.TRANSFER_COMMENCE_REQUEST,
        sessionId: sessionData.id,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        resourceUrl: sessionData.resourceUrl,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.INIT_RECEIPT,
        ),
        transferContextId: sessionData.transferContextId,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber;

      const transferCommenceRequestMessage = create(
        TransferCommenceRequestMessageSchema,
        {
          common: commonBody,
          hashTransferInitClaims: sessionData.hashTransferInitClaims,
        },
      );

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(transferCommenceRequestMessage)),
      );

      transferCommenceRequestMessage.clientSignature = messageSignature;

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

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending TransferCommenceRequest...`);

      return transferCommenceRequestMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async checkPreSATPTransferResponse(
    response: PreSATPTransferResponseMessage,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkPreSATPTransferResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkPreSATPTransferResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    if (
      response.contextId == "" ||
      response.contextId != sessionData.transferContextId
    ) {
      throw new TransferContextIdError(
        fnTag,
        response.contextId,
        sessionData.transferContextId,
      );
    }

    if (response.wrapAssertionClaim == undefined) {
      throw new WrapAssertionClaimError(fnTag);
    }

    if (response.recipientTokenId == "") {
      throw new TokenIdMissingError(fnTag);
    }

    if (response.messageType != MessageType.PRE_SATP_TRANSFER_RESPONSE) {
      throw new MessageTypeError(
        fnTag,
        response.messageType.toString(),
        MessageType.PRE_SATP_TRANSFER_RESPONSE.toString(),
      );
    }

    if (
      response.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.PRE_SATP_TRANSFER_REQUEST)
    ) {
      throw new HashError(
        fnTag,
        response.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.PRE_SATP_TRANSFER_REQUEST),
      );
    }

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    sessionData.receiverAsset!.tokenId = response.recipientTokenId;

    saveHash(sessionData, MessageType.PRE_SATP_TRANSFER_RESPONSE, fnTag);

    this.Log.info(`${fnTag}, PreSATPTransferResponse passed all checks.`);
  }

  async checkTransferProposalReceiptMessage(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<boolean> {
    const stepTag = `checkTransferProposalReceiptMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferProposalReceiptMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.INIT_RECEIPT,
      MessageType.INIT_REJECT,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      response.common!.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims == undefined
    ) {
      this.Log.info(
        `${fnTag}, TransferProposalReceipt proposedTransferClaims were rejected`,
      );
      sessionData.state = State.REJECTED;
      saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
      return false;
    } else if (
      response.common!.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims != undefined
    ) {
      saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
      if (
        await this.checkProposedTransferClaims(response.transferCounterClaims)
      ) {
        sessionData.proposedTransferInitClaims = getHash(
          response.transferCounterClaims,
        );
        return true;
      } else {
        this.Log.info(
          `${fnTag}, TransferProposalReceipt proposedTransferClaims were rejected conditional`,
        );
        sessionData.state = State.REJECTED;
        return false;
      }
    }

    saveHash(sessionData, MessageType.INIT_RECEIPT, getHash(response));

    this.Log.info(`${fnTag}, TransferProposalReceipt passed all checks.`);
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
