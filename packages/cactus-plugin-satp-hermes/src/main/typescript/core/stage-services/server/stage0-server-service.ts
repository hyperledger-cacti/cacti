import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import {
  ClaimFormat,
  MessageType,
  WrapAssertionClaimSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  type NewSessionRequest,
  type NewSessionResponse,
  NewSessionResponseSchema,
  type PreSATPTransferRequest,
  type PreSATPTransferResponse,
  PreSATPTransferResponseSchema,
  STATUS,
} from "../../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  AmountMissingError,
  AssetMissing,
  LedgerAssetError,
  MessageTypeError,
  MissingBridgeManagerError,
  SessionDataNotAvailableError,
  SessionError,
  SessionIdError,
  SignatureMissingError,
  SignatureVerificationError,
  TokenIdMissingError,
} from "../../errors/satp-service-errors";
import { SATPSession } from "../../satp-session";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import {
  createAssetId,
  type FungibleAsset,
} from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import {
  SATPService,
  SATPServiceType,
  type ISATPServerServiceOptions,
  type ISATPServiceOptions,
} from "../satp-service";
import { protoToAsset } from "../service-utils";
import {
  FailedToProcessError,
  SessionNotFoundError,
} from "../../errors/satp-handler-errors";
import type { SATPInternalError } from "../../errors/satp-errors";
import { create } from "@bufbuild/protobuf";
import { type BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { NetworkId } from "../../../public-api";
export class Stage0ServerService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPServerServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ServerService.SERVICE_TYPE,
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

  public async checkNewSessionRequest(
    request: NewSessionRequest,
    session: SATPSession | undefined,
    clientPubKey: string,
  ): Promise<SATPSession> {
    const stepTag = `checkNewSessionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (request == undefined) {
      throw new Error(`${fnTag}, Request is undefined`);
    }

    if (request.clientSignature == "") {
      throw new SignatureMissingError(fnTag);
    }

    if (request.sessionId == "") {
      throw new SessionIdError(fnTag);
    }

    if (request.messageType != MessageType.NEW_SESSION_REQUEST) {
      throw new MessageTypeError(
        fnTag,
        request.messageType.toString(),
        MessageType.NEW_SESSION_REQUEST.toString(),
      );
    }

    if (!verifySignature(this.Signer, request, clientPubKey)) {
      throw new SignatureVerificationError(fnTag);
    }

    if (session == undefined) {
      this.Log.debug(`${fnTag}, Session is undefined needs to be created`);
      session = new SATPSession({
        contextID: request.contextId,
        sessionID: request.sessionId,
        server: true,
        client: false,
      });
    } else if (!session.hasServerSessionData()) {
      this.Log.debug(`${fnTag}, Session does not have server session data`);
      session.createSessionData(
        SessionType.SERVER,
        request.sessionId,
        request.contextId,
      );
    } else {
      this.Log.debug(`${fnTag}, Session is already has a server session`);
      session = new SATPSession({
        contextID: request.contextId,
        server: true,
        client: false,
      });
      this.Log.debug(
        `${fnTag}, Session created with new sessionID ${session.getSessionId()}`,
      );
    }

    const newSessionData = session.getServerSessionData();

    newSessionData.clientGatewayPubkey = clientPubKey;

    saveSignature(
      newSessionData,
      MessageType.NEW_SESSION_REQUEST,
      request.clientSignature,
    );

    saveHash(newSessionData, MessageType.NEW_SESSION_REQUEST, getHash(request));

    saveTimestamp(
      newSessionData,
      MessageType.NEW_SESSION_REQUEST,
      TimestampType.RECEIVED,
    );

    this.Log.info(`${fnTag}, NewSessionRequest passed all checks.`);
    return session;
  }

  public async checkPreSATPTransferRequest(
    request: PreSATPTransferRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkPreSATPTransferRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    if (!session.hasServerSessionData()) {
      throw new Error(`${fnTag}, Session Data is missing`);
    }

    const sessionData = session.getServerSessionData();

    if (request.sessionId != sessionData.id) {
      throw new Error(`${fnTag}, Session ID does not match`);
    }

    if (request.senderGatewayNetworkId == "") {
      throw new Error(`${fnTag}, Sender Gateway Network ID does not match`);
    }

    sessionData.senderGatewayNetworkId = request.senderGatewayNetworkId;

    if (request.senderAsset == undefined) {
      throw new Error(`${fnTag}, Sender Asset is missing`);
    }

    if (request.receiverAsset == undefined) {
      throw new Error(`${fnTag}, Receiver Asset is missing`);
    }

    if (request.messageType != MessageType.PRE_SATP_TRANSFER_REQUEST) {
      throw new MessageTypeError(
        fnTag,
        request.messageType.toString(),
        MessageType.PRE_SATP_TRANSFER_REQUEST.toString(),
      );
    }

    if (
      request.hashPreviousMessage !=
      getMessageHash(sessionData, MessageType.NEW_SESSION_RESPONSE)
    ) {
      throw new Error(`${fnTag}, Hash of previous message does not match`);
    }

    if (request.clientSignature == "") {
      throw new Error(`${fnTag}, Client Signature is missing`);
    }

    if (
      !verifySignature(this.Signer, request, sessionData.clientGatewayPubkey)
    ) {
      throw new Error(`${fnTag}, Client Signature is invalid`);
    }

    if (request.senderAsset == undefined) {
      throw new Error(`${fnTag}, Sender Asset is missing`);
    }

    sessionData.senderAsset = request.senderAsset;

    if (request.receiverAsset == undefined) {
      throw new Error(`${fnTag}, Receiver Asset is missing`);
    }

    if (request.wrapAssertionClaim == undefined) {
      throw new Error(`${fnTag}, Wrap Assertion Claim is missing`);
    }

    if (request.clientTransferNumber != "") {
      this.Log.info(
        `${fnTag}, Optional variable loaded: clientTransferNumber...`,
      );
      sessionData.clientTransferNumber = request.clientTransferNumber;
    }

    saveSignature(
      sessionData,
      MessageType.PRE_SATP_TRANSFER_REQUEST,
      request.clientSignature,
    );

    saveHash(
      sessionData,
      MessageType.PRE_SATP_TRANSFER_REQUEST,
      getHash(request),
    );

    saveTimestamp(
      sessionData,
      MessageType.PRE_SATP_TRANSFER_REQUEST,
      TimestampType.RECEIVED,
    );

    //TODO maybe do a hard copy, reason: after the hash because this changes the req object
    sessionData.receiverAsset = request.receiverAsset;

    sessionData.receiverAsset.tokenId = createAssetId(
      request.contextId,
      request.receiverAsset.tokenType,
      sessionData.recipientGatewayNetworkId,
    );

    this.Log.info(`${fnTag}, PreSATPTransferRequest passed all checks.`);
  }

  public async newSessionResponse(
    request: NewSessionRequest,
    session: SATPSession,
  ): Promise<NewSessionResponse> {
    const stepTag = `newSessionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.NEW_SESSION_RESPONSE];
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    if (!session.hasServerSessionData()) {
      throw new SessionDataNotAvailableError("server", fnTag);
    }
    const sessionData = session.getServerSessionData();

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
      const newSessionResponse = create(NewSessionResponseSchema, {
        sessionId: sessionData.id,
        contextId: sessionData.transferContextId,
        messageType: MessageType.NEW_SESSION_RESPONSE,
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.NEW_SESSION_REQUEST,
        ),
      });

      if (sessionData.id != request.sessionId) {
        newSessionResponse.status = STATUS.STATUS_REJECTED;
      } else {
        newSessionResponse.status = STATUS.STATUS_ACCEPTED;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(newSessionResponse)),
      );

      newSessionResponse.serverSignature = messageSignature;

      saveSignature(
        sessionData,
        MessageType.NEW_SESSION_REQUEST,
        messageSignature,
      );

      saveHash(sessionData, MessageType.NEW_SESSION_REQUEST, fnTag);

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

      return newSessionResponse;
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

  public async newSessionErrorResponse(
    error: SATPInternalError,
  ): Promise<NewSessionResponse> {
    let newSessionResponse = create(NewSessionResponseSchema, {
      messageType: MessageType.NEW_SESSION_RESPONSE,
    });

    newSessionResponse = this.setError(
      newSessionResponse,
      error,
    ) as NewSessionResponse;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(newSessionResponse)),
    );

    newSessionResponse.serverSignature = messageSignature;

    return newSessionResponse;
  }

  public async preSATPTransferErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<PreSATPTransferResponse> {
    let preSATPTransferResponse = create(PreSATPTransferResponseSchema, {
      messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE,
    });

    preSATPTransferResponse = this.setError(
      preSATPTransferResponse,
      error,
    ) as PreSATPTransferResponse;

    if (!(error instanceof SessionNotFoundError) && session != undefined) {
      preSATPTransferResponse.sessionId = session.getServerSessionData().id;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(preSATPTransferResponse)),
    );

    preSATPTransferResponse.serverSignature = messageSignature;

    return preSATPTransferResponse;
  }

  public async preSATPTransferResponse(
    request: PreSATPTransferRequest,
    session: SATPSession,
  ): Promise<PreSATPTransferResponse> {
    const stepTag = `preSATPTransferResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.PRE_TRANSFER_COMMENCE_RESPONSE];
    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    if (!session.hasServerSessionData()) {
      throw new SessionDataNotAvailableError("server", fnTag);
    }

    const sessionData = session.getServerSessionData();

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

      if (request.receiverAsset == undefined) {
        throw new AssetMissing(fnTag);
      }

      const bridge = this.bridgeManager.getBridgeEndPoint(
        {
          id: sessionData.receiverAsset?.networkId?.id,
          ledgerType: sessionData.receiverAsset?.networkId?.type,
        } as NetworkId,
        this.claimFormat,
      );

      if (!sessionData.receiverAsset?.tokenType) {
        throw new LedgerAssetError(`${fnTag}, tokenType is missing`);
      }

      sessionData.recipientGatewayNetworkId = bridge.getApproveAddress(
        sessionData.receiverAsset?.tokenType,
      );

      const preSATPTransferResponse = create(PreSATPTransferResponseSchema, {
        sessionId: sessionData.id,
        contextId: sessionData.transferContextId,
        recipientGatewayNetworkId: sessionData.recipientGatewayNetworkId,
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.PRE_SATP_TRANSFER_REQUEST,
        ),
        wrapAssertionClaim: sessionData.receiverWrapAssertionClaim,
        recipientTokenId: sessionData.receiverAsset!.tokenId,
        messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE,
      });

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(preSATPTransferResponse)),
      );

      preSATPTransferResponse.serverSignature = messageSignature;

      saveSignature(
        sessionData,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        messageSignature,
      );

      saveHash(sessionData, MessageType.PRE_SATP_TRANSFER_REQUEST, fnTag);

      saveTimestamp(
        sessionData,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag},  sending PreSATPTransferResponse...`);

      return preSATPTransferResponse;
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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    const sessionData = session.getServerSessionData();
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "wrap-token-server",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "wrap-token-server",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, Wrapping Asset...`);

      if (sessionData.receiverAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const networkId = {
        id: sessionData.receiverAsset.networkId?.id,
        ledgerType: sessionData.receiverAsset.networkId?.type as LedgerType,
      } as NetworkId;

      const token: FungibleAsset = protoToAsset(
        sessionData.receiverAsset,
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

      sessionData.receiverWrapAssertionClaim = create(
        WrapAssertionClaimSchema,
        {},
      );

      const res = await bridge.wrapAsset(token);

      sessionData.receiverWrapAssertionClaim.receipt = res.receipt;

      this.Log.debug(
        `${fnTag}, Wrap Operation Receipt: ${sessionData.receiverWrapAssertionClaim.receipt}`,
      );

      sessionData.receiverWrapAssertionClaim.proof = res.proof;

      sessionData.receiverWrapAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.receiverWrapAssertionClaim.receipt),
      );

      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "wrap-token-server",
        operation: "done",
        data: safeStableStringify(sessionData.receiverWrapAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.Log.debug(`Crash in ${fnTag}`, error);

      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "wrap-token-server",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "WrapAsset", error);
    }
  }
  private setError(
    message: NewSessionResponse | PreSATPTransferResponse,
    error: SATPInternalError,
  ): NewSessionResponse | PreSATPTransferResponse {
    message.error = true;
    message.errorCode = error.getSATPErrorType();
    return message;
  }
}
