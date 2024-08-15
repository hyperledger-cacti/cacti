import { Express, Request, Response } from "express";
import { HttpStatusCode } from "axios";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  HttpHeader,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import { PluginLedgerConnectorBesu } from "../plugin-ledger-connector-besu";

import OAS from "../../json/openapi.json";
import { RunTransactionRequest } from "../generated/openapi/typescript-axios";
import { isWeb3WebsocketProviderAbnormalClosureError } from "../common/is-web3-websocket-provider-abnormal-closure-error";

export interface IRunTransactionEndpointOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorBesu;
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

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/run-transaction"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/run-transaction"
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

  private handleLedgerNotAccessibleError(res: Response): void {
    const fn = "handleLedgerNotAccessibleError()";
    this.log.debug(
      "%s WebSocketProvider disconnected from ledger. Sending HttpStatusCode.ServiceUnavailable...",
      fn,
    );

    res
      .header(HttpHeader.RetryAfter, "5")
      .status(HttpStatusCode.ServiceUnavailable)
      .json({
        success: false,
        error: "Could not establish connection to the backing ledger.",
      });
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    const { log } = this;
    this.log.debug(reqTag);
    const reqBody: RunTransactionRequest = req.body;
    try {
      const resBody = await this.options.connector.transact(reqBody);
      res.json({ success: true, data: resBody });
    } catch (ex: unknown) {
      if (isWeb3WebsocketProviderAbnormalClosureError(ex)) {
        return this.handleLedgerNotAccessibleError(res);
      }
      const errorMsg = `request handler fn crashed for: ${reqTag}`;
      await handleRestEndpointException({ errorMsg, log, error: ex, res });
    }
  }
}
