import { Express, Request, Response } from "express";

import {
  registerWebServiceEndpoint,
  handleRestEndpointException,
} from "@hyperledger/cactus-core";

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
} from "@hyperledger/cactus-common";

import { PluginLedgerConnectorIroha2 } from "../plugin-ledger-connector-iroha2";

export interface IGetPrometheusExporterMetricsEndpointV1Options {
  connector: PluginLedgerConnectorIroha2;
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

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha2/get-prometheus-exporter-metrics"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha2/get-prometheus-exporter-metrics"
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

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetPrometheusExporterMetrics#handleRequest()";
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    const verbUpper = this.getVerbLowerCase().toUpperCase();
    this.log.debug(`${verbUpper} ${this.getPath()}`);

    try {
      const resBody =
        await this.options.connector.getPrometheusExporterMetrics();
      res.status(200);
      res.send(resBody);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} failed to serve request:`;

      await handleRestEndpointException({
        errorMsg,
        log: this.log,
        error: ex,
        res,
      });
    }
  }
}
