import type { Express, Request, Response } from "express";
import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorIroha } from "../plugin-ledger-connector-iroha";

import OAS from "../../json/openapi.json";

export interface IGenerateTransactionEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorIroha;
}

export class GenerateTransactionEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GenerateTransactionEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return GenerateTransactionEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IGenerateTransactionEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/generate-transaction"
    ];
  }

  public getPath(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOasPath();
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.getOasPath().post.operationId;
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
      res.send(this.options.connector.generateTransaction(req.body));
    } catch (error) {
      this.log.error(`Crash while serving ${reqTag}:`, error);

      if (error instanceof Error) {
        let status = 500;
        let message = "Internal Server Error";

        if (error.message.includes("Bad Request")) {
          status = 400;
          message = "Bad Request Error";
        }

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

/**
 * TODO
 * Review main plugin (not done yet)
 */
