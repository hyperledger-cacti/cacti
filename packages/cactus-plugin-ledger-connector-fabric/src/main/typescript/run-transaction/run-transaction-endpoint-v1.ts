import { Express, Request, Response } from "express";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { PluginLedgerConnectorFabric } from "../plugin-ledger-connector-fabric";
import OAS from "../../json/openapi.json";

export interface IRunTransactionEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorFabric;
}

export class RunTransactionEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "RunTransactionEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return RunTransactionEndpointV1.CLASS_NAME;
  }

  constructor(public readonly opts: IRunTransactionEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: "run-transaction-endpoint-v1",
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

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction"
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
    const fnTag = `${this.className}#handleRequest()`;
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    const reqTag = `${verbUpper} ${this.getPath()}`;
    this.log.debug(reqTag);

    try {
      res.status(200).json(await this.opts.connector.transact(req.body));
    } catch (ex) {
      const errorMsg = `${fnTag} request handler fn crashed for: ${reqTag}`;
      await handleRestEndpointException({
        errorMsg,
        log: this.log,
        error: ex,
        res,
      });
    }
  }
}
