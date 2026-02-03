import type { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger-cacti/cactus-core-api";
import {
  Logger,
  Checks,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger-cacti/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger-cacti/cactus-core";

import OAS from "../../json/openapi-bundled.json";
import { IRequestOptions } from "../types";

export class GetSessionsDataEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetSessionsDataEndpointV1EndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return GetSessionsDataEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.infrastructure, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getPath(): string {
    const apiPath =
      OAS.paths[
        "/api/v1/@hyperledger-cacti/cactus-example-cbdc/get-sessions-references"
      ];
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath =
      OAS.paths[
        "/api/v1/@hyperledger-cacti/cactus-example-cbdc/get-sessions-references"
      ];
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger-cacti/cactus-example-cbdc/get-sessions-references"
    ].get.operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
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

  // TODO discover way to inherit OAS schema and have request types here
  // parameter checks should be enforced by the type system
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      const result = await this.options.infrastructure.getSessionsData(
        req.query.Ledger as string,
      );
      res.status(200).json(result);
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
