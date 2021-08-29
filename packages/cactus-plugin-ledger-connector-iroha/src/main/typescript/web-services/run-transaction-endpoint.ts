import type { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  Http405NotAllowedError,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorIroha } from "../plugin-ledger-connector-iroha";

import OAS from "../../json/openapi.json";

export interface IRunTransactionEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorIroha;
}

export class RunTransactionEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "RunTransactionEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return RunTransactionEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IRunTransactionEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getOasPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/run-transaction"
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
    const reqBody = req.body;
    try {
      const resBody = await this.options.connector.transact(reqBody);
      res.json(resBody);
    } catch (ex) {
      if (ex instanceof Http405NotAllowedError) {
        this.log.debug("Sending back HTTP405 Method Not Allowed error.");
        res.status(405);
        res.json(ex);
        return;
      }
      /**
       * An example output of the error message looks like:
       * "Error: Error: Command response error: expected=COMMITTED, actual=REJECTED"
       * @see https://iroha.readthedocs.io/en/main/develop/api/commands.html?highlight=CallEngine#id18
       */
      if (ex.message.includes("Error: Command response error")) {
        this.log.debug("Sending back HTTP400 Bad Request error.");
        res.status(400);
        res.json(ex);
        return;
      }
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
