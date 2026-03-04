/**
 * @fileoverview
 * SATP Stage 1 Handler for Transfer Proposal and Commencement Operations.
 *
 * @description
 * This module implements the Stage 1 handler of the IETF SATP Core v2 protocol,
 * responsible for managing the transfer proposal and commencement phases of
 * cross-chain asset transfers. Stage 1 establishes the formal transfer agreement
 * between gateways and initiates the actual cross-chain asset movement process.
 *
 * **Stage 1 Protocol Flow:**
 * 1. **Transfer Proposal Request/Response**: Client proposes transfer parameters and routing
 * 2. **Transfer Commence Request/Response**: Server confirms transfer initiation and begins execution
 *
 * **Key Responsibilities:**
 * - **Transfer Negotiation**: Validating and negotiating transfer proposals between gateways
 * - **Route Validation**: Ensuring cross-chain routing paths are available and optimal
 * - **Transfer Initiation**: Commencing actual asset transfer operations
 * - **Bridge Integration**: Coordinating with bridge manager for cross-chain operations
 * - **Performance Monitoring**: Tracking transfer metrics and operational performance
 *
 * **Server-Side Operations:**
 * - Validates incoming transfer proposals from client gateways
 * - Verifies cross-chain routing capabilities and bridge availability
 * - Generates transfer proposal responses (receipts or rejections)
 * - Processes transfer commencement requests and initiates asset operations
 * - Updates transaction counters and monitoring metrics
 *
 * **Client-Side Operations:**
 * - Creates transfer proposal requests with routing and asset details
 * - Processes server responses and handles proposal acceptance/rejection
 * - Submits transfer commencement requests to proceed with transfers
 * - Manages session state transitions through Stage 1 workflow
 *
 * **Bridge Manager Integration:**
 * - Validates available bridge endpoints for cross-chain operations
 * - Ensures routing paths are established and operational
 * - Coordinates with bridge services for asset movement preparation
 * - Handles bridge-specific configuration and capability validation
 *
 * **Monitoring and Metrics:**
 * - Tracks initiated, ongoing, successful, and failed transaction counters
 * - Records operation duration histograms for performance analysis
 * - Implements distributed tracing for cross-gateway operation correlation
 * - Provides comprehensive error tracking and diagnostic information
 *
 * **Adapter Security:**
 * - All Stage 1 adapter callbacks (outbound notifications and inbound
 *   approvals) traverse mutually authenticated TLS connections.
 * - The gateway rejects inbound approvals when the client certificate cannot
 *   be chained to a configured trust anchor.
 * - Outbound deliveries attach the caller certificate fingerprint for audit,
 *   enabling downstream services to verify origin authenticity.
 *
 * @example
 * Server-side stage 1 handler setup:
 * ```typescript
 * const stage1Handler = new Stage1SATPHandler({
 *   sessions: sessionMap,
 *   serverService: stage1ServerService,
 *   clientService: stage1ClientService,
 *   bridgeClient: bridgeManagerClient,
 *   monitorService: monitoringService,
 *   loggerOptions: loggerConfig
 * });
 *
 * // Setup router for incoming requests
 * stage1Handler.setupRouter(connectRouter);
 * ```
 *
 * @example
 * Client-side transfer proposal workflow:
 * ```typescript
 * // Create transfer proposal
 * const proposalReq = await stage1Handler.TransferProposalRequest(
 *   sessionId,
 *   preTransferResponse
 * );
 * const proposalRes = await sendToGateway(targetGateway, proposalReq);
 *
 * // Commence transfer if proposal accepted
 * const commenceReq = await stage1Handler.TransferCommenceRequest(proposalRes);
 * const commenceRes = await sendToGateway(targetGateway, commenceReq);
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPHandler} for base handler interface
 * @see {@link Stage1ServerService} for server-side business logic
 * @see {@link Stage1ClientService} for client-side business logic
 * @see {@link BridgeManagerClientInterface} for bridge integration
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { ConnectRouter } from "@connectrpc/connect";
import { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import {
  TransferCommenceRequest,
  TransferCommenceResponse,
  TransferProposalResponse,
  TransferProposalRequest,
} from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import { SATPSession } from "../satp-session";
import { Stage1ServerService } from "../stage-services/server/stage1-server-service";
import { Stage1ClientService } from "../stage-services/client/stage1-client-service";
import {
  SATPHandler,
  SATPHandlerOptions,
  SATPHandlerType,
} from "../../types/satp-protocol";
import { SatpStageKey } from "../../generated/gateway-client/typescript-axios";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import {
  FailedToCreateMessageError,
  FailedToProcessError,
  SessionNotFoundError,
} from "../errors/satp-handler-errors";
import { getSessionId, buildAdapterPayload } from "./handler-utils";
import { PreSATPTransferResponse } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { getMessageTypeName } from "../satp-utils";
import { MessageType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  collectSessionAttributes,
  saveMessageInSessionData,
  setError,
} from "../session-utils";
import { BridgeManagerClientInterface } from "../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import type { AdapterManager } from "../../adapters/adapter-manager";

/**
 * SATP Stage 1 Handler for Transfer Proposal and Commencement Operations.
 *
 * @description
 * Implements the Stage 1 phase of the IETF SATP Core v2 protocol, managing
 * the critical transfer proposal and commencement operations that establish
 * formal agreements between gateways and initiate actual cross-chain asset
 * movements. This handler coordinates between client and server gateways to
 * negotiate transfer parameters and commence secure asset operations.
 *
 * **Protocol Stage 1 Responsibilities:**
 * - **Transfer Proposal Management**: Processing and responding to transfer proposals
 * - **Route Validation**: Ensuring cross-chain paths are available and operational
 * - **Transfer Commencement**: Initiating actual asset transfer operations
 * - **Bridge Coordination**: Working with bridge managers for cross-chain routing
 * - **Transaction Monitoring**: Tracking transfer lifecycle and performance metrics
 *
 * **Server-Side Processing:**
 * - Receives and validates TransferProposalRequest messages from client gateways
 * - Verifies bridge endpoint availability and cross-chain routing capabilities
 * - Generates TransferProposalResponse messages (receipts or rejections)
 * - Processes TransferCommenceRequest messages to initiate asset operations
 * - Updates transaction counters for monitoring and analytics
 * - Records operation timing and performance metrics
 *
 * **Client-Side Processing:**
 * - Creates TransferProposalRequest messages with routing and asset parameters
 * - Processes TransferProposalResponse messages and handles acceptance/rejection
 * - Submits TransferCommenceRequest messages to proceed with transfers
 * - Manages session state transitions and error handling
 * - Maintains session consistency and audit trail
 *
 * **Message Flow (Stage 1):**
 * ```
 * Client Gateway                    Server Gateway
 *      |                                 |
 *      |  TransferProposalRequest        |
 *      |-------------------------------->|
 *      |                                 | (Validate routes, check bridges)
 *      |  TransferProposalResponse       |
 *      |<--------------------------------|
 *      |                                 |
 *      |  TransferCommenceRequest        |
 *      |-------------------------------->|
 *      |                                 | (Initiate transfer, update counters)
 *      |  TransferCommenceResponse       |
 *      |<--------------------------------|
 *      |                                 |
 * ```
 *
 * **Bridge Manager Integration:**
 * - Validates available bridge endpoints using BridgeManagerClientInterface
 * - Ensures cross-chain routing paths are established and operational
 * - Coordinates with bridge services for asset movement preparation
 * - Handles bridge-specific configuration and capability requirements
 *
 * **Transaction Monitoring:**
 * - Maintains counters for initiated, ongoing, successful, and failed transactions
 * - Records detailed performance metrics and operation durations
 * - Implements comprehensive error tracking and recovery mechanisms
 * - Provides real-time monitoring and alerting capabilities
 *
 * **Error Handling and Recovery:**
 * - Comprehensive validation of all message parameters and session state
 * - Detailed error responses with diagnostic information for troubleshooting
 * - Automatic transaction counter adjustments on failures
 * - Distributed tracing for cross-gateway error correlation
 *
 * @class Stage1SATPHandler
 * @implements {SATPHandler}
 *
 * @example
 * Handler initialization with bridge integration:
 * ```typescript
 * const stage1Options: SATPHandlerOptions = {
 *   sessions: new Map<string, SATPSession>(),
 *   serverService: new Stage1ServerService(serverConfig),
 *   clientService: new Stage1ClientService(clientConfig),
 *   bridgeClient: new BridgeManagerClient(bridgeConfig),
 *   monitorService: new MonitorService(monitorConfig),
 *   loggerOptions: {
 *     level: 'debug',
 *     label: 'Stage1Handler'
 *   }
 * };
 *
 * const handler = new Stage1SATPHandler(stage1Options);
 * ```
 *
 * @example
 * Complete Stage 1 client workflow:
 * ```typescript
 * // Step 1: Create transfer proposal
 * const proposalReq = await handler.TransferProposalRequest(
 *   sessionId,
 *   preTransferResponse
 * );
 * const proposalRes = await sendToTargetGateway(proposalReq);
 *
 * // Step 2: Commence transfer if accepted
 * if (proposalRes.decision === 'ACCEPTED') {
 *   const commenceReq = await handler.TransferCommenceRequest(proposalRes);
 *   const commenceRes = await sendToTargetGateway(commenceReq);
 *
 *   // Ready for Stage 2 operations
 *   console.log('Transfer commenced successfully');
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPHandler} for base handler interface and common methods
 * @see {@link Stage1ServerService} for server-side business logic implementation
 * @see {@link Stage1ClientService} for client-side business logic implementation
 * @see {@link BridgeManagerClientInterface} for cross-chain bridge integration
 */
export class Stage1SATPHandler implements SATPHandler {
  /**
   * Handler type identifier for Stage 1 operations.
   * @static
   * @readonly
   */
  public static readonly CLASS_NAME = SATPHandlerType.STAGE1;

  /**
   * Active SATP transfer sessions managed by this handler.
   * @private
   */
  private sessions: Map<string, SATPSession>;

  /**
   * Server-side service implementation for Stage 1 operations.
   * @private
   */
  private serverService: Stage1ServerService;

  /**
   * Client-side service implementation for Stage 1 operations.
   * @private
   */
  private clientService: Stage1ClientService;

  /**
   * Bridge manager client for cross-chain routing and operations.
   * @private
   */
  private bridgeManagerClient: BridgeManagerClientInterface;

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
  /** Adapter manager reference for invoking API3 hooks. */
  private readonly adapterManager?: AdapterManager;
  /** Unique identifier for the hosting gateway instance. */
  private readonly gatewayId: string;

  /**
   * Creates a new Stage 1 SATP handler instance.
   *
   * @description
   * Initializes the Stage 1 handler with all required services, bridge integration,
   * and dependencies needed for managing SATP transfer proposal and commencement
   * operations. Sets up logging, monitoring, and service instances for both
   * client and server-side protocol operations with bridge manager coordination.
   *
   * **Initialization Process:**
   * - Configures session management and storage
   * - Sets up server and client service instances
   * - Initializes bridge manager client for cross-chain operations
   * - Configures distributed monitoring and tracing
   * - Sets up logger with appropriate Stage 1 context
   * - Validates all required configuration parameters
   *
   * **Configuration Requirements:**
   * - Valid session storage mechanism for transfer state management
   * - Properly configured Stage 1 server and client services
   * - Active bridge manager client for cross-chain routing
   * - Operational monitoring service for observability
   * - Logger configuration for debugging and audit trails
   *
   * @constructor
   * @param {SATPHandlerOptions} ops - Configuration options for the handler
   * @param {Map<string, SATPSession>} ops.sessions - Active session storage
   * @param {Stage1ServerService} ops.serverService - Server-side business logic
   * @param {Stage1ClientService} ops.clientService - Client-side business logic
   * @param {BridgeManagerClientInterface} ops.bridgeClient - Bridge manager client
   * @param {MonitorService} ops.monitorService - Monitoring and tracing service
   * @param {LoggerOptions} ops.loggerOptions - Logger configuration
   *
   * @example
   * Complete handler initialization:
   * ```typescript
   * const stage1Handler = new Stage1SATPHandler({
   *   sessions: new Map<string, SATPSession>(),
   *   serverService: new Stage1ServerService({
   *     validators: validationConfig,
   *     assetManager: assetManager
   *   }),
   *   clientService: new Stage1ClientService({
   *     routingConfig: routingConfig,
   *     assetProfiles: assetProfiles
   *   }),
   *   bridgeClient: new BridgeManagerClient({
   *     endpoints: bridgeEndpoints,
   *     timeout: 30000
   *   }),
   *   monitorService: new MonitorService({
   *     tracing: true,
   *     metrics: true,
   *     counters: ['transactions', 'errors']
   *   }),
   *   loggerOptions: {
   *     level: 'info',
   *     label: 'Stage1Handler'
   *   }
   * });
   * ```
   *
   * @throws {Error} When required configuration options are missing or invalid
   * @since 0.0.3-beta
   */
  constructor(ops: SATPHandlerOptions) {
    this.sessions = ops.sessions;
    this.serverService = ops.serverService as Stage1ServerService;
    this.clientService = ops.clientService as Stage1ClientService;
    this.bridgeManagerClient = ops.bridgeClient;
    this.monitorService = ops.monitorService;
    this.adapterManager = ops.adapterManager;
    this.gatewayId = ops.gatewayId;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.logger.trace(`Initialized ${Stage1SATPHandler.CLASS_NAME}`);
  }

  /**
   * Returns the handler type identifier for this Stage 1 handler.
   *
   * @description
   * Provides the unique handler type identifier used for handler registration,
   * routing, and identification within the SATP protocol implementation.
   *
   * @public
   * @method getHandlerIdentifier
   * @returns {SATPHandlerType} The Stage 1 handler type identifier
   */
  getHandlerIdentifier(): SATPHandlerType {
    return Stage1SATPHandler.CLASS_NAME;
  }

  /**
   * Retrieves the list of active session IDs managed by this handler.
   *
   * @description
   * Returns an array of session identifiers for all active SATP transfer
   * sessions currently being managed by this Stage 1 handler. Used for
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
   * @returns {string} The SATP Stage 1 identifier
   */
  getStage(): string {
    return SatpStageKey.Stage1;
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
   * Server-side implementation for processing transfer proposal requests.
   *
   * @description
   * Processes incoming TransferProposalRequest messages from client gateways
   * to evaluate and respond to transfer proposals. This method implements the
   * server-side logic for proposal validation, bridge endpoint verification,
   * and decision making according to the IETF SATP Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Proposal Evaluation**: Validates transfer parameters and routing
   * 3. **Bridge Verification**: Checks available bridge endpoints
   * 4. **Response Generation**: Creates receipt or rejection response
   * 5. **Monitoring**: Records performance metrics and operation duration
   *
   * **Proposal Evaluation:**
   * - Validates transfer amounts, assets, and recipient information
   * - Verifies cross-chain routing capabilities and bridge availability
   * - Checks gateway policies and transfer limits
   * - Evaluates network fees and transfer costs
   *
   * **Bridge Integration:**
   * - Validates requested bridge endpoints against available services
   * - Ensures cross-chain routing paths are operational
   * - Verifies bridge capacity and capability for requested transfer
   * - Coordinates with bridge manager for route establishment
   *
   * **Response Types:**
   * - **Receipt**: Proposal accepted, includes agreed parameters
   * - **Rejection**: Proposal denied, includes reason and alternative options
   *
   * @private
   * @async
   * @method TransferProposalImplementation
   * @param {TransferProposalRequest} req - The incoming transfer proposal request
   * @returns {Promise<TransferProposalResponse>} Promise resolving to the proposal response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @since 0.0.3-beta
   * @see {@link Stage1ServerService} for business logic implementation
   * @see {@link TransferProposalRequest} for request message structure
   * @see {@link TransferProposalResponse} for response message structure
   */
  private async TransferProposalImplementation(
    req: TransferProposalRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferProposalResponse> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Transfer Proposal...`);
        this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        await this.adapterManager?.executeAdaptersOrSkip(
          buildAdapterPayload(
            SatpStageKey.Stage1,
            "checkTransferProposalRequestMessage",
            "before",
            session,
            this.gatewayId,
            { operation: "transferProposal", role: "server" },
          ),
        );

        span.setAttribute("sessionId", session.getSessionId() || "");

        await this.serverService.checkTransferProposalRequestMessage(
          req,
          session,
          this.bridgeManagerClient.getAvailableEndPoints(),
        );

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.transferProposalResponse(
          req,
          session,
        );

        this.Log.debug(
          `${fnTag}, Returning response: ${safeStableStringify(message)}`,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.INIT_RECEIPT) +
              "/" +
              getMessageTypeName(MessageType.INIT_REJECT),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);

        span.setAttribute("sessionId", session.getSessionId());
        span.setAttribute(
          "senderNetworkId",
          session.getServerSessionData().senderAsset?.networkId?.id ?? "",
        );
        span.setAttribute(
          "receiverNetworkId",
          session.getServerSessionData().receiverAsset?.networkId?.id ?? "",
        );

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
          session.getServerSessionData().receivedTimestamps?.stage1
            ?.transferProposalRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage1
            ?.transferProposalReceiptMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 1, operation: "transferProposal" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        await this.adapterManager?.executeAdaptersOrSkip(
          buildAdapterPayload(
            SatpStageKey.Stage1,
            "transferProposalResponse",
            "after",
            session,
            this.gatewayId,
            { operation: "transferProposal", role: "server" },
          ),
        );

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.INIT_REJECT),
            error,
          )}`,
        );
        setError(session, MessageType.INIT_REJECT, error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.transferProposalErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Server-side implementation for processing transfer commence requests.
   *
   * @description
   * Processes incoming TransferCommenceRequest messages from client gateways
   * to initiate actual cross-chain asset transfer operations. This method
   * implements the server-side logic for transfer initiation, transaction
   * monitoring setup, and response generation according to the IETF SATP
   * Core v2 specification.
   *
   * **Processing Steps:**
   * 1. **Session Validation**: Ensures session exists and is in valid state
   * 2. **Request Validation**: Validates commence parameters and authorization
   * 3. **Transfer Initiation**: Begins actual asset transfer operations
   * 4. **Monitoring Setup**: Initializes transaction tracking and counters
   * 5. **Response Generation**: Creates protocol-compliant response message
   *
   * **Transfer Initiation:**
   * - Validates transfer authorization and session state
   * - Initiates server-side asset operations and preparations
   * - Sets up monitoring and tracking for transfer lifecycle
   * - Prepares for subsequent Stage 2 operations
   *
   * **Transaction Monitoring:**
   * - Increments initiated and ongoing transaction counters
   * - Records transfer start timestamps and metadata
   * - Sets up distributed tracing for cross-stage operations
   * - Initializes performance and error tracking
   *
   * **Error Handling:**
   * - Comprehensive validation of request parameters and session state
   * - Automatic counter adjustments on processing failures
   * - Detailed error responses with diagnostic information
   * - Session state cleanup and recovery on errors
   *
   * **Performance Tracking:**
   * - Records operation duration from request to response
   * - Tracks network-specific and asset-specific metrics
   * - Provides real-time monitoring and alerting capabilities
   * - Enables comprehensive performance analysis
   *
   * @private
   * @async
   * @method TransferCommenceImplementation
   * @param {TransferCommenceRequest} req - The incoming transfer commence request
   * @returns {Promise<TransferCommenceResponse>} Promise resolving to the commence response
   * @throws {SessionNotFoundError} When the session doesn't exist
   * @throws {FailedToCreateMessageError} When response message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Transaction monitoring flow:
   * ```
   * TransferCommenceRequest -> Validate -> Increment Counters -> TransferCommenceResponse
   *                                               |
   *                                        [initiated_transactions++]
   *                                        [ongoing_transactions++]
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link Stage1ServerService} for business logic implementation
   * @see {@link TransferCommenceRequest} for request message structure
   * @see {@link TransferCommenceResponse} for response message structure
   */
  private async TransferCommenceImplementation(
    req: TransferCommenceRequest,
    //context: HandlerContext, This gives error when when trying to stringify will be commented until there is not usage of it
  ): Promise<TransferCommenceResponse> {
    const stepTag = `TransferProposalImplementation()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      let attributes: Record<
        string,
        undefined | string | number | boolean | string[] | number[] | boolean[]
      > = {};
      let session: SATPSession | undefined;
      try {
        this.Log.debug(`${fnTag}, Transfer Commence...`);
        this.Log.debug(`${fnTag}, Request: ${safeStableStringify(req)}}`);

        session = this.sessions.get(getSessionId(req));
        if (!session) {
          throw new SessionNotFoundError(fnTag);
        }

        await this.adapterManager?.executeAdaptersOrSkip(
          buildAdapterPayload(
            SatpStageKey.Stage1,
            "checkTransferCommenceRequestMessage",
            "before",
            session,
            this.gatewayId,
            { operation: "transferCommence", role: "server" },
          ),
        );

        span.setAttribute("sessionId", session.getSessionId());
        span.setAttribute(
          "senderNetworkId",
          session.getServerSessionData().senderAsset?.networkId?.id ?? "",
        );
        span.setAttribute(
          "receiverNetworkId",
          session.getServerSessionData().receiverAsset?.networkId?.id ?? "",
        );

        attributes = collectSessionAttributes(session, "server");

        this.monitorService.updateCounter(
          "initiated_transactions",
          1,
          attributes,
        );

        this.monitorService.updateCounter(
          "ongoing_transactions",
          1,
          attributes,
        );

        await this.serverService.checkTransferCommenceRequestMessage(
          req,
          session,
        );

        saveMessageInSessionData(session.getServerSessionData(), req);

        const message = await this.serverService.transferCommenceResponse(
          req,
          session,
        );

        this.Log.debug(
          `${fnTag}, Returning response: ${safeStableStringify(message)}`,
        );

        if (!message) {
          throw new FailedToCreateMessageError(
            fnTag,
            getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
          );
        }

        saveMessageInSessionData(session.getServerSessionData(), message);
        const startTimestamp =
          session.getServerSessionData().receivedTimestamps?.stage1
            ?.transferCommenceRequestMessageTimestamp;
        const endTimestamp =
          session.getServerSessionData().processedTimestamps?.stage1
            ?.transferCommenceResponseMessageTimestamp;

        if (startTimestamp && endTimestamp) {
          const duration = Number(endTimestamp) - Number(startTimestamp);
          await this.monitorService.recordHistogram(
            "operation_duration",
            duration,
            { ...attributes, satp_phase: 1, operation: "transferCommence" },
          );
        } else {
          this.Log.warn(
            `${fnTag}, Missing timestamps for operation duration calculation`,
          );
        }

        await this.adapterManager?.executeAdaptersOrSkip(
          buildAdapterPayload(
            SatpStageKey.Stage1,
            "transferCommenceResponse",
            "after",
            session,
            this.gatewayId,
            { operation: "transferCommence", role: "server" },
          ),
        );

        return message;
      } catch (error) {
        this.Log.error(
          `${fnTag}, Error: ${new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.TRANSFER_COMMENCE_RESPONSE),
            error,
          )}`,
        );
        setError(session, MessageType.TRANSFER_COMMENCE_RESPONSE, error);
        if (session) {
          attributes = collectSessionAttributes(session, "server");
        }
        attributes.satp_phase = 1;
        attributes.operation = "transferCommence";

        this.monitorService.updateCounter(
          "ongoing_transactions",
          -1,
          attributes,
        );

        this.monitorService.updateCounter("failed_transactions", 1, attributes);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        return await this.serverService.transferCommenceErrorResponse(
          error,
          session,
        );
      } finally {
        span.end();
      }
    });
  }

  /**
   * Configures the Connect RPC router with Stage 1 service endpoints.
   *
   * @description
   * Sets up the Connect RPC router to handle incoming Stage 1 SATP protocol
   * messages by registering the appropriate service methods. This enables
   * the handler to receive and process TransferProposal and TransferCommence
   * requests from client gateways according to the IETF SATP Core v2 specification.
   *
   * **Registered Service Methods:**
   * - **transferProposal**: Handles TransferProposalRequest messages for transfer negotiation
   * - **transferCommence**: Handles TransferCommenceRequest messages for transfer initiation
   *
   * **Router Configuration:**
   * - Registers SatpStage1Service with Connect RPC framework
   * - Maps service methods to internal implementation functions
   * - Enables distributed tracing for all incoming requests
   * - Provides comprehensive error handling and exception reporting
   *
   * **Distributed Tracing:**
   * - Creates OpenTelemetry spans for router setup operations
   * - Enables request correlation across gateway boundaries
   * - Provides detailed error tracking and performance diagnostics
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
   * const stage1Handler = new Stage1SATPHandler(handlerOptions);
   *
   * // Register Stage 1 service endpoints
   * stage1Handler.setupRouter(router);
   *
   * // Router is now ready to handle:
   * // - TransferProposalRequest -> transferProposal()
   * // - TransferCommenceRequest -> transferCommence()
   * ```
   *
   * @throws {Error} When router configuration fails or service registration errors occur
   * @since 0.0.3-beta
   * @see {@link SatpStage1Service} for service definition
   * @see {@link ConnectRouter} for router interface
   */
  setupRouter(router: ConnectRouter): void {
    const fnTag = `${this.getHandlerIdentifier()}#setupRouter`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        router.service(SatpStage1Service, {
          async transferProposal(req): Promise<TransferProposalResponse> {
            return await that.TransferProposalImplementation(req)!;
          },
          async transferCommence(req): Promise<TransferCommenceResponse> {
            return await that.TransferCommenceImplementation(req)!;
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
   * Creates a transfer proposal request message for cross-chain transfer negotiation.
   *
   * @description
   * Generates a TransferProposalRequest message as part of the SATP Stage 1 protocol
   * to propose transfer parameters and routing to the target gateway. This method
   * processes the PreSATPTransferResponse from Stage 0 and constructs a formal
   * transfer proposal with routing information and bridge endpoint details.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> TransferProposalRequest -> Server Gateway
   * (Following PreSATPTransferResponse from Stage 0)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the PreSATPTransferResponse from Stage 0
   * - Updates session state with pre-transfer information
   * - Constructs transfer proposal with routing and bridge endpoint details
   * - Includes available bridge endpoints from bridge manager
   * - Generates protocol-compliant TransferProposalRequest message
   * - Saves request message in session data for audit trail
   *
   * **Bridge Integration:**
   * - Retrieves available bridge endpoints from bridge manager client
   * - Validates cross-chain routing capabilities
   * - Includes bridge-specific configuration in proposal
   * - Ensures routing paths are established and operational
   *
   * **Session Management:**
   * - Retrieves existing session using provided session ID
   * - Updates session state with pre-transfer response data
   * - Maintains session consistency and audit trail
   * - Preserves transfer context and routing information
   *
   * @public
   * @async
   * @method TransferProposalRequest
   * @param {string} sessionId - Unique identifier for the transfer session
   * @param {PreSATPTransferResponse} response - Response from Stage 0 pre-transfer
   * @returns {Promise<TransferProposalRequest>} Promise resolving to the transfer proposal request
   * @throws {SessionNotFoundError} When the specified session doesn't exist
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Transfer proposal workflow:
   * ```typescript
   * // Following Stage 0 completion
   * const preTransferResponse = await stage0Handler.PreSATPTransferRequest(
   *   newSessionResponse,
   *   sessionId
   * );
   *
   * try {
   *   // Create transfer proposal
   *   const proposalRequest = await stage1Handler.TransferProposalRequest(
   *     sessionId,
   *     preTransferResponse
   *   );
   *
   *   // Send to target gateway
   *   const proposalResponse = await sendToGateway(
   *     targetGatewayUrl,
   *     proposalRequest
   *   );
   *
   *   // Process response for next step
   *   await processProposalResponse(proposalResponse);
   * } catch (error) {
   *   console.error('Transfer proposal failed:', error);
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link TransferProposalRequest} for message structure
   * @see {@link PreSATPTransferResponse} for input message structure
   * @see {@link Stage1ClientService} for business logic implementation
   */
  public async TransferProposalRequest(
    sessionId: string,
    response: PreSATPTransferResponse,
  ): Promise<TransferProposalRequest> {
    const stepTag = `TransferProposalRequest()`;
    const fnTag = `${this.getHandlerIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        let session: SATPSession | undefined;
        try {
          this.Log.debug(`${fnTag}, Transfer Proposal Request...`);

          session = this.sessions.get(sessionId);
          if (!session) {
            throw new Error(`${fnTag}, Session not found`);
          }

          await this.adapterManager?.executeAdaptersOrSkip(
            buildAdapterPayload(
              SatpStageKey.Stage1,
              "transferProposalRequest",
              "before",
              session,
              this.gatewayId,
              { operation: "transferProposal", role: "client" },
            ),
          );

          await this.clientService.checkPreSATPTransferResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const requestTransferProposal =
            await this.clientService.transferProposalRequest(
              session,
              this.bridgeManagerClient.getAvailableEndPoints(),
            );

          if (!requestTransferProposal) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.INIT_PROPOSAL),
            );
          }

          saveMessageInSessionData(
            session.getClientSessionData(),
            requestTransferProposal,
          );

          await this.adapterManager?.executeAdaptersOrSkip(
            buildAdapterPayload(
              SatpStageKey.Stage1,
              "transferProposalRequest",
              "after",
              session,
              this.gatewayId,
              { operation: "transferProposal", role: "client" },
            ),
          );

          return requestTransferProposal;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.INIT_PROPOSAL),
              error,
            )}`,
          );
          setError(session, MessageType.INIT_PROPOSAL, error);
          throw new FailedToProcessError(
            fnTag,
            getMessageTypeName(MessageType.INIT_PROPOSAL),
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
   * Creates a transfer commence request message to initiate cross-chain transfer.
   *
   * @description
   * Generates a TransferCommenceRequest message as the second step in the SATP
   * Stage 1 protocol workflow. This method processes the TransferProposalResponse
   * from the server gateway and, if the proposal was accepted, constructs a
   * request to commence the actual cross-chain asset transfer operations.
   *
   * **Protocol Flow Position:**
   * ```
   * Client Gateway -> TransferCommenceRequest -> Server Gateway
   * (Following TransferProposalResponse acceptance)
   * ```
   *
   * **Request Generation Process:**
   * - Validates and processes the TransferProposalResponse from server
   * - Verifies proposal acceptance and routing agreement
   * - Updates session state with proposal response information
   * - Constructs protocol-compliant TransferCommenceRequest message
   * - Saves request message in session data for audit trail
   *
   * **Transfer Initiation:**
   * - Confirms transfer parameters agreed upon in proposal phase
   * - Validates routing and bridge endpoint configurations
   * - Prepares for actual asset transfer operations to begin
   * - Initiates monitoring and performance tracking
   *
   * **Error Handling and Monitoring:**
   * - Comprehensive validation of proposal response parameters
   * - Updates transaction counters on processing failures
   * - Provides detailed error context for debugging
   * - Maintains session consistency on errors
   *
   * @public
   * @async
   * @method TransferCommenceRequest
   * @param {TransferProposalResponse} response - Response from transfer proposal
   * @returns {Promise<TransferCommenceRequest>} Promise resolving to the transfer commence request
   * @throws {SessionNotFoundError} When the session cannot be found
   * @throws {FailedToCreateMessageError} When message creation fails
   * @throws {FailedToProcessError} When request processing encounters errors
   *
   * @example
   * Complete Stage 1 client workflow:
   * ```typescript
   * // Step 1: Submit transfer proposal
   * const proposalReq = await handler.TransferProposalRequest(
   *   sessionId,
   *   preTransferResponse
   * );
   * const proposalRes = await sendToGateway(targetGateway, proposalReq);
   *
   * // Step 2: Commence transfer if accepted
   * try {
   *   if (proposalRes.decision === 'ACCEPTED') {
   *     const commenceReq = await handler.TransferCommenceRequest(proposalRes);
   *     const commenceRes = await sendToGateway(targetGateway, commenceReq);
   *
   *     console.log('Transfer commenced, proceeding to Stage 2');
   *   } else {
   *     console.log('Transfer proposal rejected:', proposalRes.reason);
   *   }
   * } catch (error) {
   *   console.error('Transfer commencement failed:', error);
   * }
   * ```
   *
   * @example
   * Error handling with transaction monitoring:
   * ```typescript
   * try {
   *   const commenceReq = await handler.TransferCommenceRequest(proposalRes);
   *   return commenceReq;
   * } catch (error) {
   *   if (error instanceof FailedToProcessError) {
   *     // Transaction counters automatically updated
   *     logger.error('Failed to commence transfer', {
   *       sessionId: proposalRes.sessionId,
   *       error: error.message
   *     });
   *   }
   *   throw error;
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link TransferCommenceRequest} for message structure
   * @see {@link TransferProposalResponse} for input message structure
   * @see {@link Stage1ClientService} for business logic implementation
   */
  public async TransferCommenceRequest(
    response: TransferProposalResponse,
  ): Promise<TransferCommenceRequest> {
    const stepTag = `TransferProposalRequest()`;
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
          this.Log.debug(`${fnTag}, Transfer Commence Request...`);
          this.Log.debug(`${fnTag}, Response: ${response}`);

          if (!response.common?.sessionId) {
            throw new Error(`${fnTag}, Session Id not found`);
          }

          session = this.sessions.get(getSessionId(response));
          if (!session) {
            throw new Error(`${fnTag}, Session not found`);
          }

          await this.adapterManager?.executeAdaptersOrSkip(
            buildAdapterPayload(
              SatpStageKey.Stage1,
              "transferCommenceRequest",
              "before",
              session,
              this.gatewayId,
              { operation: "transferCommence", role: "client" },
            ),
          );

          span.setAttribute("sessionId", session.getSessionId() || "");

          await this.clientService.checkTransferProposalResponse(
            response,
            session,
          );

          saveMessageInSessionData(session.getClientSessionData(), response);

          const requestTransferCommence =
            await this.clientService.transferCommenceRequest(response, session);

          if (!requestTransferCommence) {
            throw new FailedToCreateMessageError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
            );
          }

          saveMessageInSessionData(
            session.getClientSessionData(),
            requestTransferCommence,
          );

          await this.adapterManager?.executeAdaptersOrSkip(
            buildAdapterPayload(
              SatpStageKey.Stage1,
              "transferCommenceRequest",
              "after",
              session,
              this.gatewayId,
              { operation: "transferCommence", role: "client" },
            ),
          );

          return requestTransferCommence;
        } catch (error) {
          this.Log.error(
            `${fnTag}, Error: ${new FailedToProcessError(
              fnTag,
              getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
              error,
            )}`,
          );
          setError(session, MessageType.TRANSFER_COMMENCE_REQUEST, error);

          if (session) {
            attributes = collectSessionAttributes(session, "client");
          }
          attributes.satp_phase = 1;

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
            getMessageTypeName(MessageType.TRANSFER_COMMENCE_REQUEST),
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
