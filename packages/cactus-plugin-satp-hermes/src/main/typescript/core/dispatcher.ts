import {
  Checks,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import routesStage1 from "./stage-services/stage1-service";
import routesStage2 from "./stage-services/stage2-service";
import routesStage3 from "./stage-services/stage3-service";

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

  constructor(public readonly options: COREDispatcherOptions) {
    const fnTag = `${COREDispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
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

    this.endpoints = [routesStage1, routesStage2, routesStage3];

    return this.endpoints;
  }
}
