/**
 * @fileoverview SATP Gateway API Dispatcher
 *
 * This module provides the main BLODispatcher class which serves as the central
 * request dispatcher for all SATP gateway API endpoints. It coordinates between
 * different service layers including admin operations, transaction handling,
 * oracle management, and cross-chain operations following the IETF SATP v2
 * specification.
 *
 * The dispatcher manages:
 * - Admin endpoints (status, health, audit, session management)
 * - Transaction endpoints (asset transfer operations)
 * - Oracle endpoints (task execution and management)
 * - Cross-chain coordination and gateway communication
 * - Request routing and error handling
 * - Service lifecycle and shutdown management
 *
 * @group API Layer
 * @module api1/dispatcher
 * @since 0.0.3-beta
 *
 * @example
 * ```typescript
 * import { BLODispatcher } from './api1/dispatcher';
 *
 * const dispatcher = new BLODispatcher({
 *   logger: myLogger,
 *   instanceId: 'gateway-001',
 *   orchestrator: gatewayOrchestrator,
 *   signer: cryptoSigner,
 *   ccManager: crossChainManager,
 *   pubKey: 'gateway_public_key_pem',
 *   localRepository: localLogRepo,
 *   remoteRepository: remoteLogRepo,
 *   monitorService: monitoringService
 * });
 *
 * const endpoints = await dispatcher.getOrCreateWebServices();
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import {
  Checks,
  type LogLevelDesc,
  type JsObjectSigner,
} from "@hyperledger/cactus-common";

import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import type { SATPLogger as Logger } from "../core/satp-logger";

import { type IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

//import { GatewayIdentity, GatewayChannel } from "../core/types";
//import { GetStatusError, NonExistantGatewayIdentity } from "../core/errors";
import { GetStatusEndpointV1 } from "./admin/status-endpoint";

//import { GetAuditRequest, GetAuditResponse } from "../generated/gateway-client/typescript-axios";
import type {
  AddCounterpartyGatewayRequest,
  AddCounterpartyGatewayResponse,
  AuditRequest,
  AuditResponse,
  DecideInboundWebhook200Response,
  DecideInboundWebhookRequest,
  GetApproveAddressRequest,
  GetApproveAddressResponse,
  HealthCheckResponse,
  IntegrationsResponse,
  NetworkId,
  OracleExecuteRequest,
  OracleRegisterRequest,
  OracleStatusRequest,
  OracleTask,
  OracleUnregisterRequest,
  StatusRequest,
  StatusResponse,
  TransactRequest,
  TransactResponse,
} from "../generated/gateway-client/typescript-axios/api";
import { executeGetIntegrations } from "./admin/get-integrations-handler-service";
import {
  type ISATPManagerOptions,
  SATPManager,
} from "../services/gateway/satp-manager";
import type { GatewayOrchestrator } from "../services/gateway/gateway-orchestrator";
import type { SATPCrossChainManager } from "../cross-chain-mechanisms/satp-cc-manager";
import { TransactEndpointV1 } from "./transaction/transact-endpoint";
import { GetSessionIdsEndpointV1 } from "./admin/get-all-session-ids-endpoints";
import { HealthCheckEndpointV1 } from "./admin/healthcheck-endpoint";
import { IntegrationsEndpointV1 } from "./admin/integrations-endpoint";
import { executeGetHealthCheck } from "./admin/get-healthcheck-handler-service";
import { executeGetStatus } from "./admin/get-status-handler-service";
import { executeTransact } from "./transaction/transact-handler-service";
import { AddCounterpartyGatewayEndpointV1 } from "./admin/add-counterparty-gateway-endpoint";
import type {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../database/repository/interfaces/repository";
import { GatewayShuttingDownError } from "./gateway-errors";
import {
  ClaimFormat,
  TokenType,
} from "../generated/proto/cacti/satp/v02/common/message_pb";
import { GetApproveAddressEndpointV1 } from "./transaction/get-approve-address-endpoint";
import { getEnumValueByKey } from "../services/utils";
import { GatewayIdentity } from "../core/types";

import { OracleExecuteTaskEndpointV1 } from "./oracle/oracle-execute-task-endpoint";
import { registerTask } from "./oracle/oracle-register-task-handler-service";
import { executeTask } from "./oracle/oracle-execute-task-handler-service";
import { getTaskStatus } from "./oracle/oracle-get-status-handler-service";
import { OracleManager } from "../cross-chain-mechanisms/oracle/oracle-manager";
import { unregisterTask } from "./oracle/oracle-unregister-task-handler-service";
import { OracleRegisterTaskEndpointV1 } from "./oracle/oracle-register-task-endpoint";
import { OracleUnregisterTaskEndpointV1 } from "./oracle/oracle-unregister-task-endpoint";
import { GetOracleStatusEndpointV1 } from "./oracle/oracle-get-status-endpoint";
import safeStableStringify from "safe-stable-stringify";
import { executeAudit } from "./admin/get-audit-handler-service";
import { AuditEndpointV1 } from "./admin/audit-endpoint";
import { DecideInboundWebhookEndpointV1 } from "./webhook/decide-endpoint";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import type { AdapterManager } from "../adapters/adapter-manager";

/**
 * Configuration options for BLODispatcher initialization.
 *
 * Provides all necessary dependencies and configuration parameters required
 * to initialize the SATP gateway API dispatcher. Includes service references,
 * repository connections, cryptographic components, and monitoring capabilities
 * for complete SATP protocol operation support.
 *
 * @interface BLODispatcherOptions
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const dispatcherOptions: BLODispatcherOptions = {
 *   logger: myLogger,
 *   logLevel: 'debug',
 *   instanceId: 'satp-gateway-prod-001',
 *   orchestrator: new GatewayOrchestrator(orchestratorConfig),
 *   signer: new EcdsaSecp256k1Signature(),
 *   ccManager: new SATPCrossChainManager(ccConfig),
 *   pubKey: 'your_key',
 *   localRepository: new KnexLocalLogRepository(localDbConfig),
 *   remoteRepository: new KnexRemoteLogRepository(remoteDbConfig),
 *   claimFormat: ClaimFormat.JWT,
 *   monitorService: new OpenTelemetryMonitorService()
 * };
 * ```
 */
export interface BLODispatcherOptions {
  /** Logger instance for dispatcher operations */
  logger: Logger;
  /** Optional log level override (defaults to INFO) */
  logLevel?: LogLevelDesc;
  /** Unique identifier for this dispatcher instance */
  instanceId: string;
  /** Gateway orchestrator for managing gateway interactions */
  orchestrator: GatewayOrchestrator;
  /** Cryptographic signer for SATP protocol operations */
  signer: JsObjectSigner;
  /** Cross-chain manager for blockchain integrations */
  ccManager: SATPCrossChainManager;
  /** Public key in PEM format for signature verification */
  pubKey: string;
  /** Local repository for gateway log persistence */
  localRepository: ILocalLogRepository;
  /** Optional remote repository for distributed logging */
  remoteRepository?: IRemoteLogRepository;
  /** Optional claim format specification (defaults to JWT) */
  claimFormat?: ClaimFormat;
  /** Monitoring service for telemetry and metrics */
  monitorService: MonitorService;
  /** Optional adapter manager instance for SATP hooks */
  adapterManager?: AdapterManager;
}

/**
 * Business Logic Operations (BLO) Dispatcher for SATP Gateway API.
 *
 * The main request dispatcher that coordinates all SATP gateway operations
 * including admin functions, transaction processing, oracle management, and
 * cross-chain coordination. Acts as the central orchestrator for the SATP
 * protocol implementation, routing requests to appropriate handlers and
 * managing the lifecycle of gateway operations.
 *
 * Key responsibilities:
 * - Web service endpoint registration and management
 * - Request routing to appropriate service handlers
 * - Cross-chain transaction coordination
 * - Oracle task execution and management
 * - Gateway administration and monitoring
 * - Graceful shutdown and error handling
 *
 * @class BLODispatcher
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const dispatcher = new BLODispatcher({
 *   logger: myLogger,
 *   instanceId: 'gateway-prod-001',
 *   orchestrator: gatewayOrchestrator,
 *   signer: ecdsaSigner,
 *   ccManager: crossChainManager,
 *   pubKey: gatewayPublicKey,
 *   localRepository: localLogRepo,
 *   remoteRepository: remoteLogRepo,
 *   monitorService: telemetryService
 * });
 *
 * // Initialize web service endpoints
 * const endpoints = await dispatcher.getOrCreateWebServices();
 *
 * // Process transaction request
 * const response = await dispatcher.Transact(transactionRequest);
 * ```
 */
export class BLODispatcher {
  /** Class name constant for debugging and logging */
  public static readonly CLASS_NAME = "BLODispatcher";
  /** Logger instance for dispatcher operations */
  private readonly logger: Logger;
  /** Log level configuration */
  private readonly level: LogLevelDesc;
  /** Logger label for identification */
  private readonly label: string;
  /** Registered web service endpoints */
  private endpoints: IWebServiceEndpoint[] | undefined;
  /** Unique instance identifier */
  private readonly instanceId: string;
  /** SATP manager for protocol operations */
  private manager?: SATPManager;
  /** Gateway orchestrator for inter-gateway communication */
  private orchestrator: GatewayOrchestrator;
  /** Cross-chain manager for blockchain integrations */
  private ccManager: SATPCrossChainManager;
  /** Local log repository for persistence */
  private localRepository: ILocalLogRepository;
  /** Remote log repository for distributed coordination */
  private remoteRepository: IRemoteLogRepository | undefined;
  /** Shutdown flag to prevent new requests during shutdown */
  private isShuttingDown = false;
  /** Monitoring service for telemetry and metrics */
  private readonly monitorService: MonitorService;
  /** Adapter manager reference forwarded to SATP handlers */
  private readonly adapterManager?: AdapterManager;

  /**
   * Initialize the BLO Dispatcher with required dependencies.
   *
   * Creates and configures the dispatcher with all necessary service components
   * including logging, monitoring, orchestration, and persistence layers.
   * Initializes the SATP manager for protocol operations and sets up telemetry
   * for request tracking and performance monitoring.
   *
   * @param options - Complete configuration for dispatcher initialization
   * @throws Error if required options are missing or invalid
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * const dispatcher = new BLODispatcher({
   *   logger: satpLogger,
   *   logLevel: 'debug',
   *   instanceId: 'gateway-001',
   *   orchestrator: myOrchestrator,
   *   signer: cryptoSigner,
   *   ccManager: crossChainManager,
   *   pubKey: 'LS0tLS1CRUdJTi...',
   *   localRepository: localRepo,
   *   remoteRepository: remoteRepo,
   *   monitorService: monitoring
   * });
   * ```
   */
  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.level = this.options.logLevel || "INFO";
    this.label = this.className;
    this.monitorService = options.monitorService;
    this.adapterManager = options.adapterManager;
    this.logger = LoggerProvider.getOrCreate(
      {
        level: this.level,
        label: this.label,
      },
      this.options.monitorService,
    );
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.orchestrator = options.orchestrator;
    const signer = options.signer;
    const ourGateway = this.orchestrator.ourGateway;
    this.localRepository = options.localRepository;
    this.remoteRepository = options.remoteRepository;
    this.ccManager = options.ccManager;

    context.with(ctx, () => {
      try {
        const SATPManagerOpts: ISATPManagerOptions = {
          logLevel: this.level,
          ourGateway: ourGateway,
          signer: signer,
          ccManager: this.ccManager,
          orchestrator: this.orchestrator,
          pubKey: options.pubKey,
          localRepository: this.localRepository,
          remoteRepository: this.remoteRepository,
          claimFormat: options.claimFormat,
          monitorService: this.monitorService,
          adapterManager: this.adapterManager,
        };

        this.manager = new SATPManager(SATPManagerOpts);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public get className(): string {
    return BLODispatcher.CLASS_NAME;
  }

  /**
   * Get or create web service endpoints for the SATP gateway API.
   *
   * Initializes and returns all web service endpoints supported by this
   * gateway dispatcher, including admin, transaction, and oracle endpoints.
   * Implements lazy initialization - endpoints are created only on first
   * access and cached for subsequent calls.
   *
   * Registered endpoints include:
   * - Admin: status, health check, integrations, session management
   * - Transaction: asset transfer operations and approve address queries
   * - Oracle: task registration, execution, and status management
   * - Gateway: counterparty gateway management and audit operations
   *
   * @returns Promise resolving to array of configured web service endpoints
   * @throws Error if endpoint initialization fails
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * const endpoints = await dispatcher.getOrCreateWebServices();
   * console.log(`Registered ${endpoints.length} API endpoints`);
   *
   * // Endpoints can be registered with an Express server
   * endpoints.forEach(endpoint => {
   *   app.use(endpoint.getPath(), endpoint.getExpressRequestHandler());
   * });
   * ```
   */
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getOrCreateWebServices()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.debug(
          `${fnTag}, Registering webservices on instanceId=${this.instanceId}`,
        );

        if (Array.isArray(this.endpoints)) {
          return this.endpoints;
        }
        const getStatusEndpointV1 = new GetStatusEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const getHealthCheckEndpoint = new HealthCheckEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const getIntegrationsEndpointV1 = new IntegrationsEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const getSessionIdsEndpointV1 = new GetSessionIdsEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const getApproveAddressEndpointV1 = new GetApproveAddressEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const transactEndpointV1 = new TransactEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const addCounterpartyGatewayEndpointV1 =
          new AddCounterpartyGatewayEndpointV1({
            dispatcher: this,
            logLevel: this.options.logLevel,
          });

        const auditEndpointV1 = new AuditEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const oracleExecuteTaskEndpointV1 = new OracleExecuteTaskEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const oracleRegisterTaskEndpointV1 = new OracleRegisterTaskEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const oracleUnregisterTaskEndpointV1 =
          new OracleUnregisterTaskEndpointV1({
            dispatcher: this,
            logLevel: this.options.logLevel,
          });

        const oracleGetStatusEndpointV1 = new GetOracleStatusEndpointV1({
          dispatcher: this,
          logLevel: this.options.logLevel,
        });

        const decideInboundWebhookEndpointV1 =
          new DecideInboundWebhookEndpointV1({
            dispatcher: this,
            logLevel: this.options.logLevel,
          });

        // TODO: keep getter; add an admin endpoint to get identity of connected gateway to BLO
        const endpoints = [
          getStatusEndpointV1,
          getHealthCheckEndpoint,
          getIntegrationsEndpointV1,
          getSessionIdsEndpointV1,
          getApproveAddressEndpointV1,
          transactEndpointV1,
          addCounterpartyGatewayEndpointV1,
          auditEndpointV1,
          oracleExecuteTaskEndpointV1,
          oracleRegisterTaskEndpointV1,
          oracleUnregisterTaskEndpointV1,
          oracleGetStatusEndpointV1,
          decideInboundWebhookEndpointV1,
        ];
        this.endpoints = endpoints;
        this.logger.debug(`${fnTag} registered ${endpoints.length} endpoints`);
        return endpoints;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private getTargetGatewayClient(id: string) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getTargetGatewayClient()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const channels: [string, { toGatewayID: string }][] = Array.from(
          this.orchestrator.getChannels(),
        );
        const filtered = channels.filter((ch) => {
          return ch[0] === id && ch[1].toGatewayID === id;
        });

        if (filtered.length === 0) {
          throw new Error(`No channels with specified target gateway id ${id}`);
        }
        if (filtered.length > 1) {
          throw new Error(
            `Duplicated channels with specified target gateway id ${id}`,
          );
        }
        return filtered[0];
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
   * Perform health check on the SATP gateway.
   *
   * Executes a comprehensive health check of the gateway's core components
   * including SATP manager status, database connectivity, and service
   * availability. Used for monitoring and load balancer health probes.
   *
   * @returns Promise resolving to health check response with status details
   * @throws Error if SATP manager is not initialized or health check fails
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * try {
   *   const health = await dispatcher.healthCheck();
   *   console.log('Gateway health:', health.status);
   * } catch (error) {
   *   console.error('Health check failed:', error.message);
   * }
   * ```
   */
  public async healthCheck(): Promise<HealthCheckResponse> {
    const { span, context: ctx } =
      this.monitorService.startSpan("API1#healthCheck()");
    return context.with(ctx, () => {
      try {
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        return executeGetHealthCheck(this.level, this.manager);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async getIntegrations(): Promise<IntegrationsResponse> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#getIntegrations()",
    );
    return context.with(ctx, () => {
      try {
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        return executeGetIntegrations(this.level, this.manager);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
    const { span, context: ctx } =
      this.monitorService.startSpan("API1#GetStatus()");
    return context.with(ctx, () => {
      try {
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        return executeGetStatus(this.level, req, this.manager);
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
   * Process SATP transaction request for cross-chain asset transfer.
   *
   * Handles incoming transaction requests following the SATP protocol workflow.
   * Coordinates with the SATP manager and gateway orchestrator to execute
   * the multi-stage asset transfer process including validation, commitment,
   * and finalization phases.
   *
   * The transaction process includes:
   * - Request validation and authentication
   * - Asset lock and commitment establishment
   * - Cross-chain transfer coordination
   * - Completion confirmation and logging
   *
   * @param req - SATP transaction request with asset and transfer details
   * @returns Promise resolving to transaction response with operation status
   * @throws GatewayShuttingDownError when gateway is shutting down
   * @throws Error if SATP manager is not initialized or transaction fails
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * const transactionRequest: TransactRequest = {
   *   sessionId: 'session-123',
   *   transferNumber: 1,
   *   asset: {
   *     assetType: 'ERC20',
   *     assetId: '0x742d35...',
   *     amount: '1000000000000000000' // 1 ETH in wei
   *   },
   *   sourceNetwork: { id: 'ethereum-mainnet' },
   *   destinationNetwork: { id: 'polygon-mainnet' }
   * };
   *
   * const response = await dispatcher.Transact(transactionRequest);
   * console.log('Transaction status:', response.status);
   * ```
   */
  public async Transact(req: TransactRequest): Promise<TransactResponse> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#transact()`;
    const { span, context: ctx } =
      this.monitorService.startSpan("API1#transact()");
    return context.with(ctx, async () => {
      try {
        this.logger.debug(`Transact request: ${safeStableStringify(req)}`);

        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(fnTag);
        }
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        const res = await executeTransact(
          this.level,
          req,
          this.manager,
          this.orchestrator,
        );
        return res;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async GetApproveAddress(
    req: GetApproveAddressRequest,
  ): Promise<GetApproveAddressResponse> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#GetApproveAddress()",
    );
    return context.with(ctx, () => {
      try {
        this.logger.info("Get Approve Address request");
        if (!req) {
          throw new Error(`Request is required`);
        }
        if (!req.networkId) {
          throw new Error(`Network ID is required`);
        }
        if (!req.tokenType) {
          throw new Error(`Token type is required`);
        }
        if (!req.networkId.id || !req.networkId.ledgerType) {
          throw new Error(`Network ID and Ledger Type are required`);
        }
        if (typeof req.networkId.id !== "string") {
          throw new Error(`Network ID must be a string`);
        }
        const res = this.ccManager
          .getClientBridgeManagerInterface()
          .getApproveAddress(
            req.networkId as NetworkId,
            (() => {
              const tokenType = getEnumValueByKey(TokenType, req.tokenType);
              if (tokenType === undefined) {
                throw new Error(`Invalid token type: ${req.tokenType}`);
              }
              return tokenType;
            })(),
          );
        this.logger.debug(
          `Get Approve Address response: ${safeStableStringify(res)}`,
        );
        return {
          approveAddress: res,
        } as GetApproveAddressResponse;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async AddCounterpartyGateway(
    req: AddCounterpartyGatewayRequest,
  ): Promise<AddCounterpartyGatewayResponse> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#AddCounterpartyGateway()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info("Add Counterparty Gateway request");
        if (!req) {
          throw new Error(`Request is required`);
        }
        if (!req.counterparty) {
          throw new Error(`Gateway ID is required`);
        }
        if (!req.counterparty.id) {
          throw new Error(`Gateway ID is required`);
        }
        if (!req.counterparty.version) {
          throw new Error(`Gateway version is required`);
        }
        if (!req.counterparty.address) {
          throw new Error(`Gateway address is required`);
        }
        if (!req.counterparty.connectedDLTs) {
          throw new Error(`Gateway connectedDLTs is required`);
        }
        if (!req.counterparty.proofID) {
          throw new Error(`Gateway proofID is required`);
        }
        if (!req.counterparty.gatewayServerPort) {
          throw new Error(`Gateway gatewayServerPort is required`);
        }
        if (!req.counterparty.gatewayClientPort) {
          throw new Error(`Gateway gatewayClientPort is required`);
        }
        if (!req.counterparty.gatewayOapiPort) {
          throw new Error(`Gateway gatewayOapiPort is required`);
        }
        if (!req.counterparty.pubKey) {
          throw new Error(`Gateway pubKey is required`);
        }
        if (!req.counterparty.name) {
          throw new Error(`Gateway name is required`);
        }

        try {
          await this.orchestrator.addGatewayAndCreateChannel(
            req.counterparty as GatewayIdentity,
          );

          this.logger.info(`Gateway ${req.counterparty.id} added successfully`);
          span.setStatus({ code: SpanStatusCode.OK });
          return {
            status: true,
          } as AddCounterpartyGatewayResponse;
        } catch (ex) {
          this.logger.error(
            `Error adding gateway ${req.counterparty.id}: ${ex}`,
            ex,
          );
          return {
            status: false,
          } as AddCounterpartyGatewayResponse;
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

  public async PerformAudit(req: AuditRequest): Promise<AuditResponse> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#performAudit()",
    );
    return context.with(ctx, () => {
      try {
        this.logger.info(`Perform Audit request: ${safeStableStringify(req)}`);
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        return executeAudit(this.level, req, this.manager);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async GetSessionIds(): Promise<string[]> {
    this.logger.info("Get Session Ids request");
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    const res = Array.from(await this.manager.getSessions().keys());
    return res;
  }

  public async getManager(): Promise<SATPManager> {
    this.logger.info(`Get SATP Manager request`);
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    return this.manager;
  }

  public getOracleManager(): OracleManager {
    this.logger.info(`Get Oracle Manager request`);
    return this.ccManager.getOracleManager();
  }

  public async OracleExecuteTask(
    req: OracleExecuteRequest,
  ): Promise<OracleTask> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#OracleExecuteTask()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `Oracle Execute Task request: ${safeStableStringify(req)}`,
        );
        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(
            `${BLODispatcher.CLASS_NAME}#OracleExecuteTask()`,
          );
        }
        return await executeTask(
          this.level,
          req,
          this.ccManager.getOracleManager(),
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async OracleRegisterTask(
    req: OracleRegisterRequest,
  ): Promise<OracleTask> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#OracleRegisterTask()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `Oracle Register Request: ${safeStableStringify(req)}`,
        );
        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(
            `${BLODispatcher.CLASS_NAME}#OracleRegisterTask()`,
          );
        }
        return await registerTask(
          this.level,
          req,
          this.ccManager.getOracleManager(),
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async OracleUnregisterTask(
    req: OracleUnregisterRequest,
  ): Promise<OracleTask> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#OracleUnregisterTask()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `Oracle Unregister Request: ${safeStableStringify(req)}`,
        );
        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(
            `${BLODispatcher.CLASS_NAME}#OracleUnregisterTask()`,
          );
        }
        return await unregisterTask(
          this.level,
          req,
          this.ccManager.getOracleManager(),
        );
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async OracleGetTaskStatus(
    req: OracleStatusRequest,
  ): Promise<OracleTask> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#OracleGetTaskStatus()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `Oracle Get Status request: ${safeStableStringify(req)}`,
        );
        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(
            `${BLODispatcher.CLASS_NAME}#OracleGetStatus()`,
          );
        }
        return await getTaskStatus(
          this.level,
          req,
          this.ccManager.getOracleManager(),
        );
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
   * Process an inbound webhook decision from an external approval controller.
   *
   * This method handles decisions (approve/reject) posted by external systems
   * for paused SATP transfers. The decision is validated and delegated to the
   * adapter manager for processing.
   *
   * @param req - The decision request containing adapterId, sessionId, continue flag, and reason
   * @returns Response indicating whether the decision was accepted
   * @throws GatewayShuttingDownError if the gateway is shutting down
   * @throws Error if adapter manager is not configured
   * @since 0.0.3-beta
   */
  public async decideInboundWebhook(
    req: DecideInboundWebhookRequest,
  ): Promise<DecideInboundWebhook200Response> {
    const { span, context: ctx } = this.monitorService.startSpan(
      "API1#decideInboundWebhook()",
    );
    return context.with(ctx, async () => {
      try {
        this.logger.info(
          `Inbound webhook decision request: adapter="${req.adapterId}" ` +
            `session="${req.sessionId}" continue=${req.continue}`,
        );
        if (this.isShuttingDown) {
          throw new GatewayShuttingDownError(
            `${BLODispatcher.CLASS_NAME}#decideInboundWebhook()`,
          );
        }
        if (!this.adapterManager) {
          throw new Error(
            `${BLODispatcher.CLASS_NAME}#decideInboundWebhook(): AdapterManager is not configured`,
          );
        }

        const result = await this.adapterManager.decideInboundWebhook({
          adapterId: req.adapterId,
          sessionId: req.sessionId,
          contextId: req.contextId,
          continue: req.continue,
          reason: req.reason,
          data: req.data,
        });

        return {
          accepted: result.accepted,
          sessionId: result.sessionId,
          message: result.message,
          timestamp: result.timestamp,
        };
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
   * Changes the isShuttingDown flag to true, stopping all new requests
   */
  public setInitiateShutdown(): void {
    this.logger.info(`Stopping requests`);
    this.isShuttingDown = true;
  }
  // get channel by caller; give needed client from orchestrator to handler to call
  // for all channels, find session id on request
  // TODO implement handlers GetAudit, Transact, Cancel, Routes
}
