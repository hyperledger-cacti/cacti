import type { Express, Request, Response } from "express";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  Checks,
  Logger,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { IRequestOptions } from "../core/types";

export class HealthCheckEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "HealthCheckEndpointV1";
  private readonly log: Logger;

  public get className(): string {
    return HealthCheckEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);
    const level = "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getPath(): string {
    return "/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck";
  }

  public getVerbLowerCase(): string {
    return "get";
  }

  public getOperationId(): string {
    return "HealthCheck";
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: false,
        requiredRoles: [],
      }),
    };
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      res.status(200).json({ status: "OK" });
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
