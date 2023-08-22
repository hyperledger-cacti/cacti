import { Express, Request, Response } from "express";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Checks,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import { PluginLedgerConnectorEthereum } from "../plugin-ledger-connector-ethereum";

export interface IGetPrometheusExporterMetricsEndpointV1Options {
  connector: PluginLedgerConnectorEthereum;
  logLevel?: LogLevelDesc;
}

export class GetPrometheusExporterMetricsEndpointV1
  implements IWebServiceEndpoint
{
  private readonly log: Logger;

  constructor(
    public readonly options: IGetPrometheusExporterMetricsEndpointV1Options,
  ) {
    const fnTag = "GetPrometheusExporterMetricsEndpointV1#constructor()";

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);

    const label = "get-prometheus-exporter-metrics-endpoint";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/get-prometheus-exporter-metrics"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/get-prometheus-exporter-metrics"
    ];
  }

  public getPath(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.get.operationId;
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

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetPrometheusExporterMetrics#handleRequest()";
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);

    try {
      res
        .status(200)
        .send(await this.options.connector.getPrometheusExporterMetrics());
    } catch (ex) {
      this.log.error(`Crash while serving ${fnTag}`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: safeStringifyException(ex) });
    }
  }
}
