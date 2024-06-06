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
  StatusRequest,
  StatusResponse,
} from "../generated/gateway-client/typescript-axios/api";
import { ExecuteGetStatus } from "./admin/get-status-handler-service";
import { ISATPManagerOptions, SATPManager } from "../gol/satp-manager";
import { GatewayOrchestrator } from "../gol/gateway-orchestrator";
import { SATPBridgesManager } from "../gol/satp-bridges-manager";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  bridgesManager: SATPBridgesManager;
}

export class BLODispatcher {
  public static readonly CLASS_NAME = "BLODispatcher";
  private readonly logger: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;
  private manager: SATPManager;
  private orchestrator: GatewayOrchestrator;
  private bridgeManager: SATPBridgesManager;

  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.orchestrator = options.orchestrator;
    const signer = options.signer;
    const ourGateway = this.orchestrator.ourGateway;

    this.bridgeManager = options.bridgesManager;

    const SATPManagerOpts: ISATPManagerOptions = {
      logLevel: "DEBUG",
      instanceId: ourGateway!.id,
      signer: signer,
      supportedDLTs: this.orchestrator.supportedDLTs,
      bridgeManager: this.bridgeManager,
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

    const theEndpoints = [getStatusEndpointV1];
    this.endpoints = theEndpoints;
    return theEndpoints;
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

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
    return ExecuteGetStatus(this.logger, req);
  }

  public async Transact(req: StatusRequest): Promise<StatusResponse> {
    return ExecuteGetStatus(this.logger, req);
  }
  // get channel by caller; give needed client from orchestrator to handler to call
  // for all channels, find session id on request
  // TODO implement handlers GetAudit, Transact, Cancel, Routes
}
