import {
  Checks,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import routesStage1 from "./stage-services/stage1-service";
import routesStage2 from "./stage-services/stage2-service";
import routesStage3 from "./stage-services/stage3-service";
import { Stage1ServerHandler } from "./stage-handlers/server/stage1-server-handler";
import { SATPGateway } from "../gateway-refactor";
import { Stage2ServerHandler } from "./stage-handlers/server/stage2-server-handler";
import { Stage3ServerHandler } from "./stage-handlers/server/stage3-server-handler";

export interface COREDispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
}

export class COREDispatcher {
  public static readonly CLASS_NAME = "COREDispacher";
  private readonly logger: Logger;
  private readonly instanceId: string;
  private endpoints: any[] | undefined;

  private readonly gateway: SATPGateway;
  private readonly stage1Handler: Stage1ServerHandler;
  private readonly stage2Handler: Stage2ServerHandler;
  private readonly stage3Handler: Stage3ServerHandler;

  constructor(
    public readonly options: COREDispatcherOptions,
    gateway: SATPGateway,
    stage1Handler: Stage1ServerHandler,
    stage2Handler: Stage2ServerHandler,
    stage3Handler: Stage3ServerHandler,
  ) {
    const fnTag = `${COREDispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);

    this.gateway = gateway;
    this.stage1Handler = stage1Handler;
    this.stage2Handler = stage2Handler;
    this.stage3Handler = stage3Handler;
  }

  public get className(): string {
    return COREDispatcher.CLASS_NAME;
  }

  getOrCreateServices() {
    const fnTag = `${COREDispatcher.CLASS_NAME}#getOrCreateServices()`;
    this.logger.info(
      `${fnTag}, Registering gRPCservices on instanceId=${this.instanceId}`,
    );
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    this.endpoints = [
      routesStage1(this.gateway, this.stage1Handler),
      routesStage2(this.gateway, this.stage2Handler),
      routesStage3(this.gateway, this.stage3Handler),
    ];

    return this.endpoints;
  }
}
