/**
 * OpenAPI endpoint (POST) for refreshing network structure in the database.
 */

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger-cacti/cactus-common";
import type {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core-api";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core";

import { PluginPersistenceFabric } from "../plugin-persistence-fabric";
import OAS from "../../json/openapi.json";

import type { Express, Request, Response } from "express";

export interface IDiscoverNetworkEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginPersistenceFabric;
}

/**
 * OpenAPI endpoint (GET) for reading status of the persistence plugin.
 */
export class DiscoverNetworkEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DiscoverNetworkEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return DiscoverNetworkEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IDiscoverNetworkEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath(): any {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger-cacti/cactus-plugin-persistence-fabric/discover-network"
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
    return this.getOasPath().get.operationId;
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

  public async handleRequest(_req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);

    try {
      await this.options.connector.discoverNetwork();
      res.status(200).json({
        status: true,
        message: "Discovery done.",
      });
    } catch (ex) {
      const errorMsg = `Crash while serving ${reqTag}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
