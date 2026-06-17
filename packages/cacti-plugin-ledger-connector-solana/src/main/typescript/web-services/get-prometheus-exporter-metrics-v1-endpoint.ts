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

export interface IGetPrometheusExporterMetricsEndpointV1Options {
  connector: PluginLedgerConnectorSolana;
  logLevel?: LogLevelDesc;
}

export class GetPrometheusExporterMetricsEndpointV1
  implements IWebServiceEndpoint
{
  public static readonly CLASS_NAME = "GetPrometheusExporterMetricsEndpointV1";
  private readonly log: Logger;

  constructor(
    public readonly options: IGetPrometheusExporterMetricsEndpointV1Options,
  ) {
    const fnTag = `${GetPrometheusExporterMetricsEndpointV1.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);
    this.log = LoggerProvider.getOrCreate({
      level: options.logLevel ?? "INFO",
      label: "get-prometheus-exporter-metrics-endpoint",
    });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana/get-prometheus-exporter-metrics"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana/get-prometheus-exporter-metrics"
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
    return { get: async () => ({ isProtected: true, requiredRoles: [] }) };
  }

  public async registerExpress(app: Express): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(app, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(_req: Request, res: Response): Promise<void> {
    const fnTag = "GetPrometheusExporterMetrics#handleRequest()";
    this.log.debug(`GET ${this.getPath()}`);
    try {
      res
        .status(200)
        .send(await this.options.connector.getPrometheusExporterMetrics());
    } catch (ex) {
      this.log.error(`Crash while serving ${fnTag}`, ex);
      res.status(500).json({ error: safeStringifyException(ex) });
    }
  }
}
