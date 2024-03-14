import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { GatewayIdentity, GatewayChannel } from "../core/types";
import { GetStatusError, NonExistantGatewayIdentity } from "../core/errors";
import { GetStatusEndpointV1 } from "../web-services/blo/status-endpoint";

import { GetAuditRequest, GetAuditResponse, StatusRequest, StatusResponse } from "../generated/openapi-blo/typescript-axios";
import { GetStatusHandler } from "./admin/get-status-handler-service";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
}

export class BLODispatcher {
  public static readonly CLASS_NAME = "BLODispatcher";
  private readonly logger: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;

  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
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

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
    return GetStatusHandler(this.logger, req);
  }

  // TODO implement handlers GetAudit, Transact, Cancel, Routes
}
