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
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  ccManager: SATPCrossChainManager;
  pubKey: string;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  claimFormat?: ClaimFormat;
  monitorService: MonitorService;
}

// TODO: addGateways as an admin endpoint, simply calls orchestrator
export class BLODispatcher {
  public static readonly CLASS_NAME = "BLODispatcher";
  private readonly logger: Logger;
  private readonly level: LogLevelDesc;
  private readonly label: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;
  private manager?: SATPManager;
  private orchestrator: GatewayOrchestrator;
  private ccManager: SATPCrossChainManager;
  private localRepository: ILocalLogRepository;
  private remoteRepository: IRemoteLogRepository | undefined;
  private isShuttingDown = false;
  private readonly monitorService: MonitorService;

  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.level = this.options.logLevel || "INFO";
    this.label = this.className;
    this.monitorService = options.monitorService;
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

  public async healthCheck(): Promise<HealthCheckResponse> {
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    return executeGetHealthCheck(this.level, this.manager);
  }

  public async getIntegrations(): Promise<IntegrationsResponse> {
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    return executeGetIntegrations(this.level, this.manager);
  }

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    return executeGetStatus(this.level, req, this.manager);
  }

  /**
   * @notice Transact request handler
   * @param req TransactRequest
   * @throws GatewayShuttingDownError when the flag isShuttingDown is true
   * @returns TransactResponse
   */
  public async Transact(req: TransactRequest): Promise<TransactResponse> {
    //TODO pre-verify verify input
    const fnTag = `${BLODispatcher.CLASS_NAME}#transact()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
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
    const fnTag = `${BLODispatcher.CLASS_NAME}#getApproveAddress()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
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
    const fnTag = `${BLODispatcher.CLASS_NAME}#addCounterpartyGateway()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
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
    this.logger.info(`Perform Audit request: ${safeStableStringify(req)}`);
    if (!this.manager) {
      throw new Error("SATPManager is not defined");
    }
    return executeAudit(this.level, req, this.manager);
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
    const fnTag = `${BLODispatcher.CLASS_NAME}#getManager()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.info(`Get SATP Manager request`);
        if (!this.manager) {
          throw new Error("SATPManager is not defined");
        }
        return this.manager;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public getOracleManager(): OracleManager {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getManager()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.info(`Get Oracle Manager request`);
        return this.ccManager.getOracleManager();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async OracleExecuteTask(
    req: OracleExecuteRequest,
  ): Promise<OracleTask> {
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
  }

  public async OracleRegisterTask(
    req: OracleRegisterRequest,
  ): Promise<OracleTask> {
    this.logger.info(`Oracle Register Request: ${safeStableStringify(req)}`);
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
  }

  public async OracleUnregisterTask(
    req: OracleUnregisterRequest,
  ): Promise<OracleTask> {
    this.logger.info(`Oracle Unregister Request: ${safeStableStringify(req)}`);
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
  }

  public async OracleGetTaskStatus(
    req: OracleStatusRequest,
  ): Promise<OracleTask> {
    this.logger.info(`Oracle Get Status request: ${safeStableStringify(req)}`);
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
