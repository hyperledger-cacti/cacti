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
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginPersistenceEthereum } from "../plugin-persistence-ethereum";
import OAS from "../../json/openapi.json";

import type { Express, Request, Response } from "express";
import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";

export interface IStatusEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginPersistenceEthereum;
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
      "/api/v1/plugins/@hyperledger/cactus-plugin-persistence-ethereum/status"
    ];
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.get["x-hyperledger-cactus"].http.verbLowerCase;
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

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);

    try {
      const resBody = this.options.connector.getStatus();
      res.status(200).json(resBody);
    } catch (error: unknown) {
      this.log.error(`Crash while serving ${reqTag}:`, error);

      if (error instanceof Error) {
        const status = 500;
        const message = "Internal Server Error";
        this.log.info(`${message} [${status}]`);
        res.status(status).json({
          message,
          error: sanitizeHtml(error.stack || error.message, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        });
      } else {
        this.log.warn("Unexpected exception that is not instance of Error!");
        res.status(500).json({
          message: "Unexpected Error",
          error: sanitizeHtml(safeStringify(error), {
            allowedTags: [],
            allowedAttributes: {},
          }),
        });
      }
    }
  }
}
