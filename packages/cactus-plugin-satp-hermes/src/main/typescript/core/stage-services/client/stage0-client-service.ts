import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  ClaimFormat,
  MessageType,
  WrapAssertionClaimSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  NewSessionRequestSchema,
  PreSATPTransferRequestSchema,
} from "../../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { FailedToProcessError } from "../../errors/satp-handler-errors";
import {
  AmountMissingError,
  HashError,
  LedgerAssetError,
  LedgerAssetIdError,
  MessageTypeError,
  MissingBridgeManagerError,
  SessionError,
  SessionIdError,
  SessionMissMatchError,
  SignatureVerificationError,
  TokenIdMissingError,
  TransferContextIdError,
} from "../../errors/satp-service-errors";
import { SATPSession } from "../../satp-session";
import {
  copySessionDataAttributes,
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { signatureVerifier } from "../data-verifier";
import { type FungibleAsset } from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { protoToAsset } from "../service-utils";
import { getMessageTypeName } from "../../satp-utils";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { NetworkId } from "../../../public-api";

export class Stage0ClientService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ClientService.SERVICE_TYPE,
      dbLogger: ops.dbLogger,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }

    this.claimFormat = ops.claimFormat || ClaimFormat.DEFAULT;
    this.bridgeManager = ops.bridgeManager;
  }

  public async newSessionRequest(
    session: SATPSession,
    thisGatewayId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `newSessionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.NEW_SESSION_REQUEST];

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT, false, false, true);
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

      const newSessionRequestMessage = create(NewSessionRequestSchema, {
        sessionId: sessionData.id,
        contextId: sessionData.transferContextId,
        gatewayId: thisGatewayId,
        messageType: MessageType.NEW_SESSION_REQUEST,
      });

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(newSessionRequestMessage)),
      );

      newSessionRequestMessage.clientSignature = messageSignature;

      saveSignature(
        sessionData,
        MessageType.NEW_SESSION_REQUEST,
        messageSignature,
      );

      saveHash(
        sessionData,
        MessageType.NEW_SESSION_REQUEST,
        getHash(newSessionRequestMessage),
      );

      saveTimestamp(
        sessionData,
        MessageType.NEW_SESSION_REQUEST,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending NewSessionRequest...`);

      return newSessionRequestMessage;
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

  public async checkNewSessionResponse(
    response: NewSessionResponse,
    session: SATPSession,
    sessionIds: string[],
  ): Promise<SATPSession> {
    const stepTag = `checkNewSessionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT, false, false, true);

    const sessionData = session.getClientSessionData();

    if (response.sessionId == "") {
      throw new SessionIdError(fnTag);
    }

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

    if (response.serverSignature == "") {
      throw new SignatureVerificationError(fnTag);
    }

    if (response.messageType != MessageType.NEW_SESSION_RESPONSE) {
      throw new MessageTypeError(
        fnTag,
        getMessageTypeName(response.messageType),
        getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
      );
    }

    if (
      response.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.NEW_SESSION_REQUEST)
    ) {
      throw new HashError(
        fnTag,
        response.hashPreviousMessage,
        getMessageHash(sessionData, MessageType.NEW_SESSION_REQUEST),
      );
    }

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    saveTimestamp(
      sessionData,
      MessageType.NEW_SESSION_RESPONSE,
      TimestampType.RECEIVED,
    );

    if (sessionData.id != response.sessionId) {
      if (sessionIds.includes(response.sessionId)) {
        throw new SessionMissMatchError(fnTag);
      }

      session = new SATPSession({
        contextID: response.contextId,
        sessionID: response.sessionId,
        server: false,
        client: true,
      });

      copySessionDataAttributes(
        sessionData,
        session.getClientSessionData(),
        response.sessionId,
        response.contextId,
      );
    }
    return session;
  }

  public async preSATPTransferRequest(
    session: SATPSession,
  ): Promise<PreSATPTransferRequest> {
    const stepTag = `preSATPTransferRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.PRE_SATP_TRANSFER_REQUEST];

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT, false, false, true);

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

      if (sessionData.senderAsset?.tokenId == "") {
        throw new LedgerAssetIdError(fnTag);
      }

      if (sessionData.senderAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      if (sessionData.receiverAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const bridge = this.bridgeManager.getBridgeEndPoint(
        {
          id: sessionData.senderAsset?.networkId?.id,
          ledgerType: sessionData.senderAsset?.networkId?.type,
        } as NetworkId,
        this.claimFormat,
      );

      if (!sessionData.senderAsset?.tokenType) {
        throw new LedgerAssetError(`${fnTag}, tokenType is missing`);
      }

      sessionData.senderGatewayNetworkId = bridge.getApproveAddress(
        sessionData.senderAsset?.tokenType,
      );

      const preSATPTransferRequest = create(PreSATPTransferRequestSchema, {
        sessionId: sessionData.id,
        contextId: sessionData.transferContextId,
        clientTransferNumber: sessionData.clientTransferNumber,
        senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
        senderAsset: sessionData.senderAsset,
        receiverAsset: sessionData.receiverAsset,
        wrapAssertionClaim: sessionData.senderWrapAssertionClaim,
        messageType: MessageType.PRE_SATP_TRANSFER_REQUEST,
      });

      preSATPTransferRequest.hashPreviousMessage = getMessageHash(
        sessionData,
        MessageType.NEW_SESSION_RESPONSE,
      );

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(preSATPTransferRequest)),
      );

      preSATPTransferRequest.clientSignature = messageSignature;

      saveSignature(
        sessionData,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        messageSignature,
      );

      saveHash(
        sessionData,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        getHash(preSATPTransferRequest),
      );

      saveTimestamp(
        sessionData,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: String(MessageType.PRE_SATP_TRANSFER_REQUEST),
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending PreSATPTransferRequest...`);

      return preSATPTransferRequest;
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

  public async wrapToken(session: SATPSession): Promise<void> {
    const stepTag = `wrapToken()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.info(`${fnTag}, Wrapping Asset...`);
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT, false, false, true);

    const sessionData = session.getClientSessionData();
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "wrap-token-client",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "wrap-token-client",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, Wrapping Asset...`);

      if (sessionData.senderAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const networkId = {
        id: sessionData.senderAsset.networkId?.id,
        ledgerType: sessionData.senderAsset.networkId?.type as LedgerType,
      } as NetworkId;

      const token: FungibleAsset = protoToAsset(
        sessionData.senderAsset,
        networkId,
      ) as FungibleAsset;

      if (token.id == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (token.amount == undefined) {
        throw new AmountMissingError(fnTag);
      }

      this.Log.debug(`${fnTag}, Wrap: ${safeStableStringify(token)}`);

      this.Log.debug(
        `${fnTag}, Wrap Asset ID: ${token.id} amount: ${(token as FungibleAsset).amount.toString()}`,
      );

      const bridge = this.bridgeManager.getSATPExecutionLayer(
        networkId,
        this.claimFormat,
      );

      sessionData.senderWrapAssertionClaim = create(
        WrapAssertionClaimSchema,
        {},
      );

      const res = await bridge.wrapAsset(token);

      sessionData.senderWrapAssertionClaim.receipt = res.receipt;

      this.Log.debug(
        `${fnTag}, Wrap Operation Receipt: ${sessionData.senderWrapAssertionClaim.receipt}`,
      );

      sessionData.senderWrapAssertionClaim.proof = res.proof;

      sessionData.senderWrapAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.senderWrapAssertionClaim.receipt),
      );

      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "wrap-token-client",
        operation: "done",
        data: safeStableStringify(sessionData.senderWrapAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "wrap-token-client",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "WrapToken");
    }
  }
}
