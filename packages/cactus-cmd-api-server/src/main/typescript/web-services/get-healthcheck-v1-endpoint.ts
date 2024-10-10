import { StatusCodes } from "http-status-codes";
import type { Express, Request, Response } from "express";

import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  handleRestEndpointException,
  IHandleRestEndpointExceptionOptions,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

export interface IGetHealthcheckV1EndpointOptions {
  readonly logLevel?: LogLevelDesc;
  readonly process: NodeJS.Process;
}

export class GetHealthcheckV1Endpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetHealthcheckV1Endpoint";

  private readonly log: Logger;

  private readonly process: NodeJS.Process;

  public get className(): string {
    return GetHealthcheckV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IGetHealthcheckV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg opts`);
    Checks.truthy(opts.process, `${fnTag} arg opts.process`);

    this.process = opts.process;

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: this.oasPath.get.security[0].bearerTokenAuth,
      }),
    };
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/api-server/healthcheck"] {
    return OAS.paths["/api/v1/api-server/healthcheck"];
  }

  public getPath(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.get.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(_req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    const reqTag = `${verbUpper} ${this.getPath()}`;
    this.log.debug(reqTag);

    try {
      const memoryUsage = this.process.memoryUsage();
      const createdAt = new Date();
      const body = {
        success: true,
        createdAt,
        memoryUsage,
      };
      res.json(body).status(StatusCodes.OK);
    } catch (error) {
      const { log } = this;
      const errorMsg = `${fnTag} request handler fn crashed for: ${reqTag}`;

      const ctx: Readonly<IHandleRestEndpointExceptionOptions> = {
        errorMsg,
        log,
        error,
        res,
      };

      await handleRestEndpointException(ctx);
    }
  }
}
