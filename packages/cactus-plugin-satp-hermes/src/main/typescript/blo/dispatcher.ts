import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  JsObjectSigner,
} from "@hyperledger/cactus-common";

import { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

//import { GatewayIdentity, GatewayChannel } from "../core/types";
//import { GetStatusError, NonExistantGatewayIdentity } from "../core/errors";
import { GetStatusEndpointV1 } from "../web-services/status-endpoint";

//import { GetAuditRequest, GetAuditResponse } from "../generated/gateway-client/typescript-axios";
import {
  HealthCheckResponse,
  IntegrationsResponse,
  StatusRequest,
  StatusResponse,
  TransactRequest,
  TransactResponse,
} from "../generated/gateway-client/typescript-axios/api";
import { executeGetIntegrations } from "./admin/get-integrations-handler-service";
import { ISATPManagerOptions, SATPManager } from "../gol/satp-manager";
import { GatewayOrchestrator } from "../gol/gateway-orchestrator";
import { SATPBridgesManager } from "../gol/satp-bridges-manager";
import { TransactEndpointV1 } from "../web-services/transact-endpoint";
import { GetSessionIdsEndpointV1 } from "../web-services/get-all-session-ids-endpoints";
import { HealthCheckEndpointV1 } from "../web-services/healthcheck-endpoint";
import { IntegrationsEndpointV1 } from "../web-services/integrations-endpoint";
import { executeGetHealthCheck } from "./admin/get-healthcheck-handler-service";
import { executeGetStatus } from "./admin/get-status-handler-service";
import { executeTransact } from "./transaction/transact-handler-service";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../repository/interfaces/repository";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  bridgesManager: SATPBridgesManager;
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
  private bridgeManager: SATPBridgesManager;
  private defaultRepository: boolean;
  private localRepository: ILocalLogRepository;
  private remoteRepository: IRemoteLogRepository | undefined;

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
      instanceId: ourGateway!.id,
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
    const channels = Array.from(this.orchestrator.getChannels());
    channels.filter((ch) => {
      id == ch[0] && ch[1].toGatewayID == id;
    });

    if (channels.length == 0) {
      throw new Error(`No channels with specified target gateway id ${id}`);
    } else if (channels.length > 1) {
      throw new Error(
        `Duplicated channels with specified target gateway id ${id}`,
      );
    } else {
      return channels[0];
    }
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

  public async Transact(req: TransactRequest): Promise<TransactResponse> {
    //TODO pre-verify verify input
    this.logger.info(`Transact request: ${req}`);
    const res = await executeTransact(
      this.level,
      req,
      this.manager,
      this.orchestrator,
    );
    return res;
  }

  public async GetSessionIds(): Promise<string[]> {
    this.logger.info(`Get Session Ids request`);
    const res = Array.from(await this.manager.getSessions().keys());
    return res;
  }
  // get channel by caller; give needed client from orchestrator to handler to call
  // for all channels, find session id on request
  // TODO implement handlers GetAudit, Transact, Cancel, Routes
}
