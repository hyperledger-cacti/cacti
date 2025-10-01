/**
 * @fileoverview
 * SATP Stage 0 Handler for Transfer Initiation and Session Establishment.
 *
 * @description
 * This module implements the Stage 0 handler of the IETF SATP Core v2 protocol,
 * responsible for managing the initial phase of cross-chain asset transfers.
 * Stage 0 encompasses session establishment, gateway authentication, asset
 * validation, and pre-transfer preparations required before the actual
 * cross-chain transfer workflow can commence.
 *
 * **Stage 0 Protocol Flow:**
 * 1. **New Session Request/Response**: Initial session establishment between gateways
 * 2. **Pre-SATP Transfer Request/Response**: Asset validation and transfer preparation
 *
 * **Key Responsibilities:**
 * - **Session Management**: Creating and validating new SATP transfer sessions
 * - **Gateway Authentication**: Validating gateway identities and public keys
 * - **Asset Validation**: Verifying asset profiles and transfer parameters
 * - **Token Wrapping**: Preparing assets for cross-chain transfer operations
 * - **Protocol Compliance**: Ensuring IETF SATP specification adherence
 *
 * **Server-Side Operations:**
 * - Validates incoming session requests from client gateways
 * - Performs gateway authentication using public key cryptography
 * - Creates new transfer sessions with validated parameters
 * - Prepares receiver-side assets for cross-chain operations
 * - Generates appropriate response messages with session data
 *
 * **Client-Side Operations:**
 * - Initiates new transfer sessions with target gateways
 * - Submits pre-transfer requests with asset and recipient details
 * - Processes server responses and updates local session state
 * - Prepares sender-side assets for subsequent transfer stages
 *
 * **Monitoring and Observability:**
 * - OpenTelemetry distributed tracing for cross-gateway operations
 * - Performance metrics collection for transfer initiation times
 * - Error tracking and diagnostic information capture
 * - Session lifecycle monitoring and audit trail creation
 *
 * @example
 * Server-side stage 0 handler setup:
 * ```typescript
 * const stage0Handler = new Stage0SATPHandler({
 *   sessions: sessionMap,
 *   serverService: stage0ServerService,
 *   clientService: stage0ClientService,
 *   monitorService: monitoringService,
 *   pubkeys: gatewayPublicKeys,
 *   gatewayId: 'gateway-001',
 *   loggerOptions: loggerConfig
 * });
 *
 * // Setup router for incoming requests
 * stage0Handler.setupRouter(connectRouter);
 * ```
 *
 * @example
 * Client-side session initiation:
 * ```typescript
 * // Create new session request
 * const newSessionReq = await stage0Handler.NewSessionRequest(sessionId);
 * const newSessionRes = await sendToGateway(targetGateway, newSessionReq);
 *
 * // Send pre-transfer request
 * const preTransferReq = await stage0Handler.PreSATPTransferRequest(
 *   newSessionRes,
 *   sessionId
 * );
 * const preTransferRes = await sendToGateway(targetGateway, preTransferReq);
 * ```
 *
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPHandler} for base handler interface
 * @see {@link Stage0ServerService} for server-side business logic
 * @see {@link Stage0ClientService} for client-side business logic
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { SATPSession } from "../satp-session";
import { Stage0ServerService } from "../stage-services/server/stage0-server-service";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import {
  NewSessionRequest,
  NewSessionResponse,
  PreSATPTransferRequest,
  PreSATPTransferResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { Stage0ClientService } from "../stage-services/client/stage0-client-service";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  PubKeyError,
  SenderGatewayNetworkIdError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import {
  collectSessionAttributes,
  saveMessageInSessionData,
  setError,
} from "../session-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { getMessageTypeName } from "../satp-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

/**
 * SATP Stage 0 Handler for Transfer Initiation and Session Establishment.
 *
 * @description
 * Implements the Stage 0 phase of the IETF SATP Core v2 protocol, managing
 * the critical initial steps of cross-chain asset transfers. This handler
 * orchestrates session establishment, gateway authentication, asset validation,
 * and pre-transfer preparations that lay the foundation for secure and
 * compliant cross-chain operations.
 *
 * **Protocol Stage 0 Responsibilities:**
 * - **Session Establishment**: Creating authenticated transfer sessions between gateways
 * - **Gateway Validation**: Verifying gateway identities using cryptographic public keys
 * - **Asset Profile Validation**: Ensuring asset compatibility and transfer parameters
 * - **Pre-Transfer Setup**: Preparing both sender and receiver assets for transfer
 * - **Security Enforcement**: Implementing SATP security requirements and validations
 *
 * **Server-Side Processing:**
 * - Receives and validates NewSessionRequest messages from client gateways
 * - Authenticates requesting gateways using public key cryptography
 * - Creates new SATPSession instances with validated transfer parameters
 * - Processes PreSATPTransferRequest messages for asset preparation
 * - Performs receiver-side token wrapping and asset setup operations
 * - Generates protocol-compliant response messages with session state
 *
 * **Client-Side Processing:**
 * - Initiates new transfer sessions with target gateway endpoints
 * - Constructs and sends NewSessionRequest messages with transfer details
 * - Processes NewSessionResponse messages and updates local session state
 * - Submits PreSATPTransferRequest messages for asset transfer preparation
 * - Handles PreSATPTransferResponse messages and prepares for Stage 1 operations
 * - Performs sender-side token wrapping and asset validation
 *
 * **Message Flow (Stage 0):**
 * ```
 * Client Gateway                    Server Gateway
 *      |                                 |
 *      |  NewSessionRequest              |
 *      |-------------------------------->|
 *      |                                 | (Validate gateway, create session)
 *      |  NewSessionResponse             |
 *      |<--------------------------------|
 *      |                                 |
 *      |  PreSATPTransferRequest         |
 *      |-------------------------------->|
 *      |                                 | (Validate assets, wrap tokens)
 *      |  PreSATPTransferResponse        |
 *      |<--------------------------------|
 *      |                                 |
 * ```
 *
 * **Error Handling:**
 * - Comprehensive validation of all incoming message parameters
 * - Cryptographic verification of gateway identities and signatures
 * - Asset profile and network compatibility checking
 * - Graceful error responses with detailed diagnostic information
 * - Distributed tracing for cross-gateway error correlation
 *
 * **Performance and Monitoring:**
 * - OpenTelemetry spans for distributed tracing across gateway boundaries
 * - Performance metrics collection for session establishment times
 * - Error rate monitoring and alerting capabilities
 * - Session lifecycle tracking and audit trail generation
 *
 * @class Stage0SATPHandler
 * @implements {SATPHandler}
 *
 * @example
 * Handler initialization and configuration:
 * ```typescript
 * const stage0Options: SATPHandlerOptions = {
 *   sessions: new Map<string, SATPSession>(),
 *   serverService: new Stage0ServerService(serverConfig),
 *   clientService: new Stage0ClientService(clientConfig),
 *   monitorService: new MonitorService(monitorConfig),
 *   pubkeys: gatewayPublicKeyMap,
 *   gatewayId: 'gateway-hermes-001',
 *   loggerOptions: {
 *     level: 'debug',
 *     label: 'Stage0Handler'
 *   }
 * };
 *
 * const handler = new Stage0SATPHandler(stage0Options);
 * ```
 *
 * @example
 * Server-side message processing:
 * ```typescript
 * // Setup Connect router for incoming requests
 * handler.setupRouter(router);
 *
 * // Router automatically handles:
 * // - NewSession requests -> NewSessionImplementation()
 * // - PreSATPTransfer requests -> PreSATPTransferImplementation()
 * ```
 *
 * @example
 * Client-side session initiation workflow:
 * ```typescript
 * // Step 1: Create new session
 * const sessionRequest = await handler.NewSessionRequest(sessionId);
 * const sessionResponse = await sendToTargetGateway(sessionRequest);
 *
 * // Step 2: Initiate pre-transfer
 * const preTransferRequest = await handler.PreSATPTransferRequest(
 *   sessionResponse,
 *   sessionId
 * );
 * const preTransferResponse = await sendToTargetGateway(preTransferRequest);
 *
 * // Session is now ready for Stage 1 operations
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPHandler} for base handler interface and common methods
 * @see {@link Stage0ServerService} for server-side business logic implementation
 * @see {@link Stage0ClientService} for client-side business logic implementation
 * @see {@link SATPSession} for session state management
 */
export class Stage0SATPHandler implements SATPHandler {
  /**
   * Handler type identifier for Stage 0 operations.
   * @static
   * @readonly
   */
  public static readonly CLASS_NAME = SATPHandlerType.STAGE0;

  /**
   * Active SATP transfer sessions managed by this handler.
   * @private
   */
  private sessions: Map<string, SATPSession>;

  /**
   * Server-side service implementation for Stage 0 operations.
   * @private
   */
  private serverService: Stage0ServerService;

  /**
   * Client-side service implementation for Stage 0 operations.
   * @private
   */
  private clientService: Stage0ClientService;

  /**
   * Logger instance for handler operations and debugging.
   * @private
   */
  private logger: Logger;

  /**
   * Public keys of known gateways for authentication and verification.
   * @private
   */
  private pubKeys: Map<string, string>;

  /**
   * Identifier of this gateway instance.
   * @private
   */
  private gatewayId: string;

  /**
   * Monitoring service for metrics collection and distributed tracing.
   * @private
   * @readonly
   */
  private readonly monitorService: MonitorService;
  /**
   * Creates a new Stage 0 SATP handler instance.
   *
   * @description
   * Initializes the Stage 0 handler with all required services, configuration,
   * and dependencies needed for managing SATP transfer initiation and session
   * establishment operations. Sets up logging, monitoring, and service instances
   * for both client and server-side protocol operations.
   *
   * **Initialization Process:**
   * - Configures session management and storage
   * - Sets up server and client service instances
   * - Initializes distributed monitoring and tracing
   * - Configures logger with appropriate context
   * - Stores gateway authentication credentials
   * - Validates all required configuration parameters
   *
   * **Configuration Requirements:**
   * - Valid session storage mechanism
   * - Properly configured Stage 0 server and client services
   * - Active monitoring service for observability
   * - Gateway public keys for authentication
   * - Unique gateway identifier
   * - Logger configuration options
   *
   * @constructor
   * @param {SATPHandlerOptions} ops - Configuration options for the handler
   * @param {Map<string, SATPSession>} ops.sessions - Active session storage
   * @param {Stage0ServerService} ops.serverService - Server-side business logic
   * @param {Stage0ClientService} ops.clientService - Client-side business logic
   * @param {MonitorService} ops.monitorService - Monitoring and tracing service
   * @param {Map<string, string>} ops.pubkeys - Gateway public key registry
   * @param {string} ops.gatewayId - Identifier for this gateway instance
   * @param {LoggerOptions} ops.loggerOptions - Logger configuration
   *
   * @example
   * Complete handler initialization:
   * ```typescript
   * const stage0Handler = new Stage0SATPHandler({
   *   sessions: new Map<string, SATPSession>(),
   *   serverService: new Stage0ServerService({
   *     bridgeManager: bridgeManager,
   *     validators: validationConfig
   *   }),
   *   clientService: new Stage0ClientService({
   *     bridgeManager: bridgeManager,
   *     assetProfiles: assetConfig
   *   }),
   *   monitorService: new MonitorService({
   *     tracing: true,
   *     metrics: true
   *   }),
   *   pubkeys: gatewayKeyRegistry,
   *   gatewayId: 'hermes-gateway-001',
   *   loggerOptions: {
   *     level: 'info',
   *     label: 'Stage0Handler'
   *   }
   * });
   * ```
   *
   * @throws {Error} When required configuration options are missing or invalid
   * @since 2.0.0
   */
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage0ServerService;
    this.clientService = ops.clientService as Stage0ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage0SATPHandler.CLASS_NAME}`);
    this.pubKeys = ops.pubkeys;
    this.gatewayId = ops.gatewayId;
  }
  /**
   * Retrieves the list of active session IDs managed by this handler.
   *
   * @description
   * Returns an array of session identifiers for all active SATP transfer
   * sessions currently being managed by this Stage 0 handler. Used for
   * session monitoring, debugging, and administrative operations.
   *
   * @public
   * @method getHandlerSessions
   * @returns {string[]} Array of active session identifiers
   *
   * @example
   * ```typescript
   * const activeSessions = handler.getHandlerSessions();
   * console.log(`Stage 0 managing ${activeSessions.length} sessions`);
   * ```
   */
  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Returns the handler type identifier for this Stage 0 handler.
   *
   * @description
   * Provides the unique handler type identifier used for handler registration,
   * routing, and identification within the SATP protocol implementation.
   *
   * @public
   * @method getHandlerIdentifier
   * @returns {SATPHandlerType} The Stage 0 handler type identifier
   */
  getHandlerIdentifier(): SATPHandlerType {
    return Stage0SATPHandler.CLASS_NAME;
  }

  /**
   * Returns the SATP protocol stage identifier for this handler.
   *
   * @description
   * Provides the stage identifier as defined in the IETF SATP Core v2
   * specification, used for protocol compliance and message routing.
   *
   * @public
   * @method getStage
   * @returns {string} The SATP Stage 0 identifier
   */
  getStage(): string {
    return Stage.STAGE0;
  }

  /**
   * Provides access to the handler's logger instance.
   *
   * @description
   * Returns the configured logger for this handler, enabling consistent
   * logging across all handler operations with proper context and tracing.
   *
   * @public
   * @readonly
   * @returns {Logger} The handler's logger instance
   */
  public get Log(): Logger {
    return this.logger;
  }

  // ============================================================================
  // SERVER-SIDE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Server-side implementation for processing new session requests.
   *
   * @description
   * Processes incoming NewSessionRequest messages from client gateways to
   * establish new SATP transfer sessions. This method implements the server-side
   * logic for session creation, gateway authentication, and initial transfer
   * validation according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Request Validation**: Validates message structure and required fields
   * 2. **Gateway Authentication**: Verifies client gateway identity and credentials
   * 3. **Session Creation**: Creates new SATPSession with validated parameters
   * 4. **Response Generation**: Constructs protocol-compliant response message
   * 5. **Monitoring**: Records performance metrics and distributed tracing
   *
   * **Authentication Process:**
   * - Validates gateway ID is present and non-empty
   * - Verifies gateway public key exists in trusted registry
   * - Performs cryptographic signature verification
   * - Ensures gateway is authorized for cross-chain operations
   *
   * **Session Management:**
   * - Creates new SATPSession instance with validated parameters
   * - Stores session in handler's session registry
   * - Saves request and response messages for audit trail
   * - Initializes session timestamps for performance tracking
   *
   * **Error Handling:**
   * - Comprehensive validation of all message parameters
   * - Detailed error responses with diagnostic information
   * - Distributed tracing for cross-gateway error correlation
   * - Session cleanup on processing failures
   *
   * @private
   * @async
   * @method NewSessionImplementation
   * @param {NewSessionRequest} req - The incoming new session request
   * @returns {Promise<NewSessionResponse>} Promise resolving to the session response
   * @throws {SenderGatewayNetworkIdError} When gateway ID is missing or invalid
   * @throws {PubKeyError} When gateway public key is not found
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Request processing flow:
   * ```
   * NewSessionRequest -> Validate Gateway -> Create Session -> NewSessionResponse
   * ```
   *
   * @since 2.0.0
   * @see {@link Stage0ServerService} for business logic implementation
   * @see {@link NewSessionRequest} for request message structure
   * @see {@link NewSessionResponse} for response message structure
   */
  private async NewSessionImplementation(
    req: NewSessionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<NewSessionResponse> {
    const stepTag = `NewSessionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, New Session...`);
        this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

        session = this.sessions.get(req.sessionId);

        if (req.gatewayId == "") {
          throw new SenderGatewayNetworkIdError(fnTag);
        }

        if (!this.pubKeys.has(req.gatewayId)) {
          throw new PubKeyError(fnTag);
        }

        session = await this.serverService.checkNewSessionRequest(
          req,
          session,
          this.pubKeys.get(req.gatewayId)!,
        );

        this.sessions.set(session.getSessionId(), session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.newSessionResponse(
          req,
          session,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
          );
        }

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        saveMessageInSessionData(session.getServerSessionData(), message);

        const attributes: Record<
          string,
          | undefined
          | string
          | number
          | boolean
          | string[]
          | number[]
          | boolean[]
        > = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage0
            ?.newSessionRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage0
            ?.newSessionResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 0, operation: "newSession" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.NEW_SESSION_RESPONSE),
            error,
          )}`,
        );
        setError(session, MessageType.NEW_SESSION_RESPONSE, error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.newSessionErrorResponse(error);
      } finally {
        span.end();
      }
    });
  }

  /**
   * Server-side implementation for processing pre-SATP transfer requests.
   *
   * @description
   * Processes incoming PreSATPTransferRequest messages from client gateways
   * to prepare for cross-chain asset transfers. This method implements the
   * server-side logic for asset validation, token wrapping, and transfer
   * preparation according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Request Validation**: Validates message structure and transfer parameters
   * 3. **Asset Preparation**: Performs receiver-side token wrapping operations
   * 4. **Response Generation**: Constructs protocol-compliant response message
   * 5. **Monitoring**: Records performance metrics and operation duration
   *
   * **Asset Processing:**
   * - Validates receiver asset configuration and network compatibility
   * - Performs receiver-side token wrapping for cross-chain operations
   * - Generates cryptographic proofs and assertions for asset state
   * - Prepares asset metadata for subsequent transfer stages
   *
   * **Session Management:**
   * - Retrieves existing session using session ID from request
   * - Updates session state with transfer preparation information
   * - Saves request and response messages for audit trail
   * - Records processing timestamps for performance analysis
   *
   * **Token Wrapping:**
   * - Prepares receiver-side wrapper contracts for incoming assets
   * - Validates asset compatibility with target network
   * - Generates necessary cryptographic commitments
   * - Ensures proper asset representation for cross-chain operations
   *
   * **Error Handling:**
   * - Validates session existence and accessibility
   * - Comprehensive validation of transfer parameters
   * - Detailed error responses with diagnostic information
   * - Distributed tracing for error correlation and debugging
   *
   * @private
   * @async
   * @method PreSATPTransferImplementation
   * @param {PreSATPTransferRequest} req - The incoming pre-transfer request
   * @returns {Promise<PreSATPTransferResponse>} Promise resolving to the pre-transfer response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Request processing flow:
   * ```
   * PreSATPTransferRequest -> Validate Session -> Wrap Tokens -> PreSATPTransferResponse
   * ```
   *
   * @since 2.0.0
   * @see {@link Stage0ServerService} for business logic implementation
   * @see {@link PreSATPTransferRequest} for request message structure
   * @see {@link PreSATPTransferResponse} for response message structure
   */
  private async PreSATPTransferImplementation(
    req: PreSATPTransferRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<PreSATPTransferResponse> {
    const stepTag = `PreSATPTransferImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, PreSATPTransfer...`);
        this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

        session = this.sessions.get(req.sessionId);

        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkPreSATPTransferRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        await this.serverService.wrapToken(session);

        const message = await this.serverService.preSATPTransferResponse(
          req,
          session,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
          );
        }

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        saveMessageInSessionData(session.getServerSessionData(), message);

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage0
            ?.preSatpTransferRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage0
            ?.preSatpTransferResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 0, operation: "preSATPTransfer" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.PRE_SATP_TRANSFER_RESPONSE),
            error,
          )}`,
        );
        setError(session, MessageType.PRE_SATP_TRANSFER_RESPONSE, error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.preSATPTransferErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Configures the Connect RPC router with Stage 0 service endpoints.
   *
   * @description
   * Sets up the Connect RPC router to handle incoming Stage 0 SATP protocol
   * messages by registering the appropriate service methods. This enables
   * the handler to receive and process NewSession and PreSATPTransfer requests
   * from client gateways according to the IETF SATP Core v2 specification.
   *
   * **Registered Service Methods:**
   * - **newSession**: Handles NewSessionRequest messages for session establishment
   * - **preSATPTransfer**: Handles PreSATPTransferRequest messages for transfer preparation
   *
   * **Router Configuration:**
   * - Registers SatpStage0Service with Connect RPC framework
   * - Maps service methods to internal implementation functions
   * - Enables distributed tracing for all incoming requests
   * - Provides error handling and exception reporting
   *
   * **Distributed Tracing:**
   * - Creates OpenTelemetry spans for router setup operations
   * - Enables request correlation across gateway boundaries
   * - Provides comprehensive error tracking and diagnostics
   *
   * @public
   * @method setupRouter
   * @param {ConnectRouter} router - The Connect RPC router to configure
   * @returns {void}
   *
   * @example
   * Router setup in gateway initialization:
   * ```typescript
   * import { createConnectRouter } from '@connectrpc/connect';
   *
   * const router = createConnectRouter();
   * const stage0Handler = new Stage0SATPHandler(handlerOptions);
   *
   * // Register Stage 0 service endpoints
   * stage0Handler.setupRouter(router);
   *
   * // Router is now ready to handle:
   * // - NewSessionRequest -> newSession()
   * // - PreSATPTransferRequest -> preSATPTransfer()
   * ```
   *
   * @throws {Error} When router configuration fails or service registration errors occur
   * @since 2.0.0
   * @see {@link SatpStage0Service} for service definition
   * @see {@link ConnectRouter} for router interface
   */
  setupRouter(router: ConnectRouter): void {
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage0Service, {
          async newSession(req): Promise<NewSessionResponse> {
            return await that.NewSessionImplementation(req);
          },
          async preSATPTransfer(req): Promise<PreSATPTransferResponse> {
            return await that.PreSATPTransferImplementation(req);
          },
        });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // ============================================================================
  // CLIENT-SIDE METHODS
  // ============================================================================

  /**
   * Creates a new session request message for initiating cross-chain transfers.
   *
   * @description
   * Generates a NewSessionRequest message as part of the SATP Stage 0 protocol
   * to initiate a new cross-chain asset transfer session with a target gateway.
   * This method represents the first step in the client-side SATP workflow,
   * where the sending gateway requests to establish a new transfer session
   * with the receiving gateway.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> NewSessionRequest -> Server Gateway
   * ```
   *
   * **Request Generation Process:**
   * - Retrieves existing session from local session storage
   * - Validates session state and transfer parameters
   * - Constructs protocol-compliant NewSessionRequest message
   * - Includes gateway identification and authentication information
   * - Adds session metadata and transfer context
   * - Saves request message in client session data for audit trail
   *
   * **Message Contents:**
   * - Session identifier for request correlation
   * - Sender gateway identity and authentication credentials
   * - Asset profile information and transfer parameters
   * - Digital signatures for message integrity
   * - Timestamps for protocol compliance
   *
   * **Error Handling:**
   * - Validates session existence and state
   * - Ensures message creation succeeds
   * - Provides detailed error context for debugging
   * - Updates session with error information on failures
   *
   * @public
   * @async
   * @method NewSessionRequest
   * @param {string} sessionId - Unique identifier for the transfer session
   * @returns {Promise<NewSessionRequest>} Promise resolving to the new session request message
   * @throws {SessionNotFoundError} When the specified session doesn't exist
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Client-side session initiation:
   * ```typescript
   * // Create a new transfer session
   * const sessionId = 'satp-session-' + generateUUID();
   * const session = new SATPSession(sessionId, transferConfig);
   * handler.sessions.set(sessionId, session);
   *
   * try {
   *   // Generate new session request
   *   const request = await handler.NewSessionRequest(sessionId);
   *
   *   // Send to target gateway
   *   const response = await sendToGateway(targetGatewayUrl, request);
   *
   *   // Process response in next step
   *   await processNewSessionResponse(response);
   * } catch (error) {
   *   console.error('Session initiation failed:', error);
   * }
   * ```
   *
   * @example
   * Integration with gateway client:
   * ```typescript
   * class GatewayClient {
   *   async initiateTransfer(transferParams: TransferParams) {
   *     const sessionId = this.createSession(transferParams);
   *
   *     // Step 1: Create new session
   *     const newSessionReq = await this.stage0Handler.NewSessionRequest(sessionId);
   *     const newSessionRes = await this.sendRequest(newSessionReq);
   *
   *     // Continue with pre-transfer...
   *     return this.continueWithPreTransfer(newSessionRes, sessionId);
   *   }
   * }
   * ```
   *
   * @since 2.0.0
   * @see {@link NewSessionRequest} for message structure
   * @see {@link Stage0ClientService} for business logic implementation
   * @see {@link SATPSession} for session management
   */
  public async NewSessionRequest(
    sessionId: string,
  ): Promise<NewSessionRequest> {
    const stepTag = `NewSessionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, New Session Request...`);

          session = this.sessions.get(sessionId);

          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          const message = await this.clientService.newSessionRequest(
            session,
            this.gatewayId,
          );

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.NEW_SESSION_REQUEST, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.NEW_SESSION_REQUEST),
            error,
          );
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

  /**
   * Creates a pre-SATP transfer request message for asset transfer preparation.
   *
   * @description
   * Generates a PreSATPTransferRequest message as the second step in the SATP
   * Stage 0 protocol workflow. This method processes the NewSessionResponse
   * from the server gateway and initiates the pre-transfer phase, which includes
   * asset validation, token wrapping, and transfer parameter finalization.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> PreSATPTransferRequest -> Server Gateway
   * (Following NewSessionResponse from server)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the incoming NewSessionResponse
   * - Updates local session state with server-provided information
   * - Handles potential session ID changes during negotiation
   * - Performs client-side token wrapping operations
   * - Constructs protocol-compliant PreSATPTransferRequest message
   * - Saves all messages in session data for audit trail
   *
   * **Asset Preparation:**
   * - Validates sender asset configuration and availability
   * - Performs token wrapping operations for cross-chain compatibility
   * - Generates cryptographic proofs and assertions
   * - Prepares asset metadata for cross-chain transfer
   *
   * **Session Management:**
   * - Updates session storage if session ID changes during negotiation
   * - Maintains session consistency across client and server gateways
   * - Preserves transfer context and state information
   *
   * @public
   * @async
   * @method PreSATPTransferRequest
   * @param {NewSessionResponse} response - Response from the new session request
   * @param {string} sessionId - Current session identifier
   * @returns {Promise<PreSATPTransferRequest>} Promise resolving to the pre-transfer request message
   * @throws {SessionNotFoundError} When the specified session doesn't exist
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Complete Stage 0 client workflow:
   * ```typescript
   * // Step 1: Initiate new session
   * const newSessionReq = await handler.NewSessionRequest(sessionId);
   * const newSessionRes = await sendToGateway(targetGateway, newSessionReq);
   *
   * // Step 2: Initiate pre-transfer
   * try {
   *   const preTransferReq = await handler.PreSATPTransferRequest(
   *     newSessionRes,
   *     sessionId
   *   );
   *
   *   const preTransferRes = await sendToGateway(targetGateway, preTransferReq);
   *
   *   console.log('Stage 0 completed successfully');
   *   // Ready for Stage 1 operations
   * } catch (error) {
   *   console.error('Pre-transfer preparation failed:', error);
   * }
   * ```
   *
   * @example
   * Session ID handling during negotiation:
   * ```typescript
   * const originalSessionId = 'client-session-123';
   * const preTransferReq = await handler.PreSATPTransferRequest(
   *   newSessionResponse,
   *   originalSessionId
   * );
   *
   * // Check if session ID changed during negotiation
   * const currentSession = handler.sessions.get(originalSessionId);
   * if (!currentSession) {
   *   // Session ID was updated during processing
   *   const newSessionId = newSessionResponse.sessionId;
   *   console.log(`Session ID updated: ${originalSessionId} -> ${newSessionId}`);
   * }
   * ```
   *
   * @since 2.0.0
   * @see {@link PreSATPTransferRequest} for message structure
   * @see {@link NewSessionResponse} for input message structure
   * @see {@link Stage0ClientService} for business logic implementation
   */
  public async PreSATPTransferRequest(
    response: NewSessionResponse,
    sessionId: string,
  ): Promise<PreSATPTransferRequest> {
    const stepTag = `PreSATPTransferRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Pre SATP Transfer Request...`);

          session = this.sessions.get(sessionId);

          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          const newSession = await this.clientService.checkNewSessionResponse(
            response,
            session,
            Array.from(this.sessions.keys()),
          );

          if (newSession.getSessionId() != session.getSessionId()) {
            this.sessions.set(newSession.getSessionId(), newSession);
            this.sessions.delete(session.getSessionId());
          }

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.wrapToken(session);

          const message =
            await this.clientService.preSATPTransferRequest(session);

          if (!message) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), message);

          return message;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.PRE_SATP_TRANSFER_REQUEST, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.PRE_SATP_TRANSFER_REQUEST),
            error,
          );
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
