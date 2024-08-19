import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  MessageType,
  WrapAssertionClaim,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
} from "../../../generated/proto/cacti/satp/v02/stage_0_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPBridgesManager } from "../../../gol/satp-bridges-manager";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import {
  GatewayNetworkIdError,
  HashError,
  LedgerAssetError,
  LedgerAssetIdError,
  MissingBridgeManagerError,
  OntologyContractError,
  SessionError,
  SessionIdError,
  SessionMissMatchError,
  SignatureVerificationError,
  TransferContextIdError,
} from "../../errors/satp-service-errors";
import { SATPSession } from "../../satp-session";
import {
  copySessionDataAttributes,
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { SupportedChain } from "../../types";
import { signatureVerifier } from "../data-verifier";
import { Asset } from "../satp-bridge/types/asset";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { protoToAsset } from "../service-utils";

export class Stage0ClientService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: SATPBridgesManager;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ClientService.SERVICE_TYPE,
    };
    super(commonOptions);
    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }
    this.bridgeManager = ops.bridgeManager;
  }

  public async newSessionRequest(
    session: SATPSession,
    thisGatewayId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `newSessionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const newSessionRequestMessage = new NewSessionRequest();
    newSessionRequestMessage.sessionId = sessionData.id;
    newSessionRequestMessage.contextId = sessionData.transferContextId;
    newSessionRequestMessage.recipientGatewayNetworkId =
      sessionData.recipientGatewayNetworkId;
    newSessionRequestMessage.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    newSessionRequestMessage.gatewayId = thisGatewayId;
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

    this.Log.info(`${fnTag}, sending NewSessionRequest...`);

    return newSessionRequestMessage;
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

    session.verify(fnTag, SessionType.CLIENT);

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

    if (
      response.recipientGatewayNetworkId == "" ||
      response.recipientGatewayNetworkId !=
        sessionData.recipientGatewayNetworkId
    ) {
      throw new GatewayNetworkIdError(fnTag);
    }

    if (
      response.senderGatewayNetworkId == "" ||
      response.senderGatewayNetworkId != sessionData.senderGatewayNetworkId
    ) {
      throw new GatewayNetworkIdError(fnTag);
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

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    if (sessionData.receiverContractOntology == "") {
      //TODO check ontology
      throw new OntologyContractError(fnTag);
    }

    if (sessionData.senderAsset?.tokenId == "") {
      throw new LedgerAssetIdError(fnTag);
    }

    if (sessionData.senderGatewayNetworkId == "") {
      throw new GatewayNetworkIdError(fnTag);
    }

    if (sessionData.senderAsset == undefined) {
      throw new LedgerAssetError(fnTag);
    }

    if (sessionData.receiverAsset == undefined) {
      throw new LedgerAssetError(fnTag);
    }

    const preSATPTransferRequest = new PreSATPTransferRequest();
    preSATPTransferRequest.sessionId = sessionData.id;
    preSATPTransferRequest.contextId = sessionData.transferContextId;
    preSATPTransferRequest.clientTransferNumber =
      sessionData.clientTransferNumber;
    preSATPTransferRequest.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    preSATPTransferRequest.recipientGatewayNetworkId =
      sessionData.recipientGatewayNetworkId;
    preSATPTransferRequest.senderAsset = sessionData.senderAsset;
    preSATPTransferRequest.receiverAsset = sessionData.receiverAsset;
    preSATPTransferRequest.wrapAssertionClaim =
      sessionData.senderWrapAssertionClaim;
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

    this.Log.info(`${fnTag}, sending PreSATPTransferRequest...`);

    return preSATPTransferRequest;
  }

  public async wrapToken(session: SATPSession): Promise<void> {
    const stepTag = `wrapToken()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    try {
      this.Log.info(`${fnTag}, Wrapping Asset...`);

      if (session == undefined) {
        throw new SessionError(fnTag);
      }

      session.verify(fnTag, SessionType.CLIENT);

      const sessionData = session.getClientSessionData();

      if (sessionData.senderGatewayNetworkId == "") {
        throw new GatewayNetworkIdError(fnTag);
      }

      if (sessionData.senderAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const token: Asset = protoToAsset(
        sessionData.senderAsset,
        sessionData.senderGatewayNetworkId as SupportedChain,
      );

      const assetId = token.tokenId;
      const amount = token.amount.toString();

      this.Log.debug(`${fnTag}, Wrap: ${safeStableStringify(token)}`);

      this.Log.debug(`${fnTag}, Wrap Asset ID: ${assetId} amount: ${amount}`);
      if (assetId == undefined) {
        throw new LedgerAssetIdError(fnTag);
      }

      const bridge = this.bridgeManager.getBridge(
        sessionData.senderGatewayNetworkId,
      );

      sessionData.senderWrapAssertionClaim = new WrapAssertionClaim();
      sessionData.senderWrapAssertionClaim.receipt =
        await bridge.wrapAsset(token);

      sessionData.senderWrapAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.senderWrapAssertionClaim.receipt),
      );
    } catch (error) {
      this.logger.debug(`Crash in ${fnTag}`, error);
      throw new FailedToProcessError(fnTag, "WrapToken");
    }
  }
}
