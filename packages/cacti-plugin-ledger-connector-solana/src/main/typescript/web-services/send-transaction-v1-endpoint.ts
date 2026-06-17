import { Express, Request, Response } from "express";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import OAS from "../../json/openapi.json";
import { PluginLedgerConnectorSolana } from "../plugin-ledger-connector-solana";

export interface ISendTransactionEndpointOptions {
  connector: PluginLedgerConnectorSolana;
  logLevel?: LogLevelDesc;
}

export class SendTransactionEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "SendTransactionEndpoint";
  private readonly log: Logger;

  public get className(): string {
    return SendTransactionEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: ISendTransactionEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);
    this.log = LoggerProvider.getOrCreate({
      level: options.logLevel ?? "INFO",
      label: this.className,
    });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana/send-transaction"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana/send-transaction"
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
    return { get: async () => ({ isProtected: true, requiredRoles: [] }) };
  }

  public async registerExpress(app: Express): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(app, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    try {
      res.json(await this.options.connector.sendTransaction(req.body));
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: safeStringifyException(ex),
      });
    }
  }
}
