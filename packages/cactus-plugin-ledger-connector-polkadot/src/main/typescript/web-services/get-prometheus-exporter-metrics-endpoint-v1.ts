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

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorPolkadot } from "../plugin-ledger-connector-polkadot";
import { InvokeContractEndpoint as Constants } from "./invoke-contract-endpoint-constants";

export interface IGetPrometheusExporterMetricsEndpointV1Options {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorPolkadot;
}

export class GetPrometheusExporterMetricsEndpointV1
  implements IWebServiceEndpoint {
  private readonly log: Logger;
  public static readonly CLASS_NAME = "InvokeContractEndpoint";

  constructor(
    public readonly opts: IGetPrometheusExporterMetricsEndpointV1Options,
  ) {
    const fnTag = "RunTransactionEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.connector, `${fnTag} options.connector`);

    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: opts.logLevel || "INFO",
    });
  }

  public get className(): string {
    return GetPrometheusExporterMetricsEndpointV1.CLASS_NAME;
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

  public getPath(): string {
    return Constants.HTTP_PATH;
  }

  public getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  public getOperationId(): string {
    throw new Error("Method not implemented.");
  }

  public get oasPath(): string {
    throw new Error("Method not implemented.");
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetPrometheusExporterMetrics#handleRequest()";
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);

    try {
      const resBody = await this.opts.connector.getPrometheusExporterMetrics();
      res.status(200);
      res.send(resBody);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex as string;
      res.json({ error: ex });
    }
  }
}
