/**
 * @fileoverview
 * SATP Stage 2 Handler for Lock Assertion and Asset Locking Operations.
 *
 * @description
 * This module implements the Stage 2 handler of the IETF SATP Core v2 protocol,
 * responsible for managing the lock assertion phase of cross-chain asset transfers.
 * Stage 2 establishes cryptographic proofs of asset locking on the source network,
 * providing the necessary evidence and assertions required for secure cross-chain
 * asset movement and atomic transfer operations.
 *
 * **Stage 2 Protocol Flow:**
 * 1. **Lock Assertion Request/Response**: Client provides proof of asset locking on source network
 *
 * **Key Responsibilities:**
 * - **Asset Locking**: Coordinating and validating asset lock operations on source networks
 * - **Lock Evidence**: Generating and validating cryptographic proofs of asset locks
 * - **Assertion Management**: Processing lock assertion claims and generating receipts
 * - **Security Validation**: Ensuring lock operations meet SATP security requirements
 * - **State Transitions**: Managing session state progression through lock phases
 *
 * **Server-Side Operations:**
 * - Validates incoming lock assertion requests from client gateways
 * - Verifies cryptographic proofs and lock evidence provided by clients
 * - Generates lock assertion receipts confirming lock validation
 * - Updates session state with lock information and progress tracking
 * - Handles error conditions and provides diagnostic feedback
 *
 * **Client-Side Operations:**
 * - Performs actual asset locking operations on source blockchain networks
 * - Generates cryptographic proofs and lock assertion claims
 * - Submits lock assertion requests with evidence to server gateways
 * - Processes server responses and manages session state transitions
 * - Handles lock operation failures and error recovery
 *
 * **Cryptographic Assertions:**
 * - Generates tamper-proof evidence of asset lock operations
 * - Includes transaction hashes, block confirmations, and timestamps
 * - Provides cryptographic signatures and merkle proofs where applicable
 * - Ensures non-repudiation and verifiability of lock operations
 *
 * **Error Handling and Recovery:**
 * - Comprehensive validation of lock proofs and assertion claims
 * - Automatic transaction counter adjustments on failures
 * - Detailed error responses with diagnostic information
 * - Support for lock operation retry and recovery mechanisms
 *
 * @example
 * Server-side stage 2 handler setup:
 * ```typescript
 * const stage2Handler = new Stage2SATPHandler({
 *   sessions: sessionMap,
 *   serverService: stage2ServerService,
 *   clientService: stage2ClientService,
 *   monitorService: monitoringService,
 *   loggerOptions: loggerConfig
 * });
 *
 * // Setup router for incoming requests
 * stage2Handler.setupRouter(connectRouter);
 * ```
 *
 * @example
 * Client-side lock assertion workflow:
 * ```typescript
 * // Perform asset locking and create assertion
 * const lockAssertionReq = await stage2Handler.LockAssertionRequest(
 *   transferCommenceResponse
 * );
 * const lockAssertionRes = await sendToGateway(targetGateway, lockAssertionReq);
 *
 * // Lock assertion validated, ready for Stage 3
 * console.log('Asset locked and assertion validated');
 * ```
 *
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPHandler} for base handler interface
 * @see {@link Stage2ServerService} for server-side business logic
 * @see {@link Stage2ClientService} for client-side business logic
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { Stage2ServerService } from "../stage-services/server/stage2-server-service";
import { SATPSession } from "../satp-session";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import {
  LockAssertionResponse,
  LockAssertionRequest,
} from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { Stage2ClientService } from "../stage-services/client/stage2-client-service";
import { TransferCommenceResponse } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId } from "./handler-utils";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  collectSessionAttributes,
  saveMessageInSessionData,
  setError,
} from "../session-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
/**
 * SATP Stage 2 Handler for Lock Assertion and Asset Locking Operations.
 *
 * @description
 * Implements the Stage 2 phase of the IETF SATP Core v2 protocol, managing
 * the critical asset locking and lock assertion operations that provide
 * cryptographic proof of asset immobilization on source networks. This handler
 * coordinates between client and server gateways to establish verifiable
 * evidence of asset locks required for secure cross-chain transfers.
 *
 * **Protocol Stage 2 Responsibilities:**
 * - **Asset Lock Coordination**: Managing asset locking operations on source networks
 * - **Lock Evidence Generation**: Creating cryptographic proofs of successful locks
 * - **Assertion Validation**: Verifying lock assertion claims and evidence
 * - **Security Enforcement**: Ensuring lock operations meet SATP security standards
 * - **State Management**: Tracking session progression through lock phases
 *
 * **Server-Side Processing:**
 * - Receives and validates LockAssertionRequest messages from client gateways
 * - Verifies cryptographic proofs and lock evidence provided in assertions
 * - Validates lock transaction details, confirmations, and timestamps
 * - Generates LockAssertionResponse messages (receipts) confirming validation
 * - Updates session state with validated lock information
 * - Records performance metrics and operation timing
 *
 * **Client-Side Processing:**
 * - Performs actual asset locking operations on source blockchain networks
 * - Generates comprehensive lock assertion claims with cryptographic evidence
 * - Constructs LockAssertionRequest messages with proof data
 * - Submits lock assertions to server gateways for validation
 * - Processes server responses and manages session state transitions
 * - Handles lock operation failures and implements retry mechanisms
 *
 * **Message Flow (Stage 2):**
 * ```
 * Client Gateway                    Server Gateway
 *      |                                 |
 *      | (Perform asset lock)            |
 *      |                                 |
 *      |  LockAssertionRequest           |
 *      |-------------------------------->|
 *      |                                 | (Validate lock proof)
 *      |  LockAssertionResponse          |
 *      |<--------------------------------|
 *      |                                 |
 * ```
 *
 * **Lock Assertion Components:**
 * - **Transaction Hash**: Unique identifier of the lock transaction
 * - **Block Confirmation**: Number of blockchain confirmations received
 * - **Timestamp**: Precise timing of lock operation execution
 * - **Cryptographic Proof**: Digital signatures and merkle proofs
 * - **Asset Details**: Specific information about locked assets
 *
 * **Validation Process:**
 * - Verifies transaction existence and validity on source network
 * - Confirms sufficient block confirmations for security requirements
 * - Validates cryptographic signatures and proof integrity
 * - Ensures lock amounts and asset details match transfer parameters
 * - Checks compliance with SATP security and timing requirements
 *
 * **Error Handling and Monitoring:**
 * - Comprehensive validation of lock proofs and assertion data
 * - Automatic transaction counter adjustments on validation failures
 * - Detailed error responses with specific validation failure reasons
 * - Distributed tracing for cross-gateway lock operation correlation
 * - Performance monitoring for lock validation and processing times
 *
 * @class Stage2SATPHandler
 * @implements {SATPHandler}
 *
 * @example
 * Handler initialization for lock operations:
 * ```typescript
 * const stage2Options: SATPHandlerOptions = {
 *   sessions: new Map<string, SATPSession>(),
 *   serverService: new Stage2ServerService({
 *     validators: lockValidators,
 *     proofVerifiers: cryptoVerifiers
 *   }),
 *   clientService: new Stage2ClientService({
 *     lockManagers: assetLockManagers,
 *     proofGenerators: cryptoProofGenerators
 *   }),
 *   monitorService: new MonitorService({
 *     tracing: true,
 *     metrics: ['lock_operations', 'validation_times']
 *   }),
 *   loggerOptions: {
 *     level: 'debug',
 *     label: 'Stage2Handler'
 *   }
 * };
 *
 * const handler = new Stage2SATPHandler(stage2Options);
 * ```
 *
 * @example
 * Complete Stage 2 client workflow:
 * ```typescript
 * // Following Stage 1 completion
 * const transferCommenceResponse = await stage1Handler.TransferCommenceRequest(
 *   transferProposalResponse
 * );
 *
 * // Perform asset lock and create assertion
 * try {
 *   const lockAssertionReq = await stage2Handler.LockAssertionRequest(
 *     transferCommenceResponse
 *   );
 *
 *   const lockAssertionRes = await sendToTargetGateway(lockAssertionReq);
 *
 *   console.log('Asset locked and validated, proceeding to Stage 3');
 * } catch (error) {
 *   console.error('Asset lock assertion failed:', error);
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPHandler} for base handler interface and common methods
 * @see {@link Stage2ServerService} for server-side business logic implementation
 * @see {@link Stage2ClientService} for client-side business logic implementation
 * @see {@link LockAssertionRequest} for lock assertion message structure
 */
export class Stage2SATPHandler implements SATPHandler {
  /**
   * Handler type identifier for Stage 2 operations.
   * @static
   * @readonly
   */
  public static readonly CLASS_NAME = SATPHandlerType.STAGE2;

  /**
   * Active SATP transfer sessions managed by this handler.
   * @private
   */
  private sessions: Map<string, SATPSession>;

  /**
   * Server-side service implementation for Stage 2 operations.
   * @private
   */
  private serverService: Stage2ServerService;

  /**
   * Client-side service implementation for Stage 2 operations.
   * @private
   */
  private clientService: Stage2ClientService;

  /**
   * Logger instance for handler operations and debugging.
   * @private
   */
  private logger: Logger;

  /**
   * Monitoring service for metrics collection and distributed tracing.
   * @private
   * @readonly
   */
  private readonly monitorService: MonitorService;

  /**
   * Creates a new Stage 2 SATP handler instance.
   *
   * @description
   * Initializes the Stage 2 handler with all required services and dependencies
   * needed for managing SATP lock assertion and asset locking operations.
   * Sets up logging, monitoring, and service instances for both client and
   * server-side protocol operations with comprehensive lock validation capabilities.
   *
   * **Initialization Process:**
   * - Configures session management and storage for lock state tracking
   * - Sets up server and client service instances with lock operation capabilities
   * - Initializes distributed monitoring and tracing for lock operations
   * - Configures logger with appropriate Stage 2 context and debugging
   * - Validates all required configuration parameters and dependencies
   *
   * **Configuration Requirements:**
   * - Valid session storage mechanism for lock state management
   * - Properly configured Stage 2 server service with lock validators
   * - Client service with asset lock managers and proof generators
   * - Active monitoring service for lock operation observability
   * - Logger configuration for debugging and audit trails
   *
   * **Service Integration:**
   * - Server service provides lock assertion validation and receipt generation
   * - Client service handles asset locking and proof generation
   * - Monitor service tracks lock operation performance and errors
   * - Logger provides comprehensive debugging and audit capabilities
   *
   * @constructor
   * @param {SATPHandlerOptions} ops - Configuration options for the handler
   * @param {Map<string, SATPSession>} ops.sessions - Active session storage
   * @param {Stage2ServerService} ops.serverService - Server-side business logic
   * @param {Stage2ClientService} ops.clientService - Client-side business logic
   * @param {MonitorService} ops.monitorService - Monitoring and tracing service
   * @param {LoggerOptions} ops.loggerOptions - Logger configuration
   *
   * @example
   * Complete handler initialization with lock services:
   * ```typescript
   * const stage2Handler = new Stage2SATPHandler({
   *   sessions: new Map<string, SATPSession>(),
   *   serverService: new Stage2ServerService({
   *     lockValidators: {
   *       ethereum: new EthereumLockValidator(),
   *       fabric: new FabricLockValidator()
   *     },
   *     proofVerifiers: cryptographicVerifiers
   *   }),
   *   clientService: new Stage2ClientService({
   *     lockManagers: {
   *       ethereum: new EthereumLockManager(),
   *       fabric: new FabricLockManager()
   *     },
   *     proofGenerators: cryptographicGenerators
   *   }),
   *   monitorService: new MonitorService({
   *     tracing: true,
   *     metrics: ['lock_duration', 'validation_time'],
   *     counters: ['successful_locks', 'failed_locks']
   *   }),
   *   loggerOptions: {
   *     level: 'info',
   *     label: 'Stage2Handler'
   *   }
   * });
   * ```
   *
   * @throws {Error} When required configuration options are missing or invalid
   * @since 2.0.0
   */
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage2ServerService;
    this.clientService = ops.clientService as Stage2ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage2SATPHandler.CLASS_NAME}`);
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

  /**
   * Returns the handler type identifier for this Stage 2 handler.
   *
   * @description
   * Provides the unique handler type identifier used for handler registration,
   * routing, and identification within the SATP protocol implementation.
   *
   * @public
   * @method getHandlerIdentifier
   * @returns {SATPHandlerType} The Stage 2 handler type identifier
   */
  getHandlerIdentifier(): SATPHandlerType {
    return Stage2SATPHandler.CLASS_NAME;
  }

  /**
   * Retrieves the list of active session IDs managed by this handler.
   *
   * @description
   * Returns an array of session identifiers for all active SATP transfer
   * sessions currently being managed by this Stage 2 handler. Used for
   * session monitoring, debugging, and administrative operations.
   *
   * @public
   * @method getHandlerSessions
   * @returns {string[]} Array of active session identifiers
   */
  getHandlerSessions(): string[] {
    return Array.from(this.sessions.keys());
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
   * @returns {string} The SATP Stage 2 identifier
   */
  getStage(): string {
    return Stage.STAGE2;
  }

  // ============================================================================
  // SERVER-SIDE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Server-side implementation for processing lock assertion requests.
   *
   * @description
   * Processes incoming LockAssertionRequest messages from client gateways
   * to validate cryptographic proofs of asset locking operations. This method
   * implements the server-side logic for lock assertion validation, proof
   * verification, and receipt generation according to the IETF SATP Core v2
   * specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Request Validation**: Validates lock assertion structure and completeness
   * 3. **Proof Verification**: Verifies cryptographic proofs and lock evidence
   * 4. **Receipt Generation**: Creates protocol-compliant assertion receipt
   * 5. **Monitoring**: Records performance metrics and operation duration
   *
   * **Lock Assertion Validation:**
   * - Verifies transaction hash existence and validity on source network
   * - Confirms sufficient block confirmations for security requirements
   * - Validates cryptographic signatures and proof integrity
   * - Ensures lock amounts match transfer parameters exactly
   * - Checks timing requirements and deadline compliance
   *
   * **Cryptographic Verification:**
   * - Validates digital signatures using known public keys
   * - Verifies merkle proofs and transaction inclusion proofs
   * - Confirms hash chain integrity and tamper evidence
   * - Ensures non-repudiation and authenticity of lock operations
   *
   * **Error Handling:**
   * - Comprehensive validation of lock proofs and assertion data
   * - Automatic transaction counter adjustments on validation failures
   * - Detailed error responses with specific validation failure reasons
   * - Session state cleanup and error recording for audit trails
   *
   * **Performance Monitoring:**
   * - Records lock assertion validation duration and success rates
   * - Tracks network-specific and asset-specific validation metrics
   * - Provides real-time monitoring of lock validation processes
   * - Enables performance analysis and optimization opportunities
   *
   * @private
   * @async
   * @method LockAssertionImplementation
   * @param {LockAssertionRequest} req - The incoming lock assertion request
   * @returns {Promise<LockAssertionResponse>} Promise resolving to the assertion receipt
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When receipt message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Lock assertion validation flow:
   * ```
   * LockAssertionRequest -> Validate Session -> Verify Proofs -> Generate Receipt
   *                                                    |
   *                                           [Check transaction hash]
   *                                           [Verify confirmations]
   *                                           [Validate signatures]
   * ```
   *
   * @since 2.0.0
   * @see {@link Stage2ServerService} for business logic implementation
   * @see {@link LockAssertionRequest} for request message structure
   * @see {@link LockAssertionResponse} for response message structure
   */
  async LockAssertionImplementation(
    req: LockAssertionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<LockAssertionResponse> {
    const stepTag = `LockAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Lock Assertion...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkLockAssertionRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.lockAssertionResponse(
          req,
          session,
        );

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.ASSERTION_RECEIPT),
          );
        }

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage2
            ?.lockAssertionRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage2
            ?.lockAssertionReceiptMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, operation: "lockAssertion", satp_phase: 2 },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.ASSERTION_RECEIPT),
            error,
          )}`,
        );
        setError(session, MessageType.ASSERTION_RECEIPT, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 2;

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.lockAssertionErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Configures the Connect RPC router with Stage 2 service endpoints.
   *
   * @description
   * Sets up the Connect RPC router to handle incoming Stage 2 SATP protocol
   * messages by registering the appropriate service methods. This enables
   * the handler to receive and process LockAssertion requests from client
   * gateways according to the IETF SATP Core v2 specification.
   *
   * **Registered Service Methods:**
   * - **lockAssertion**: Handles LockAssertionRequest messages for lock proof validation
   *
   * **Router Configuration:**
   * - Registers SatpStage2Service with Connect RPC framework
   * - Maps service methods to internal implementation functions
   * - Enables distributed tracing for all incoming lock assertion requests
   * - Provides comprehensive error handling and exception reporting
   *
   * **Distributed Tracing:**
   * - Creates OpenTelemetry spans for router setup operations
   * - Enables request correlation across gateway boundaries
   * - Provides detailed error tracking and performance diagnostics
   * - Facilitates debugging of lock validation processes
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
   * const stage2Handler = new Stage2SATPHandler(handlerOptions);
   *
   * // Register Stage 2 service endpoints
   * stage2Handler.setupRouter(router);
   *
   * // Router is now ready to handle:
   * // - LockAssertionRequest -> lockAssertion()
   * ```
   *
   * @throws {Error} When router configuration fails or service registration errors occur
   * @since 2.0.0
   * @see {@link SatpStage2Service} for service definition
   * @see {@link ConnectRouter} for router interface
   */
  setupRouter(router: ConnectRouter): void {
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage2Service, {
          async lockAssertion(req): Promise<LockAssertionResponse> {
            return await that.LockAssertionImplementation(req);
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
   * Creates a lock assertion request message with cryptographic proof of asset locking.
   *
   * @description
   * Generates a LockAssertionRequest message as part of the SATP Stage 2 protocol
   * to provide cryptographic proof of successful asset locking operations on the
   * source blockchain network. This method processes the TransferCommenceResponse
   * from Stage 1, performs the actual asset locking operation, and constructs
   * a comprehensive lock assertion with verifiable evidence.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> LockAssertionRequest -> Server Gateway
   * (Following TransferCommenceResponse from Stage 1)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the TransferCommenceResponse from Stage 1
   * - Updates session state with transfer commence information
   * - Performs actual asset locking operation on source blockchain
   * - Generates cryptographic proofs and lock evidence
   * - Constructs protocol-compliant LockAssertionRequest message
   * - Saves request message in session data for audit trail
   *
   * **Asset Locking Operations:**
   * - Executes smart contract calls to lock specified assets
   * - Waits for sufficient blockchain confirmations
   * - Captures transaction hashes and block information
   * - Generates cryptographic signatures and proofs
   * - Validates lock operation success and completeness
   *
   * **Cryptographic Evidence Generation:**
   * - Creates tamper-proof transaction hash records
   * - Generates merkle proofs for transaction inclusion
   * - Produces digital signatures for non-repudiation
   * - Captures precise timing and block confirmation data
   * - Ensures all evidence meets SATP security requirements
   *
   * **Error Handling and Recovery:**
   * - Comprehensive validation of lock operation results
   * - Automatic transaction counter adjustments on failures
   * - Detailed error context for debugging and troubleshooting
   * - Support for lock operation retry mechanisms
   * - Session state consistency maintenance on errors
   *
   * @public
   * @async
   * @method LockAssertionRequest
   * @param {TransferCommenceResponse} response - Response from Stage 1 transfer commence
   * @returns {Promise<LockAssertionRequest>} Promise resolving to the lock assertion request
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Complete Stage 2 client workflow:
   * ```typescript
   * // Following Stage 1 completion
   * const transferCommenceRes = await stage1Handler.TransferCommenceRequest(
   *   transferProposalResponse
   * );
   *
   * try {
   *   // Perform asset lock and create assertion
   *   const lockAssertionReq = await stage2Handler.LockAssertionRequest(
   *     transferCommenceRes
   *   );
   *
   *   // Send lock assertion to server gateway
   *   const lockAssertionRes = await sendToGateway(
   *     targetGatewayUrl,
   *     lockAssertionReq
   *   );
   *
   *   console.log('Asset locked and assertion validated');
   *   // Ready for Stage 3 operations
   * } catch (error) {
   *   console.error('Asset lock assertion failed:', error);
   * }
   * ```
   *
   * @example
   * Lock assertion with error handling:
   * ```typescript
   * try {
   *   const lockAssertionReq = await handler.LockAssertionRequest(commenceRes);
   *   return lockAssertionReq;
   * } catch (error) {
   *   if (error instanceof FailedToProcessError) {
   *     // Transaction counters automatically adjusted
   *     console.error('Lock operation failed:', {
   *       sessionId: commenceRes.sessionId,
   *       reason: error.message,
   *       retryable: error.retryable
   *     });
   *   }
   *   throw error;
   * }
   * ```
   *
   * @since 2.0.0
   * @see {@link LockAssertionRequest} for message structure
   * @see {@link TransferCommenceResponse} for input message structure
   * @see {@link Stage2ClientService} for business logic implementation
   */
  async LockAssertionRequest(
    response: TransferCommenceResponse,
  ): Promise<LockAssertionRequest> {
    const stepTag = `LockAssertionRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Lock Assertion Request Message...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkTransferCommenceResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.lockAsset(session);

          const request = await this.clientService.lockAssertionRequest(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.LOCK_ASSERT),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.LOCK_ASSERT),
              error,
            )}`,
          );
          setError(session, MessageType.LOCK_ASSERT, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 2;

          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );

          this.monitorService.updateCounter(
            "failed_transactions",
            1,
            attributes,
          );
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.LOCK_ASSERT),
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
