import type { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import { PluginLedgerConnectorCDL } from "../plugin-ledger-connector-cdl";
import OAS from "../../json/openapi.json";

export interface ISearchLineageByHeaderOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorCDL;
}

export class SearchLineageByHeaderEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "SearchLineageByHeaderEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return SearchLineageByHeaderEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: ISearchLineageByHeaderOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-cdl/search-lineage-by-header"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-cdl/search-lineage-by-header"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
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

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      res
        .status(200)
        .json(await this.options.connector.searchLineageByHeader(req.body));
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);

      res.status(500).json({
        message: "Internal Server Error",
        error: safeStringifyException(ex),
      });
    }
  }
}
