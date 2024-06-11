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

export interface IRunDelegatedSignTransactionEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorFabric;
}

export class RunDelegatedSignTransactionEndpointV1
  implements IWebServiceEndpoint
{
  private readonly log: Logger;

  constructor(
    public readonly opts: IRunDelegatedSignTransactionEndpointV1Options,
  ) {
    const fnTag = "RunDelegatedSignTransactionEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: "run-delegated-sign-transaction-endpoint-v1",
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

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-delegated-sign-transaction"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-delegated-sign-transaction"
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

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "RunDelegatedSignTransactionEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      res
        .status(200)
        .json(await this.opts.connector.transactDelegatedSign(req.body));
    } catch (error) {
      this.log.error(`Crash while serving ${fnTag}`, error);
      res.status(500).json({
        message: "Internal Server Error",
        error: safeStringifyException(error),
      });
    }
  }
}
