import {
  type Logger,
  Checks,
  type LogLevelDesc,
  LoggerProvider,
  type JsObjectSigner,
} from "@hyperledger/cactus-common";

import type { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

//import { GatewayIdentity, GatewayChannel } from "../core/types";
//import { GetStatusError, NonExistantGatewayIdentity } from "../core/errors";
import { GetStatusEndpointV1 } from "./admin/status-endpoint";

//import { GetAuditRequest, GetAuditResponse } from "../generated/gateway-client/typescript-axios";
import type {
  HealthCheckResponse,
  IntegrationsResponse,
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
import type {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../database/repository/interfaces/repository";
import { GatewayShuttingDownError } from "./gateway-errors";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  bridgesManager: SATPCrossChainManager;
  pubKey: string;
  defaultRepository: boolean;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
}

// TODO: addGateways as an admin endpoint, simply calls orchestrator
export class BLODispatcher {
  public static readonly CLASS_NAME = "BLODispatcher";
  private readonly logger: Logger;
  private readonly level: LogLevelDesc;
  private readonly label: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private OAPIEndpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;
  private manager: SATPManager;
  private orchestrator: GatewayOrchestrator;
  private bridgeManager: SATPCrossChainManager;
  private defaultRepository: boolean;
  private localRepository: ILocalLogRepository;
  private remoteRepository: IRemoteLogRepository | undefined;
  private isShuttingDown = false;

  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.level = this.options.logLevel || "INFO";
    this.label = this.className;
    this.logger = LoggerProvider.getOrCreate({
      level: this.level,
      label: this.label,
    });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.orchestrator = options.orchestrator;
    const signer = options.signer;
    const ourGateway = this.orchestrator.ourGateway;
    this.defaultRepository = options.defaultRepository;
    this.localRepository = options.localRepository;
    this.remoteRepository = options.remoteRepository;

    this.bridgeManager = options.bridgesManager;

    const SATPManagerOpts: ISATPManagerOptions = {
      logLevel: "DEBUG",
      instanceId: ourGateway?.id,
      signer: signer,
      connectedDLTs: this.orchestrator.connectedDLTs,
      bridgeManager: this.bridgeManager,
      orchestrator: this.orchestrator,
      pubKey: options.pubKey,
      defaultRepository: this.defaultRepository,
      localRepository: this.localRepository,
      remoteRepository: this.remoteRepository,
    };

    this.manager = new SATPManager(SATPManagerOpts);
  }

  public get className(): string {
    return BLODispatcher.CLASS_NAME;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getOrCreateWebServices()`;
    this.logger.info(
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

    // TODO: keep getter; add an admin endpoint to get identity of connected gateway to BLO
    const endpoints = [
      getStatusEndpointV1,
      getHealthCheckEndpoint,
      getIntegrationsEndpointV1,
      getSessionIdsEndpointV1,
    ];
    this.endpoints = endpoints;
    return endpoints;
  }

  public async getOrCreateOAPIWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getOrCreateOAPIWebServices()`;
    this.logger.info(
      `${fnTag}, Registering webservices on instanceId=${this.instanceId}`,
    );

    if (Array.isArray(this.OAPIEndpoints)) {
      return this.OAPIEndpoints;
    }

    const transactEndpointV1 = new TransactEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const endpoints = [transactEndpointV1];
    this.OAPIEndpoints = endpoints;
    return endpoints;
  }

  private getTargetGatewayClient(id: string) {
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
  }

  public async healthCheck(): Promise<HealthCheckResponse> {
    return executeGetHealthCheck(this.level, this.manager);
  }

  public async getIntegrations(): Promise<IntegrationsResponse> {
    return executeGetIntegrations(this.level, this.manager);
  }

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
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
    this.logger.info(`Transact request: ${req}`);
    if (this.isShuttingDown) {
      throw new GatewayShuttingDownError(fnTag);
    }
    const res = await executeTransact(
      this.level,
      req,
      this.manager,
      this.orchestrator,
    );
    return res;
  }

  public async GetSessionIds(): Promise<string[]> {
    this.logger.info("Get Session Ids request");
    const res = Array.from(await this.manager.getSessions().keys());
    return res;
  }

  public async getManager(): Promise<SATPManager> {
    this.logger.info(`Get SATP Manager request`);
    return this.manager;
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
