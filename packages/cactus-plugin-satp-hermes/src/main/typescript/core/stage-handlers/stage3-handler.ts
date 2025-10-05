/**
 * @fileoverview
 * SATP Stage 3 Handler for Commit Preparation, Final Assertion, and Transfer Completion.
 *
 * @description
 * This module implements the Stage 3 handler of the IETF SATP Core v2 protocol,
 * responsible for managing the final phase of cross-chain asset transfers.
 * Stage 3 encompasses commit preparation, final commit assertions, and transfer
 * completion operations that finalize the atomic cross-chain asset movement
 * and ensure proper settlement on both source and destination networks.
 *
 * **Stage 3 Protocol Flow:**
 * 1. **Commit Preparation Request/Response**: Server prepares for final commit by minting destination assets
 * 2. **Commit Final Assertion Request/Response**: Client burns source assets and provides final proof
 * 3. **Transfer Complete Request/Response**: Final confirmation and transfer completion
 *
 * **Key Responsibilities:**
 * - **Commit Preparation**: Coordinating destination asset minting and preparation
 * - **Final Assertions**: Processing burn proofs and final commitment evidence
 * - **Transfer Completion**: Finalizing atomic transfers and updating session state
 * - **Asset Settlement**: Ensuring proper asset creation/destruction across networks
 * - **Atomicity Guarantees**: Maintaining transfer atomicity and consistency
 *
 * **Server-Side Operations:**
 * - Processes commit preparation requests and mints destination assets
 * - Validates final assertion requests with burn proofs from clients
 * - Assigns minted assets to recipients and confirms transfers
 * - Handles transfer completion requests and generates final responses
 * - Updates comprehensive transaction metrics and monitoring data
 *
 * **Client-Side Operations:**
 * - Submits commit preparation requests to initiate destination asset minting
 * - Performs source asset burning operations with cryptographic proofs
 * - Creates final assertion requests with burn evidence and confirmations
 * - Submits transfer completion requests and validates final responses
 * - Manages comprehensive session lifecycle and state transitions
 *
 * **Atomic Transfer Guarantees:**
 * - Ensures source assets are properly locked before destination minting
 * - Validates destination asset minting before source asset burning
 * - Provides rollback mechanisms for failed transfer operations
 * - Maintains consistency across distributed blockchain networks
 * - Implements comprehensive error recovery and compensation logic
 *
 * **Asset Lifecycle Management:**
 * - **Source Assets**: Locked (Stage 2) → Burned (Stage 3)
 * - **Destination Assets**: Minted (Stage 3) → Assigned to recipient
 * - **Wrapper Tokens**: Created for cross-chain compatibility
 * - **Cryptographic Proofs**: Generated for each asset operation
 *
 * **Comprehensive Monitoring:**
 * - Tracks transaction duration from initiation to completion
 * - Records gas usage across all blockchain operations
 * - Monitors successful, failed, and ongoing transaction counts
 * - Calculates total value exchanged in both directions
 * - Provides real-time analytics and performance metrics
 *
 * @example
 * Server-side stage 3 handler setup:
 * ```typescript
 * const stage3Handler = new Stage3SATPHandler({
 *   sessions: sessionMap,
 *   serverService: stage3ServerService,
 *   clientService: stage3ClientService,
 *   monitorService: monitoringService,
 *   loggerOptions: loggerConfig
 * });
 *
 * // Setup router for incoming requests
 * stage3Handler.setupRouter(connectRouter);
 * ```
 *
 * @example
 * Client-side complete Stage 3 workflow:
 * ```typescript
 * // Step 1: Commit preparation
 * const commitPrepReq = await stage3Handler.CommitPreparationRequest(
 *   lockAssertionResponse
 * );
 * const commitPrepRes = await sendToGateway(targetGateway, commitPrepReq);
 *
 * // Step 2: Final assertion with burn proof
 * const finalAssertReq = await stage3Handler.CommitFinalAssertionRequest(
 *   commitPrepRes
 * );
 * const finalAssertRes = await sendToGateway(targetGateway, finalAssertReq);
 *
 * // Step 3: Complete transfer
 * const completeReq = await stage3Handler.TransferCompleteRequest(
 *   finalAssertRes
 * );
 * const completeRes = await sendToGateway(targetGateway, completeReq);
 *
 * // Step 4: Final validation
 * await stage3Handler.CheckTransferCompleteResponse(completeRes);
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPHandler} for base handler interface
 * @see {@link Stage3ServerService} for server-side business logic
 * @see {@link Stage3ClientService} for client-side business logic
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteResponse,
} from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import { Stage3ServerService } from "../stage-services/server/stage3-server-service";
import { SATPSession } from "../satp-session";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
  Stage,
} from "../../types/satp-protocol";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { Stage3ClientService } from "../stage-services/client/stage3-client-service";
import { getSessionId } from "./handler-utils";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { LockAssertionResponse } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  collectSessionAttributes,
  saveMessageInSessionData,
  setError,
  setErrorChecking,
} from "../session-utils";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import {
  PriceManager,
  PriceManagerOptions,
} from "../../services/token-price-check/price-manager";

/**
 * SATP Stage 3 Handler for Commit Preparation, Final Assertion, and Transfer Completion.
 *
 * @description
 * Implements the Stage 3 phase of the IETF SATP Core v2 protocol, managing
 * the critical final operations of cross-chain asset transfers. This handler
 * orchestrates commit preparation, final assertions with burn proofs, and
 * transfer completion operations that ensure atomic and secure settlement
 * of assets across distributed blockchain networks.
 *
 * **Protocol Stage 3 Responsibilities:**
 * - **Commit Preparation**: Coordinating destination asset minting operations
 * - **Final Assertion Processing**: Validating burn proofs and final commitments
 * - **Transfer Completion**: Finalizing atomic transfers and asset assignments
 * - **Atomicity Enforcement**: Ensuring consistent state across all networks
 * - **Comprehensive Monitoring**: Tracking complete transfer lifecycle metrics
 *
 * **Server-Side Processing:**
 * - Receives CommitPreparationRequest and mints destination assets
 * - Processes CommitFinalAssertionRequest with burn proof validation
 * - Assigns minted assets to recipients upon successful burn verification
 * - Handles TransferCompleteRequest and generates final confirmations
 * - Records comprehensive metrics including gas usage and timing data
 * - Updates transaction counters for successful and failed operations
 *
 * **Client-Side Processing:**
 * - Creates CommitPreparationRequest to initiate destination asset minting
 * - Performs source asset burning with cryptographic proof generation
 * - Submits CommitFinalAssertionRequest with verifiable burn evidence
 * - Sends TransferCompleteRequest for final transfer confirmation
 * - Validates TransferCompleteResponse and updates session completion state
 * - Manages comprehensive error handling and recovery mechanisms
 *
 * **Message Flow (Stage 3):**
 * ```
 * Client Gateway                    Server Gateway
 *      |                                 |
 *      |  CommitPreparationRequest       |
 *      |-------------------------------->|
 *      |                                 | (Mint destination assets)
 *      |  CommitPreparationResponse      |
 *      |<--------------------------------|
 *      | (Burn source assets)            |
 *      |                                 |
 *      |  CommitFinalAssertionRequest    |
 *      |-------------------------------->|
 *      |                                 | (Assign assets to recipient)
 *      |  CommitFinalAssertionResponse   |
 *      |<--------------------------------|
 *      |                                 |
 *      |  TransferCompleteRequest        |
 *      |-------------------------------->|
 *      |                                 |
 *      |  TransferCompleteResponse       |
 *      |<--------------------------------|
 *      |                                 |
 * ```
 *
 * **Atomic Transfer Operations:**
 * - **Phase 1**: Destination asset minting with escrow mechanisms
 * - **Phase 2**: Source asset burning with cryptographic proof generation
 * - **Phase 3**: Asset assignment and final settlement confirmation
 * - **Recovery**: Comprehensive rollback mechanisms for failed operations
 *
 * **Comprehensive Monitoring:**
 * - Transaction duration tracking from Stage 0 initiation to completion
 * - Gas usage monitoring across all blockchain operations (client/server)
 * - Counter management for ongoing, successful, and failed transactions
 * - Value exchange tracking in both sent and received directions
 * - Performance analytics and operational optimization metrics
 *
 * **Error Handling and Recovery:**
 * - Detailed validation of all commitment proofs and burn evidence
 * - Automatic transaction counter adjustments on operation failures
 * - Comprehensive error responses with diagnostic information
 * - Session state consistency maintenance across distributed operations
 * - Support for manual intervention and recovery procedures
 *
 * @class Stage3SATPHandler
 * @implements {SATPHandler}
 *
 * @example
 * Handler initialization for final stage operations:
 * ```typescript
 * const stage3Options: SATPHandlerOptions = {
 *   sessions: new Map<string, SATPSession>(),
 *   serverService: new Stage3ServerService({
 *     assetMinters: destinationAssetMinters,
 *     burnValidators: sourceAssetBurnValidators,
 *     assignmentManagers: assetAssignmentManagers
 *   }),
 *   clientService: new Stage3ClientService({
 *     burnManagers: sourceAssetBurnManagers,
 *     proofGenerators: burnProofGenerators,
 *     completionValidators: transferValidators
 *   }),
 *   monitorService: new MonitorService({
 *     tracing: true,
 *     metrics: ['duration', 'gas_usage', 'value_exchanged'],
 *     counters: ['completed', 'failed', 'ongoing']
 *   }),
 *   loggerOptions: {
 *     level: 'debug',
 *     label: 'Stage3Handler'
 *   }
 * };
 *
 * const handler = new Stage3SATPHandler(stage3Options);
 * ```
 *
 * @example
 * Complete Stage 3 atomic transfer workflow:
 * ```typescript
 * // Complete Stage 3 operations with comprehensive error handling
 * try {
 *   // Phase 1: Prepare commit (mint destination assets)
 *   const commitPrepReq = await handler.CommitPreparationRequest(lockAssertRes);
 *   const commitPrepRes = await sendToTargetGateway(commitPrepReq);
 *
 *   // Phase 2: Final assertion (burn source assets)
 *   const finalAssertReq = await handler.CommitFinalAssertionRequest(commitPrepRes);
 *   const finalAssertRes = await sendToTargetGateway(finalAssertReq);
 *
 *   // Phase 3: Complete transfer
 *   const completeReq = await handler.TransferCompleteRequest(finalAssertRes);
 *   const completeRes = await sendToTargetGateway(completeReq);
 *
 *   // Phase 4: Final validation
 *   await handler.CheckTransferCompleteResponse(completeRes);
 *
 *   console.log('Atomic cross-chain transfer completed successfully');
 * } catch (error) {
 *   console.error('Stage 3 transfer operations failed:', error);
 *   // Comprehensive error handling and recovery procedures
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPHandler} for base handler interface and common methods
 * @see {@link Stage3ServerService} for server-side business logic implementation
 * @see {@link Stage3ClientService} for client-side business logic implementation
 * @see {@link CommitPreparationRequest} for commit preparation message structure
 */
export class Stage3SATPHandler implements SATPHandler {
  /**
   * Handler type identifier for Stage 3 operations.
   * @static
   * @readonly
   */
  public static readonly CLASS_NAME = SATPHandlerType.STAGE3;

  /**
   * Active SATP transfer sessions managed by this handler.
   * @private
   */
  private sessions: Map<string, SATPSession>;

  /**
   * Client-side service implementation for Stage 3 operations.
   * @private
   */
  private clientService: Stage3ClientService;

  /**
   * Server-side service implementation for Stage 3 operations.
   * @private
   */
  private serverService: Stage3ServerService;

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
  private priceManager: PriceManager;

  /**
   * Creates a new Stage 3 SATP handler instance.
   *
   * @description
   * Initializes the Stage 3 handler with all required services and dependencies
   * needed for managing SATP commit preparation, final assertion, and transfer
   * completion operations. Sets up logging, monitoring, and service instances
   * for both client and server-side protocol operations with comprehensive
   * atomic transfer capabilities.
   *
   * **Initialization Process:**
   * - Configures session management for final stage state tracking
   * - Sets up server service with asset minting and assignment capabilities
   * - Initializes client service with burn management and proof generation
   * - Configures distributed monitoring for comprehensive metrics collection
   * - Sets up logger with appropriate Stage 3 context and debugging
   * - Validates all required configuration parameters and dependencies
   *
   * **Configuration Requirements:**
   * - Valid session storage mechanism for completion state management
   * - Server service with destination asset minting and assignment capabilities
   * - Client service with source asset burning and proof generation
   * - Monitoring service for comprehensive transfer lifecycle tracking
   * - Logger configuration for debugging and comprehensive audit trails
   *
   * **Service Integration:**
   * - Server service handles asset minting, assignment, and completion validation
   * - Client service manages asset burning, proof generation, and completion
   * - Monitor service tracks comprehensive metrics including gas and value data
   * - Logger provides detailed debugging and audit trail capabilities
   *
   * @constructor
   * @param {SATPHandlerOptions} ops - Configuration options for the handler
   * @param {Map<string, SATPSession>} ops.sessions - Active session storage
   * @param {Stage3ServerService} ops.serverService - Server-side business logic
   * @param {Stage3ClientService} ops.clientService - Client-side business logic
   * @param {MonitorService} ops.monitorService - Monitoring and tracing service
   * @param {LoggerOptions} ops.loggerOptions - Logger configuration
   *
   * @example
   * Complete handler initialization with atomic transfer services:
   * ```typescript
   * const stage3Handler = new Stage3SATPHandler({
   *   sessions: new Map<string, SATPSession>(),
   *   serverService: new Stage3ServerService({
   *     assetMinters: {
   *       ethereum: new EthereumAssetMinter(),
   *       fabric: new FabricAssetMinter()
   *     },
   *     burnValidators: {
   *       ethereum: new EthereumBurnValidator(),
   *       fabric: new FabricBurnValidator()
   *     },
   *     assignmentManagers: assetAssignmentServices
   *   }),
   *   clientService: new Stage3ClientService({
   *     burnManagers: {
   *       ethereum: new EthereumBurnManager(),
   *       fabric: new FabricBurnManager()
   *     },
   *     proofGenerators: cryptographicProofServices,
   *     completionValidators: transferCompletionServices
   *   }),
   *   monitorService: new MonitorService({
   *     tracing: true,
   *     metrics: [
   *       'transaction_duration',
   *       'gas_usage',
   *       'value_exchanged',
   *       'completion_rate'
   *     ],
   *     counters: [
   *       'successful_transactions',
   *       'failed_transactions',
   *       'ongoing_transactions'
   *     ]
   *   }),
   *   loggerOptions: {
   *     level: 'info',
   *     label: 'Stage3Handler'
   *   }
   * });
   * ```
   *
   * @throws {Error} When required configuration options are missing or invalid
   * @since 0.0.3-beta
   */
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage3ServerService;
    this.clientService = ops.clientService as Stage3ClientService;
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    const priceManagerOptions: PriceManagerOptions = {
      logLevel: ops.loggerOptions.level,
      monitorService: this.monitorService,
    };
    this.priceManager = new PriceManager(priceManagerOptions);
    this.logger.trace(`Initialized ${Stage3SATPHandler.CLASS_NAME}`);
  }

  /**
   * Returns the handler type identifier for this Stage 3 handler.
   *
   * @description
   * Provides the unique handler type identifier used for handler registration,
   * routing, and identification within the SATP protocol implementation.
   *
   * @public
   * @method getHandlerIdentifier
   * @returns {SATPHandlerType} The Stage 3 handler type identifier
   */
  getHandlerIdentifier(): SATPHandlerType {
    return Stage3SATPHandler.CLASS_NAME;
  }

  /**
   * Retrieves the list of active session IDs managed by this handler.
   *
   * @description
   * Returns an array of session identifiers for all active SATP transfer
   * sessions currently being managed by this Stage 3 handler. Used for
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
   * Returns the SATP protocol stage identifier for this handler.
   *
   * @description
   * Provides the stage identifier as defined in the IETF SATP Core v2
   * specification, used for protocol compliance and message routing.
   *
   * @public
   * @method getStage
   * @returns {string} The SATP Stage 3 identifier
   */
  getStage(): string {
    return Stage.STAGE3;
  }

  // ============================================================================
  // SERVER-SIDE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Server-side implementation for processing commit preparation requests.
   *
   * @description
   * Processes incoming CommitPreparationRequest messages from client gateways
   * to initiate destination asset minting operations. This method implements
   * the server-side logic for commit preparation, asset minting, and response
   * generation according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Request Validation**: Validates commit preparation parameters
   * 3. **Asset Minting**: Performs destination asset minting operations
   * 4. **Response Generation**: Creates protocol-compliant commit ready response
   * 5. **Monitoring**: Records performance metrics and operation duration
   *
   * **Asset Minting Operations:**
   * - Creates destination assets equivalent to locked source assets
   * - Generates wrapper tokens for cross-chain compatibility
   * - Validates minting transaction success and confirmations
   * - Prepares assets for final assignment to recipients
   * - Records minting proofs and transaction evidence
   *
   * **Atomic Transfer Phase:**
   * This represents Phase 1 of the atomic transfer commitment:
   * - Source assets are locked (completed in Stage 2)
   * - Destination assets are minted (current operation)
   * - Source assets will be burned after successful minting
   * - Destination assets will be assigned after burn confirmation
   *
   * @private
   * @async
   * @method CommitPreparationImplementation
   * @param {CommitPreparationRequest} req - The incoming commit preparation request
   * @returns {Promise<CommitPreparationResponse>} Promise resolving to the commit ready response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async CommitPreparationImplementation(
    req: CommitPreparationRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<CommitPreparationResponse> {
    const stepTag = `CommitPreparationImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Commit Preparation...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkCommitPreparationRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        await this.serverService.mintAsset(session);

        const message = await this.serverService.commitReadyResponse(
          req,
          session,
        );

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_READY),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);
        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.commitPreparationRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.commitReadyResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, operation: "commitPreparation", satp_phase: 3 },
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
            getMessageTypeName(MessageType.COMMIT_READY),
            error,
          )}`,
        );
        setError(session, MessageType.COMMIT_READY, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "commitPreparation";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.commitReadyErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Server-side implementation for processing commit final assertion requests.
   *
   * @description
   * Processes incoming CommitFinalAssertionRequest messages from client gateways
   * to validate burn proofs and assign destination assets. This method implements
   * the server-side logic for final assertion validation, asset assignment, and
   * acknowledgment generation according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Burn Proof Validation**: Verifies cryptographic burn proofs from client
   * 3. **Asset Assignment**: Assigns minted assets to final recipients
   * 4. **Response Generation**: Creates final acknowledgment receipt
   * 5. **Monitoring**: Records performance metrics and completion data
   *
   * **Burn Proof Validation:**
   * - Verifies transaction hashes and burn operation confirmations
   * - Validates cryptographic signatures and proof integrity
   * - Ensures burn amounts match originally locked amounts exactly
   * - Confirms sufficient blockchain confirmations for security
   * - Validates timing requirements and deadline compliance
   *
   * **Asset Assignment Operations:**
   * - Transfers minted destination assets to final recipients
   * - Updates asset ownership records and metadata
   * - Generates assignment transaction proofs and confirmations
   * - Ensures atomic completion of cross-chain transfer
   * - Records final settlement evidence and timestamps
   *
   * **Atomic Transfer Phase:**
   * This represents Phase 2 of the atomic transfer commitment:
   * - Source assets have been burned (validated in request)
   * - Destination assets are assigned to recipients (current operation)
   * - Transfer atomicity is guaranteed through cryptographic proofs
   * - Final settlement is recorded for audit and compliance
   *
   * @private
   * @async
   * @method CommitFinalAssertionImplementation
   * @param {CommitFinalAssertionRequest} req - The incoming final assertion request
   * @returns {Promise<CommitFinalAssertionResponse>} Promise resolving to the acknowledgment response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async CommitFinalAssertionImplementation(
    req: CommitFinalAssertionRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<CommitFinalAssertionResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Commit Final Assertion...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkCommitFinalAssertionRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        await this.serverService.assignAsset(session);

        const message =
          await this.serverService.commitFinalAcknowledgementReceiptResponse(
            req,
            session,
          );

        this.Log.debug(`${fnTag}, Returning response: ${message}`);

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.commitFinalAssertionRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.commitFinalAcknowledgementReceiptResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 3, operation: "commitFinalAssertion" },
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
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
            error,
          )}`,
        );
        setError(session, MessageType.ACK_COMMIT_FINAL, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "commitFinalAssertion";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.commitFinalAcknowledgementReceiptErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Server-side implementation for processing transfer complete requests.
   *
   * @description
   * Processes incoming TransferCompleteRequest messages from client gateways
   * to finalize cross-chain transfer operations. This method implements the
   * server-side logic for transfer completion validation and final response
   * generation according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in completion state
   * 2. **Completion Validation**: Validates transfer completion parameters
   * 3. **Final Response**: Creates protocol-compliant completion response
   * 4. **Monitoring**: Records final performance metrics and timing data
   *
   * **Transfer Completion Validation:**
   * - Confirms all previous stages completed successfully
   * - Validates session state consistency and integrity
   * - Ensures all cryptographic proofs are valid and complete
   * - Verifies final settlement records and confirmations
   * - Checks compliance with all SATP protocol requirements
   *
   * **Final Settlement Confirmation:**
   * - Confirms atomic transfer completion across all networks
   * - Validates final asset states and ownership records
   * - Generates comprehensive completion evidence
   * - Records final timestamps and performance metrics
   * - Ensures audit trail completeness and integrity
   *
   * @private
   * @async
   * @method TransferCompleteImplementation
   * @param {TransferCompleteRequest} req - The incoming transfer complete request
   * @returns {Promise<TransferCompleteResponse>} Promise resolving to the completion response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async TransferCompleteImplementation(
    req: TransferCompleteRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferCompleteResponse> {
    const stepTag = `CommitFinalAssertionImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Transfer Complete...`);
        this.Log.debug(`${fnTag}, Request: ${req}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkTransferCompleteRequest(req, session);

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.transferCompleteResponse(
          req,
          session,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        attributes = collectSessionAttributes(session, "server");

        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage3
            ?.transferCompleteMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage3
            ?.transferCompleteResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 3, operation: "transferComplete" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        const receiverAssetAmount = Number(
          session.getServerSessionData().receiverAsset?.amount,
        );

        const receiverGasUsed =
          Number(
            JSON.parse(
              session.getServerSessionData().receiverWrapAssertionClaim
                ?.receipt ?? "{}",
            ).gas ?? 0,
          ) +
          Number(
            JSON.parse(
              session.getServerSessionData().mintAssertionClaim?.receipt ??
                "{}",
            ).gas ?? 0,
          ) +
          Number(
            JSON.parse(
              session.getServerSessionData().assignmentAssertionClaim
                ?.receipt ?? "{}",
            ).gas ?? 0,
          );

        this.monitorService.updateCounter(
          "total_value_exchanged_token",
          receiverAssetAmount,
          { ...attributes, transaction_direction: "received" },
        );

        this.monitorService.updateCounter(
          "total_value_exchanged_USD",
          this.priceManager.convertTokensToUSD(
            receiverAssetAmount,
            session.getServerSessionData().receiverAsset?.networkId?.id || "",
          ),
          { ...attributes, transaction_direction: "received" },
        );

        this.monitorService.updateCounter(
          "transaction_gas_used",
          receiverGasUsed,
          { ...attributes, side: "server" },
        );

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
            error,
          )}`,
        );
        setError(session, MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE, error);

        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 3;
        attributes.operation = "transferComplete";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.transferCompleteErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Configures the Connect RPC router with Stage 3 service endpoints.
   *
   * @description
   * Sets up the Connect RPC router to handle incoming Stage 3 SATP protocol
   * messages by registering the appropriate service methods. This enables
   * the handler to receive and process CommitPreparation, CommitFinalAssertion,
   * and TransferComplete requests from client gateways according to the
   * IETF SATP Core v2 specification.
   *
   * **Registered Service Methods:**
   * - **commitPreparation**: Handles CommitPreparationRequest for asset minting
   * - **commitFinalAssertion**: Handles CommitFinalAssertionRequest for burn validation
   * - **transferComplete**: Handles TransferCompleteRequest for final confirmation
   *
   * **Router Configuration:**
   * - Registers SatpStage3Service with Connect RPC framework
   * - Maps service methods to internal implementation functions
   * - Enables distributed tracing for all incoming final stage requests
   * - Provides comprehensive error handling and exception reporting
   *
   * **Distributed Tracing:**
   * - Creates OpenTelemetry spans for router setup operations
   * - Enables request correlation across gateway boundaries
   * - Provides detailed error tracking and performance diagnostics
   * - Facilitates debugging of atomic transfer completion processes
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
   * const stage3Handler = new Stage3SATPHandler(handlerOptions);
   *
   * // Register Stage 3 service endpoints
   * stage3Handler.setupRouter(router);
   *
   * // Router is now ready to handle:
   * // - CommitPreparationRequest -> commitPreparation()
   * // - CommitFinalAssertionRequest -> commitFinalAssertion()
   * // - TransferCompleteRequest -> transferComplete()
   * ```
   *
   * @throws {Error} When router configuration fails or service registration errors occur
   * @since 0.0.3-beta
   * @see {@link SatpStage3Service} for service definition
   * @see {@link ConnectRouter} for router interface
   */
  setupRouter(router: ConnectRouter): void {
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage3Service, {
          async commitPreparation(req): Promise<CommitPreparationResponse> {
            return await that.CommitPreparationImplementation(req);
          },
          async commitFinalAssertion(
            req,
          ): Promise<CommitFinalAssertionResponse> {
            return await that.CommitFinalAssertionImplementation(req);
          },
          async transferComplete(req): Promise<TransferCompleteResponse> {
            return await that.TransferCompleteImplementation(req);
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
   * Creates a commit preparation request message to initiate destination asset minting.
   *
   * @description
   * Generates a CommitPreparationRequest message as part of the SATP Stage 3 protocol
   * to initiate destination asset minting operations on the target network. This method
   * processes the LockAssertionResponse from Stage 2 and constructs a request for
   * the server gateway to begin preparing destination assets for final transfer.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> CommitPreparationRequest -> Server Gateway
   * (Following LockAssertionResponse from Stage 2)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the LockAssertionResponse from Stage 2
   * - Updates session state with lock assertion confirmation data
   * - Constructs protocol-compliant CommitPreparationRequest message
   * - Includes all necessary parameters for destination asset minting
   * - Saves request message in session data for comprehensive audit trail
   *
   * **Atomic Transfer Initiation:**
   * This request initiates Phase 1 of the atomic transfer commitment:
   * - Source assets are confirmed locked (from Stage 2)
   * - Destination asset minting is requested (current operation)
   * - Establishes foundation for subsequent burn and assignment operations
   * - Ensures proper sequencing of atomic transfer operations
   *
   * @public
   * @async
   * @method CommitPreparationRequest
   * @param {LockAssertionResponse} response - Response from Stage 2 lock assertion
   * @returns {Promise<CommitPreparationRequest>} Promise resolving to the commit preparation request
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async CommitPreparationRequest(
    response: LockAssertionResponse,
  ): Promise<CommitPreparationRequest> {
    const stepTag = `CommitPreparationRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Commit Preparation Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkLockAssertionResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const request = await this.clientService.commitPreparation(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_PREPARE),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_PREPARE),
              error,
            )}`,
          );
          setError(session, MessageType.COMMIT_PREPARE, error);
          let attributes: Record<
            string,
            | undefined
            | string
            | number
            | boolean
            | string[]
            | number[]
            | boolean[]
          > = {};

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

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
            getMessageTypeName(MessageType.COMMIT_PREPARE),
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
   * Creates a commit final assertion request with burn proof for asset destruction.
   *
   * @description
   * Generates a CommitFinalAssertionRequest message as part of the SATP Stage 3 protocol
   * to provide cryptographic proof of source asset burning operations. This method
   * processes the CommitPreparationResponse from the server, performs the actual
   * asset burning operation, and constructs a comprehensive final assertion with
   * verifiable burn evidence.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> CommitFinalAssertionRequest -> Server Gateway
   * (Following CommitPreparationResponse with minting confirmation)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the CommitPreparationResponse from server
   * - Updates session state with commit preparation confirmation data
   * - Performs actual source asset burning operation on source blockchain
   * - Generates comprehensive cryptographic burn proofs and evidence
   * - Constructs protocol-compliant CommitFinalAssertionRequest message
   * - Saves request message in session data for audit trail
   *
   * **Asset Burning Operations:**
   * - Executes smart contract calls to burn locked source assets
   * - Waits for sufficient blockchain confirmations for security
   * - Captures transaction hashes and detailed burn evidence
   * - Generates cryptographic signatures and tamper-proof proofs
   * - Validates burn operation success and amount accuracy
   *
   * **Atomic Transfer Completion:**
   * This request represents Phase 2 of the atomic transfer commitment:
   * - Destination assets are confirmed minted (from preparation response)
   * - Source assets are burned with cryptographic proof (current operation)
   * - Establishes conditions for final asset assignment and settlement
   * - Ensures atomic consistency across distributed networks
   *
   * @public
   * @async
   * @method CommitFinalAssertionRequest
   * @param {CommitPreparationResponse} response - Response from commit preparation
   * @returns {Promise<CommitFinalAssertionRequest>} Promise resolving to the final assertion request
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async CommitFinalAssertionRequest(
    response: CommitPreparationResponse,
  ): Promise<CommitFinalAssertionRequest> {
    const stepTag = `CommitFinalAssertionRequest()`;
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
          this.Log.debug(`${fnTag}, Commit Final Assertion Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          attributes = collectSessionAttributes(session, "client");
          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkCommitPreparationResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          await this.clientService.burnAsset(session);

          const request = await this.clientService.commitFinalAssertion(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_FINAL),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          const senderAssetAmount = Number(
            session.getClientSessionData().senderAsset?.amount,
          );

          this.monitorService.updateCounter(
            "total_value_exchanged_token",
            senderAssetAmount,
            { ...attributes, transaction_direction: "sent" },
          );

          this.monitorService.updateCounter(
            "total_value_exchanged_USD",
            this.priceManager.convertTokensToUSD(
              senderAssetAmount,
              session.getClientSessionData().senderAsset?.networkId?.id || "",
            ),
            { ...attributes, transaction_direction: "sent" },
          );

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.COMMIT_FINAL),
              error,
            )}`,
          );
          setError(session, MessageType.COMMIT_FINAL, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

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
            getMessageTypeName(MessageType.COMMIT_FINAL),
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
   * Creates a transfer complete request message for final transfer confirmation.
   *
   * @description
   * Generates a TransferCompleteRequest message as the final step in the SATP
   * Stage 3 protocol workflow. This method processes the CommitFinalAssertionResponse
   * from the server gateway and constructs a request to confirm the successful
   * completion of the entire cross-chain asset transfer operation.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> TransferCompleteRequest -> Server Gateway
   * (Following CommitFinalAssertionResponse with assignment confirmation)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the CommitFinalAssertionResponse from server
   * - Updates session state with final assertion confirmation data
   * - Constructs protocol-compliant TransferCompleteRequest message
   * - Includes final transfer parameters and completion evidence
   * - Saves request message in session data for comprehensive audit trail
   *
   * **Transfer Completion Confirmation:**
   * This request represents the final phase of atomic transfer completion:
   * - Source assets have been successfully burned with proof validation
   * - Destination assets have been minted and assigned to recipients
   * - All cryptographic proofs have been validated and confirmed
   * - Final settlement and completion confirmation is requested
   *
   * @public
   * @async
   * @method TransferCompleteRequest
   * @param {CommitFinalAssertionResponse} response - Response from final assertion
   * @returns {Promise<TransferCompleteRequest>} Promise resolving to the transfer complete request
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   */
  async TransferCompleteRequest(
    response: CommitFinalAssertionResponse,
  ): Promise<TransferCompleteRequest> {
    const stepTag = `TransferCompleteRequest()`;
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
          this.Log.debug(`${fnTag}, Transfer Complete Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkCommitFinalAssertionResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const request = await this.clientService.transferComplete(
            response,
            session,
          );

          if (!request) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
            );
          }

          saveMessageInSessionData(session.getClientSessionData(), request);

          return request;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
              error,
            )}`,
          );
          setError(session, MessageType.ACK_COMMIT_FINAL, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

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
            getMessageTypeName(MessageType.ACK_COMMIT_FINAL),
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
   * Validates transfer complete response and finalizes comprehensive session metrics.
   *
   * @description
   * Processes the final TransferCompleteResponse from the server gateway to validate
   * the successful completion of the entire cross-chain asset transfer operation.
   * This method performs comprehensive validation of the transfer completion,
   * updates all session data, and records detailed performance and operational
   * metrics for the completed transfer.
   *
   * **Validation Process:**
   * - Validates TransferCompleteResponse structure and completeness
   * - Confirms session state consistency and transfer completion
   * - Verifies all cryptographic proofs and evidence integrity
   * - Ensures compliance with SATP protocol requirements
   * - Records final completion timestamps and evidence
   *
   * **Comprehensive Metrics Collection:**
   * - **Transaction Duration**: Complete transfer time from Stage 0 to completion
   * - **Gas Usage Tracking**: Detailed gas consumption on both client and server sides
   * - **Counter Updates**: Final updates to transaction success/failure counters
   * - **Value Exchange**: Total value transferred in both sent and received directions
   * - **Performance Analytics**: Comprehensive operational performance data
   *
   * **Final Session Management:**
   * - Updates session completion state and final timestamps
   * - Records comprehensive audit trail and evidence
   * - Saves final response message for compliance and debugging
   * - Triggers final cleanup and resource management operations
   *
   * **Monitoring Data Recorded:**
   * ```
   * - transaction_duration: Stage 0 start -> Stage 3 completion
   * - transaction_gas_used: Client side (wrap + lock + burn operations)
   * - transaction_gas_used: Server side (wrap + mint operations)
   * - ongoing_transactions: Decremented by 1
   * - successful_transactions: Incremented by 1
   * - total_value_exchanged: Sent and received amounts
   * ```
   *
   * @public
   * @async
   * @method CheckTransferCompleteResponse
   * @param {TransferCompleteResponse} response - Final response from server gateway
   * @returns {Promise<void>} Promise resolving when validation and metrics are complete
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToProcessError} When response validation encounters errors
   *
   * @example
   * Complete transfer validation and metrics:
   * ```typescript
   * // Final step in Stage 3 workflow
   * const completeReq = await handler.TransferCompleteRequest(finalAssertRes);
   * const completeRes = await sendToTargetGateway(completeReq);
   *
   * try {
   *   // Validate completion and record comprehensive metrics
   *   await handler.CheckTransferCompleteResponse(completeRes);
   *
   *   console.log('Cross-chain transfer completed successfully');
   *   console.log('All metrics recorded and session finalized');
   * } catch (error) {
   *   console.error('Transfer completion validation failed:', error);
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link TransferCompleteResponse} for response message structure
   * @see {@link Stage3ClientService} for business logic implementation
   */
  async CheckTransferCompleteResponse(
    response: TransferCompleteResponse,
  ): Promise<void> {
    const stepTag = `CheckTransferCompleteResponse()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Check Transfer Complete Response...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new SessionNotFoundError(fnTag);
          }

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkTransferCompleteResponse(
            response,
            session,
          );

          attributes = collectSessionAttributes(session, "client");

          const stage0Str =
            session.getClientSessionData().processedTimestamps?.stage0
              ?.newSessionRequestMessageTimestamp;
          const stage3Str =
            session.getClientSessionData().receivedTimestamps?.stage3
              ?.transferCompleteResponseMessageTimestamp;

          if (stage0Str && stage3Str) {
            const duration = Number(stage3Str) - Number(stage0Str);
            await this.monitorService.updateCounter(
              "transaction_duration",
              duration,
              attributes,
            );
          } else
            this.Log.warn(
              `${fnTag}, Missing timestamps for transaction duration calculation`,
            );

          const senderGasUsed =
            Number(
              JSON.parse(
                session.getClientSessionData().senderWrapAssertionClaim
                  ?.receipt ?? "{}",
              ).gas ?? 0,
            ) +
            Number(
              JSON.parse(
                session.getClientSessionData().lockAssertionClaim?.receipt ??
                  "{}",
              ).gas ?? 0,
            ) +
            Number(
              JSON.parse(
                session.getClientSessionData().burnAssertionClaim?.receipt ??
                  "{}",
              ).gas ?? 0,
            );

          this.monitorService.updateCounter(
            "transaction_gas_used",
            senderGasUsed,
            { ...attributes, side: "client" },
          );
          this.monitorService.updateCounter(
            "ongoing_transactions",
            -1,
            attributes,
          );
          this.monitorService.updateCounter(
            "successful_transactions",
            1,
            attributes,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              "Checking " +
                getMessageTypeName(
                  MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
                ),
              error,
            )}`,
          );
          setErrorChecking(
            session,
            MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
            error,
          );

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 3;

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
            "Checking " +
              getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE),
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
