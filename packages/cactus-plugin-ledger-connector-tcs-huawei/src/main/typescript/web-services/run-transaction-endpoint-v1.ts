import { Express, Request, Response } from "express";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorTcsHuawei } from "../plugin-ledger-connector-tcs-huawei";
import { RunTransactionRequest } from "../generated/openapi/typescript-axios/api";
import OAS from "../../json/openapi.json";

export interface IRunTransactionEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorTcsHuawei;
}

export class RunTransactionEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly opts: IRunTransactionEndpointV1Options) {
    this.log = LoggerProvider.getOrCreate({
      label: "run-transaction-endpoint-v1",
      level: opts.logLevel || "INFO",
    });
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
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

  public get oasPath(): typeof OAS.paths["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-tcs/run-transaction"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-tcs/run-transaction"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "RunTransactionEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const reqBody = req.body as RunTransactionRequest;
      const resBody = await this.opts.connector.transact(reqBody);
      res.status(200);
      res.json(resBody);
    } catch (ex) {
      if (ex instanceof Error) {
        this.log.error(`${fnTag} failed to serve request`, ex);
        res.status(500);
        res.statusMessage = ex.message;
        res.json({ error: ex.stack });
      } else {
      }
    }
  }
}
