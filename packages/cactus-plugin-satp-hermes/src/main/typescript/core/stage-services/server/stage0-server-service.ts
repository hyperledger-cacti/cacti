/**
 * @fileoverview
 * SATP Stage 0 Server Service - Transfer Initiation and Session Management
 *
 * @description
 * This module implements the server-side business logic for SATP (Secure Asset Transfer Protocol)
 * Stage 0, which handles incoming transfer requests, session creation, and asset validation
 * on the recipient gateway. Stage 0 server operations establish the foundation for cross-chain
 * asset transfers by validating requests and preparing the destination environment.
 *
 * **Stage 0 Server Responsibilities:**
 * - **Session Management**: Processes new session requests and creates transfer sessions
 * - **Request Validation**: Validates incoming transfer requests and asset parameters
 * - **Asset Verification**: Verifies asset properties and transfer eligibility
 * - **Response Generation**: Creates appropriate responses to client requests
 * - **State Management**: Maintains server-side session state and transfer context
 *
 * **Server-Side Operations:**
 * - **NewSessionResponse**: Responds to client session initiation requests
 * - **Request Processing**: Processes and validates PreSATPTransferRequest messages
 * - **Asset Validation**: Validates recipient assets and destination parameters
 * - **Proof Verification**: Verifies cryptographic proofs from client gateways
 * - **Error Handling**: Manages error conditions and recovery procedures
 *
 * **Integration Architecture:**
 * - **Bridge Integration**: Interfaces with destination blockchain bridge mechanisms
 * - **Asset Management**: Handles recipient asset creation and management
 * - **Cryptographic Services**: Manages signature verification and proof validation
 * - **Database Persistence**: Stores session data, proofs, and audit information
 * - **Monitoring Integration**: Provides comprehensive logging and metrics collection
 *
 * **Protocol Compliance:**
 * This implementation follows the IETF SATP Core v2 specification for Stage 0
 * server operations, ensuring interoperability and standards compliance across
 * different SATP gateway implementations and blockchain networks.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 * @see {@link SATPService} Base service class
 * @see {@link SATPSession} Session management interface
 * @see {@link BridgeManagerClientInterface} Bridge integration interface
 */

import {
  bufArray2HexStr,
  getHash,
  sign,
  verifySignature,
} from "../../../utils/gateway-utils";
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
  AssetMissing,
  LedgerAssetError,
  MessageTypeError,
  MissingBridgeManagerError,
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
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { createAssetId } from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import {
  SATPService,
  SATPServiceType,
  type ISATPServerServiceOptions,
  type ISATPServiceOptions,
} from "../satp-service";
import {
  FailedToProcessError,
  SessionNotFoundError,
} from "../../errors/satp-handler-errors";
import type { SATPInternalError } from "../../errors/satp-errors";
import { create } from "@bufbuild/protobuf";
import { type BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { NetworkId } from "../../../public-api";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { buildAndCheckAsset, SessionSide } from "../../satp-utils";
/**
 * SATP Stage 0 Server Service implementation for transfer request processing and session management.
 *
 * @description
 * Implements server-side business logic for SATP Stage 0 operations, handling incoming
 * transfer requests, session creation, and asset validation on the recipient gateway.
 * This service processes client requests and establishes the foundation for secure
 * cross-chain asset transfers.
 *
 * **Key Server Capabilities:**
 * - **Request Processing**: Handles NewSessionRequest and PreSATPTransferRequest messages
 * - **Session Creation**: Creates and manages SATP transfer sessions on server side
 * - **Asset Validation**: Validates recipient assets and destination parameters
 * - **Response Generation**: Creates appropriate Protocol Buffer responses
 * - **Bridge Coordination**: Coordinates with destination blockchain bridge mechanisms
 * - **Security Verification**: Validates cryptographic signatures and proofs
 *
 * **Stage 0 Server Protocol Flow:**
 * 1. **NewSessionRequest Processing**: Validates and responds to session creation requests
 * 2. **PreSATPTransferRequest Handling**: Processes transfer preparation requests
 * 3. **Asset Validation**: Verifies recipient asset properties and eligibility
 * 4. **Response Generation**: Creates signed responses with session parameters
 * 5. **State Persistence**: Stores session data and transfer context
 *
 * @public
 * @class Stage0ServerService
 * @extends {SATPService}
 * @since 0.0.3-beta
 * @see {@link SATPService} for base service functionality
 * @see {@link BridgeManagerClientInterface} for bridge integration
 * @see {@link SATPSession} for session management
 */
export class Stage0ServerService extends SATPService {
  /** SATP protocol stage identifier */
  public static readonly SATP_STAGE = "0";
  /** Service type designation */
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  /** Internal service name for identification */
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  /** Cross-chain bridge manager interface for destination bridge operations */
  private bridgeManager: BridgeManagerClientInterface;

  /** Asset claim format specification for proof verification */
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
      monitorService: ops.monitorService,
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
  /**
   * Validates an incoming NEW_SESSION_REQUEST and initializes server session data.
   *
   * @description
   * Verifies message type, client signature, session id, and creates or updates the
   * server-side session. Persists signature/hash/timestamp and returns a session
   * instance with server session data established.
   *
   * @param request - Incoming session creation request
   * @param session - Optional existing session reference to reuse
   * @param clientPubKey - Client gateway public key for signature verification
   * @returns Active server-side SATPSession
   * @throws {SignatureMissingError} If client signature missing
   * @throws {SessionIdError} If session id missing
   * @throws {MessageTypeError} If wrong message type
   * @throws {SignatureVerificationError} If signature verification fails
   */
  public async checkNewSessionRequest(
    request: NewSessionRequest,
    session: SATPSession | undefined,
    clientPubKey: string,
  ): Promise<SATPSession> {
    const stepTag = `checkNewSessionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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
            monitorService: this.monitorService,
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
            monitorService: this.monitorService,
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

        saveHash(
          newSessionData,
          MessageType.NEW_SESSION_REQUEST,
          getHash(request),
        );

        saveTimestamp(
          newSessionData,
          MessageType.NEW_SESSION_REQUEST,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, NewSessionRequest passed all checks.`);
        return session;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Validates PRE_SATP_TRANSFER_REQUEST consistency against server session state.
   *
   * @description
   * Ensures session id, previous hash, signature, sender/receiver assets and optional
   * fields are correct. Updates server session data with request details including
   * receiver asset token id generation.
   *
   * @param request - Incoming pre-transfer request
   * @param session - Active server session
   * @throws {SessionError} If session undefined
   * @throws {MessageTypeError} If wrong message type
   * @throws {Error} For missing mandatory fields or invalid signature/hash
   */
  public async checkPreSATPTransferRequest(
    request: PreSATPTransferRequest,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkPreSATPTransferRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, () => {
      try {
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
          !verifySignature(
            this.Signer,
            request,
            sessionData.clientGatewayPubkey,
          )
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async newSessionResponse(
    request: NewSessionRequest,
    session: SATPSession,
  ): Promise<NewSessionResponse> {
    const stepTag = `newSessionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
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
            MessageType.NEW_SESSION_RESPONSE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.NEW_SESSION_RESPONSE,
            getHash(newSessionResponse),
          );

          saveTimestamp(
            sessionData,
            MessageType.NEW_SESSION_RESPONSE,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionID: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending NewSessionResponse...`);

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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async newSessionErrorResponse(
    error: SATPInternalError,
  ): Promise<NewSessionResponse> {
    const fnTag = `${this.getServiceIdentifier()}#newSessionErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async preSATPTransferErrorResponse(
    error: SATPInternalError,
    session?: SATPSession,
  ): Promise<PreSATPTransferResponse> {
    const fnTag = `${this.getServiceIdentifier()}#preSATPTransferErrorResponse()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async preSATPTransferResponse(
    request: PreSATPTransferRequest,
    session: SATPSession,
  ): Promise<PreSATPTransferResponse> {
    const stepTag = `preSATPTransferResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.PRE_SATP_TRANSFER_RESPONSE];
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

          const preSATPTransferResponse = create(
            PreSATPTransferResponseSchema,
            {
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
            },
          );

          const messageSignature = bufArray2HexStr(
            sign(this.Signer, safeStableStringify(preSATPTransferResponse)),
          );

          preSATPTransferResponse.serverSignature = messageSignature;

          saveSignature(
            sessionData,
            MessageType.PRE_SATP_TRANSFER_RESPONSE,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.PRE_SATP_TRANSFER_RESPONSE,
            getHash(preSATPTransferResponse),
          );

          saveTimestamp(
            sessionData,
            MessageType.PRE_SATP_TRANSFER_RESPONSE,
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async wrapToken(session: SATPSession): Promise<void> {
    const stepTag = `wrapToken()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
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

          const tokenBuildData = buildAndCheckAsset(
            fnTag,
            stepTag,
            this.Log,
            sessionData,
            SessionSide.SERVER,
          );

          const bridge = this.bridgeManager.getSATPExecutionLayer(
            tokenBuildData.networkId,
            this.claimFormat,
          );

          sessionData.receiverWrapAssertionClaim = create(
            WrapAssertionClaimSchema,
            {},
          );

          const res = await bridge.wrapAsset(tokenBuildData.token);

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
            data: safeStableStringify(
              sessionData.receiverWrapAssertionClaim.proof,
            ),
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
  private setError(
    message: NewSessionResponse | PreSATPTransferResponse,
    error: SATPInternalError,
  ): NewSessionResponse | PreSATPTransferResponse {
    const fnTag = `${this.getServiceIdentifier()}#setError()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        message.error = true;
        message.errorCode = error.getSATPErrorType();
        return message;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
