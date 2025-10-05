/**
 * @fileoverview
 * SATP Stage 0 Client Service - Transfer Initiation and Session Negotiation
 *
 * @description
 * This module implements the client-side business logic for SATP (Secure Asset Transfer Protocol)
 * Stage 0, which handles transfer initiation and session negotiation between client and server
 * gateways. Stage 0 is the foundational stage that establishes the transfer context, negotiates
 * protocol parameters, and prepares the asset for cross-chain transfer.
 *
 * **Stage 0 Responsibilities:**
 * - **Session Initiation**: Creates new SATP sessions and negotiates parameters
 * - **Transfer Preparation**: Validates transfer requests and asset properties
 * - **Asset Wrapping**: Prepares assets for cross-chain transfer through wrapping
 * - **Proof Generation**: Creates cryptographic proofs of asset states and operations
 * - **Gateway Communication**: Handles client-server message exchange for session setup
 *
 * **Client-Side Operations:**
 * - **NewSessionRequest**: Initiates new SATP transfer sessions
 * - **Response Validation**: Validates server responses and session confirmations
 * - **PreSATPTransferRequest**: Requests transfer preparation and asset validation
 * - **Asset Wrapping**: Wraps assets for cross-chain transfer operations
 * - **Proof Management**: Generates and stores cryptographic proofs
 *
 * **Integration Points:**
 * - **Bridge Managers**: Interfaces with cross-chain bridge implementations
 * - **Asset Management**: Handles various asset types across different ledgers
 * - **Cryptographic Services**: Manages digital signatures and proof generation
 * - **Session Management**: Maintains transfer session state and metadata
 * - **Database Persistence**: Stores session data, proofs, and audit trails
 *
 * **Protocol Compliance:**
 * This implementation follows the IETF SATP Core v2 specification for Stage 0
 * operations, ensuring interoperability with compliant SATP implementations
 * across different gateway vendors and blockchain networks.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 * @see {@link SATPService} Base service class
 * @see {@link SATPSession} Session management interface
 * @see {@link BridgeManagerClientInterface} Bridge integration interface
 */

import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
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
  HashError,
  LedgerAssetError,
  LedgerAssetIdError,
  MessageTypeError,
  MissingBridgeManagerError,
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
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { signatureVerifier } from "../data-verifier";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { getMessageTypeName } from "../../satp-utils";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { NetworkId } from "../../../public-api";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { buildAndCheckAsset, SessionSide } from "../../satp-utils";

/**
 * SATP Stage 0 Client Service implementation for transfer initiation and session negotiation.
 *
 * @description
 * Implements client-side business logic for SATP Stage 0 operations, handling the initial
 * phase of cross-chain asset transfers. This service manages session creation, parameter
 * negotiation, asset preparation, and the foundational steps required before proceeding
 * to subsequent SATP protocol stages.
 *
 * **Key Capabilities:**
 * - **Session Management**: Creates and manages SATP transfer sessions
 * - **Gateway Communication**: Handles client-server protocol message exchange
 * - **Asset Preparation**: Prepares assets for cross-chain transfer operations
 * - **Proof Generation**: Creates cryptographic proofs and assertions
 * - **Bridge Integration**: Interfaces with cross-chain bridge mechanisms
 * - **Error Handling**: Comprehensive error detection and recovery
 *
 * **Stage 0 Protocol Flow:**
 * 1. **NewSessionRequest**: Client initiates transfer session with server
 * 2. **NewSessionResponse**: Server responds with session parameters and acceptance
 * 3. **PreSATPTransferRequest**: Client requests transfer preparation and validation
 * 4. **Asset Wrapping**: Client wraps assets for cross-chain transfer
 * 5. **Proof Storage**: Client generates and stores cryptographic proofs
 *
 * **Integration Architecture:**
 * - Extends SATPService base class for common functionality
 * - Uses BridgeManagerClientInterface for cross-chain bridge operations
 * - Integrates with database persistence for session and proof storage
 * - Implements comprehensive monitoring and logging capabilities
 *
 * @public
 * @class Stage0ClientService
 * @extends {SATPService}
 * @since 0.0.3-beta
 * @see {@link SATPService} for base service functionality
 * @see {@link BridgeManagerClientInterface} for bridge integration
 * @see {@link SATPSession} for session management
 */
export class Stage0ClientService extends SATPService {
  /** SATP protocol stage identifier */
  public static readonly SATP_STAGE = "0";
  /** Service type designation */
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  /** Internal service name for identification */
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  /** Cross-chain bridge manager interface for bridge operations */
  private bridgeManager: BridgeManagerClientInterface;

  /** Asset claim format specification for proof generation */
  private claimFormat: ClaimFormat;

  /**
   * Constructs a new Stage 0 Client Service instance.
   *
   * @description
   * Initializes the Stage 0 client service with all required dependencies including
   * bridge management, cryptographic services, and database persistence. Validates
   * that all essential components are available for Stage 0 operations.
   *
   * **Initialization Process:**
   * 1. **Base Service Setup**: Configures common service properties and dependencies
   * 2. **Bridge Validation**: Ensures bridge manager is available for cross-chain operations
   * 3. **Claim Format**: Sets up asset claim format for proof generation
   * 4. **Service Registration**: Registers service with monitoring and logging systems
   *
   * @public
   * @constructor
   * @param {ISATPClientServiceOptions} ops - Client service configuration options
   * @throws {MissingBridgeManagerError} When bridge manager is not provided
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * const stage0Client = new Stage0ClientService({
   *   serviceName: 'Stage0Client',
   *   loggerOptions: { level: 'info' },
   *   signer: cryptoSigner,
   *   bridgeManager: bridgeInterface,
   *   dbLogger: persistence,
   *   monitorService: monitoring,
   *   claimFormat: ClaimFormat.DEFAULT
   * });
   * ```
   */
  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ClientService.SERVICE_TYPE,
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
   * Creates a new SATP session request to initiate cross-chain asset transfer.
   *
   * @description
   * Initiates a new SATP transfer session by creating and configuring a NewSessionRequest
   * message. This is the first step in the SATP protocol flow, establishing the transfer
   * context, asset details, and gateway identifiers for the cross-chain operation.
   *
   * **Operation Steps:**
   * 1. **Session Validation**: Validates session and gateway parameters
   * 2. **Message Creation**: Creates Protocol Buffer NewSessionRequest message
   * 3. **Common Fields**: Populates standard SATP message fields
   * 4. **Asset Information**: Includes source asset details and recipient gateway
   * 5. **Cryptographic Signing**: Signs the request for authentication
   * 6. **Hash Generation**: Creates message hash for integrity verification
   * 7. **Session Persistence**: Stores session data and request details
   *
   * @public
   * @async
   * @method newSessionRequest
   * @param {SATPSession} session - SATP session containing transfer parameters
   * @param {string} thisGatewayId - Client gateway identifier
   * @returns {Promise<NewSessionRequest>} Protocol Buffer new session request message
   * @throws {SessionError} When session is invalid or missing
   * @throws {TokenIdMissingError} When source asset token ID is missing
   * @throws {AmountMissingError} When transfer amount is missing
   * @throws {LedgerAssetIdError} When asset ledger ID is invalid
   * @since 0.0.3-beta
   */
  public async newSessionRequest(
    session: SATPSession,
    thisGatewayId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `newSessionRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.NEW_SESSION_REQUEST];

        if (!session) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT, false, false, true);
        const sessionData = session.getClientSessionData();

        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
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
            sessionId: sessionData.id,
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
            sessionId: sessionData.id,
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

  public async checkNewSessionResponse(
    response: NewSessionResponse,
    session: SATPSession,
    sessionIds: string[],
  ): Promise<SATPSession> {
    const stepTag = `checkNewSessionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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

        saveHash(
          sessionData,
          MessageType.NEW_SESSION_RESPONSE,
          getHash(response),
        );

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
            monitorService: this.monitorService,
          });

          copySessionDataAttributes(
            sessionData,
            session.getClientSessionData(),
            response.sessionId,
            response.contextId,
          );
        }
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

  public async preSATPTransferRequest(
    session: SATPSession,
  ): Promise<PreSATPTransferRequest> {
    const stepTag = `preSATPTransferRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.PRE_SATP_TRANSFER_REQUEST];

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT, false, false, true);

        const sessionData = session.getClientSessionData();
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
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
            sessionId: sessionData.id,
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
            sessionId: sessionData.id,
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
        this.Log.info(`${fnTag}, Wrapping Asset...`);
        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT, false, false, true);

        const sessionData = session.getClientSessionData();
        this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: "wrap-token-client",
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });
        try {
          this.Log.info(`exec-${stepTag}`);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "wrap-token-client",
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
            SessionSide.CLIENT,
          );

          const bridge = this.bridgeManager.getSATPExecutionLayer(
            tokenBuildData.networkId,
            this.claimFormat,
          );

          sessionData.senderWrapAssertionClaim = create(
            WrapAssertionClaimSchema,
            {},
          );

          const res = await bridge.wrapAsset(tokenBuildData.token);

          sessionData.senderWrapAssertionClaim.receipt = res.receipt;

          this.Log.debug(
            `${fnTag}, Wrap Operation Receipt: ${sessionData.senderWrapAssertionClaim.receipt}`,
          );

          sessionData.senderWrapAssertionClaim.proof = res.proof;

          sessionData.senderWrapAssertionClaim.signature = bufArray2HexStr(
            sign(this.Signer, sessionData.senderWrapAssertionClaim.receipt),
          );

          this.dbLogger.storeProof({
            sessionId: sessionData.id,
            type: "wrap-token-client",
            operation: "done",
            data: safeStableStringify(
              sessionData.senderWrapAssertionClaim.proof,
            ),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, done-${fnTag}`);
        } catch (error) {
          this.logger.debug(`Crash in ${fnTag}`, error);
          this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: "wrap-token-client",
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw new FailedToProcessError(fnTag, "WrapToken");
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
}
