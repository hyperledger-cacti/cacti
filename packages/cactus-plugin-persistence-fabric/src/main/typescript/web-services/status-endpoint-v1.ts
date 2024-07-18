/**
 * OpenAPI endpoint (GET) for reading status of the persistence plugin.
 */

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import type {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { PluginPersistenceFabric } from "../plugin-persistence-fabric";
import OAS from "../../json/openapi.json";

import type { Express, Request, Response } from "express";

export interface IStatusEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginPersistenceFabric;
}

/**
 * OpenAPI endpoint (GET) for reading status of the persistence plugin.
 */
export class StatusEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "StatusEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return StatusEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IStatusEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath(): any {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-persistence-fabric/status"
    ];
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cacti"].http.verbLowerCase;
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
      const resBody = this.options.connector.getStatus();
      res.status(200).json(resBody);
    } catch (ex) {
      const errorMsg = `Crash while serving ${reqTag}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
