import {
  Checks,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import routesStage1 from "./stage-handlers/stage1-handler";
import routesStage2 from "./stage-handlers/stage2-handler";
import routesStage3 from "./stage-handlers/stage3-handler";
import { Stage1ServerService } from "./stage-services/server/stage1-server-service";
import { SATPGateway } from "../gateway-refactor";
import { Stage2ServerService } from "./stage-services/server/stage2-server-service";
import { Stage3ServerService } from "./stage-services/server/stage3-server-service";

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
  private readonly stage1Service: Stage1ServerService;
  private readonly stage2Service: Stage2ServerService;
  private readonly stage3Service: Stage3ServerService;

  constructor(
    public readonly options: COREDispatcherOptions,
    gateway: SATPGateway,
  ) {
    const fnTag = `${COREDispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);

    this.stage1Service = new Stage1ServerService();
    this.stage2Service = new Stage2ServerService();
    this.stage3Service = new Stage3ServerService();

    this.gateway = gateway;
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
      routesStage1(this.gateway, this.stage1Service),
      routesStage2(this.gateway, this.stage2Service),
      routesStage3(this.gateway, this.stage3Service),
    ];

    return this.endpoints;
  }
}
