import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../gateway-utils";
import {
  MessageType,
  WrapAssertionClaimSchema,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  NewSessionRequestMessage,
  NewSessionResponseMessage,
  NewSessionResponseMessageSchema,
  PreSATPTransferRequestMessage,
  PreSATPTransferResponseMessage,
  PreSATPTransferResponseMessageSchema,
  STATUS,
} from "../../../generated/proto/cacti/satp/v02/stage_0_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import {
  AssetMissing,
  GatewayNetworkIdError,
  LedgerAssetError,
  MessageTypeError,
  MissingBridgeManagerError,
  NetworkIdError,
  SessionDataNotAvailableError,
  SessionError,
  SessionIdError,
  SignatureMissingError,
  SignatureVerificationError,
} from "../../errors/satp-service-errors";
import { SATPSession } from "../../satp-session";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { Asset, createAssetId } from "../satp-bridge/types/asset";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { protoToAsset } from "../service-utils";
import {
  FailedToProcessError,
  SessionNotFoundError,
} from "../../errors/satp-handler-errors";
import { SATPInternalError } from "../../errors/satp-errors";
import { create } from "@bufbuild/protobuf";
export class Stage0ServerService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPServerServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ServerService.SERVICE_TYPE,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  public async checkNewSessionRequest(
    request: NewSessionRequestMessage,
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

    if (request.senderGatewayNetworkId == "") {
      throw new NetworkIdError(fnTag, "Sender");
    }

    if (request.recipientGatewayNetworkId == "") {
      throw new NetworkIdError(fnTag, "Recipient");
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
    newSessionData.senderGatewayNetworkId = request.senderGatewayNetworkId;
    newSessionData.recipientGatewayNetworkId =
      request.recipientGatewayNetworkId;

    saveSignature(
      newSessionData,
      MessageType.NEW_SESSION_REQUEST,
      request.clientSignature,
    );

    saveHash(newSessionData, MessageType.NEW_SESSION_REQUEST, getHash(request));

    this.Log.info(`${fnTag}, NewSessionRequest passed all checks.`);
    return session;
  }

  public async checkPreSATPTransferRequest(
    request: PreSATPTransferRequestMessage,
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

    if (request.senderGatewayNetworkId != sessionData.senderGatewayNetworkId) {
      throw new Error(`${fnTag}, Sender Gateway Network ID does not match`);
    }

    if (
      request.recipientGatewayNetworkId != sessionData.recipientGatewayNetworkId
    ) {
      throw new Error(`${fnTag}, Recipient Gateway Network ID does not match`);
    }

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
    request: NewSessionRequestMessage,
    session: SATPSession,
  ): Promise<NewSessionResponseMessage> {
    const stepTag = `newSessionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    if (!session.hasServerSessionData()) {
      throw new SessionDataNotAvailableError("server", fnTag);
    }
    const sessionData = session.getServerSessionData();

    const newSessionResponse = create(NewSessionResponseMessageSchema, {
      sessionId: sessionData.id,
      contextId: sessionData.transferContextId,
      recipientGatewayNetworkId: sessionData.recipientGatewayNetworkId,
      senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
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

    this.Log.info(`${fnTag}, sending NewSessionRequest...`);

    return newSessionResponse;
  }

  public async newSessionErrorResponse(
    error: SATPInternalError,
  ): Promise<NewSessionResponseMessage> {
    let newSessionResponse = create(NewSessionResponseMessageSchema, {
      messageType: MessageType.NEW_SESSION_RESPONSE,
    });

    newSessionResponse = this.setError(
      newSessionResponse,
      error,
    ) as NewSessionResponseMessage;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, safeStableStringify(newSessionResponse)),
    );

    newSessionResponse.serverSignature = messageSignature;

    return newSessionResponse;
  }

  public async preSATPTransferErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<PreSATPTransferResponseMessage> {
    let preSATPTransferResponse = create(PreSATPTransferResponseMessageSchema, {
      messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE,
    });

    preSATPTransferResponse = this.setError(
      preSATPTransferResponse,
      error,
    ) as PreSATPTransferResponseMessage;

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
    request: PreSATPTransferRequestMessage,
    session: SATPSession,
  ): Promise<PreSATPTransferResponseMessage> {
    const stepTag = `preSATPTransferResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    if (!session.hasServerSessionData()) {
      throw new SessionDataNotAvailableError("server", fnTag);
    }

    const sessionData = session.getServerSessionData();

    if (request.receiverAsset == undefined) {
      throw new AssetMissing(fnTag);
    }

    const preSATPTransferResponse = create(
      PreSATPTransferResponseMessageSchema,
      {
        sessionId: sessionData.id,
        contextId: sessionData.transferContextId,
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.PRE_SATP_TRANSFER_REQUEST,
        ),
        wrapAssertionClaim: sessionData.receiverWrapAssertionClaim,
        recipientTokenId: sessionData.receiverAsset!.tokenId,
        messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE,
      },
    );

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

    this.Log.info(`${fnTag}, sending PreSATPTransferResponse...`);

    return preSATPTransferResponse;
  }

  public async wrapToken(session: SATPSession): Promise<void> {
    const stepTag = `wrapToken()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Wrapping Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      //TODO: check if is necessary to verify more things

      const sessionData = session.getServerSessionData();

      if (sessionData.recipientGatewayNetworkId == "") {
        throw new GatewayNetworkIdError(fnTag);
      }

      if (sessionData.receiverAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const token: Asset = protoToAsset(
        sessionData.receiverAsset,
        sessionData.recipientGatewayNetworkId,
      );

      const assetId = token.tokenId;
      const amount = token.amount.toString();

      this.Log.debug(`${fnTag}, Wrap Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new Error(`${fnTag}, Asset ID is missing`);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.recipientGatewayNetworkId,
      );

      sessionData.receiverWrapAssertionClaim = create(
        WrapAssertionClaimSchema,
        {},
      );
      sessionData.receiverWrapAssertionClaim.receipt =
        await bridge.wrapAsset(token);
      sessionData.receiverWrapAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.receiverWrapAssertionClaim.receipt),
      );
    } catch (error) {
      throw new FailedToProcessError(fnTag, "WrapAsset", error);
    }
  }

  private setError(
    message: NewSessionResponseMessage | PreSATPTransferResponseMessage,
    error: SATPInternalError,
  ): NewSessionResponseMessage | PreSATPTransferResponseMessage {
    message.error = true;
    message.errorCode = error.getSATPErrorType();
    return message;
  }
}
