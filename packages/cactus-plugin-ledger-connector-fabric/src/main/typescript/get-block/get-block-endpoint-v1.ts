import { Express, Request, Response } from "express";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorFabric } from "../plugin-ledger-connector-fabric";
import OAS from "../../json/openapi.json";

export interface IGetBlockEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorFabric;
}

export class GetBlockEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly opts: IGetBlockEndpointV1Options) {
    const fnTag = "GetBlockEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: "get-block-endpoint-v1",
      level: opts.logLevel || "INFO",
    });
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

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-block"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-block"
    ];
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().post.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetBlockEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      res.status(200).send(await this.opts.connector.getBlock(req.body));
    } catch (error) {
      this.log.error(`Crash while serving ${fnTag}`, error);
      res.status(500).json({
        message: "Internal Server Error",
        error: safeStringifyException(error),
      });
    }
  }
}
