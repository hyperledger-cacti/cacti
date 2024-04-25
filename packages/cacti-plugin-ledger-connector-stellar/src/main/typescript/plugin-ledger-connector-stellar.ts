import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { InternalServerError } from "http-errors-enhanced-cjs";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { WatchBlocksV1 } from "./generated/openapi/typescript-axios";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import {
  GetOpenApiSpecV1Endpoint,
  IGetOpenApiSpecV1EndpointOptions,
} from "./web-services/get-open-api-spec-v1-endpoint";

export const E_KEYCHAIN_NOT_FOUND =
  "cacti.connector.stellar.keychain_not_found";

export interface IPluginLedgerConnectorStellarOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorStellar
  implements
    IPluginLedgerConnector<never, never, never, never>,
    ICactusPlugin,
    IPluginWebService
{
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly pluginRegistry: PluginRegistry;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public static readonly CLASS_NAME = "PluginLedgerConnectorStellar";

  public get className(): string {
    return PluginLedgerConnectorStellar.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorStellarOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
  }

  public async deployContract(): Promise<never> {
    throw new InternalServerError("Method not implemented.");
  }
  public async transact(): Promise<never> {
    throw new InternalServerError("Method not implemented.");
  }
  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    throw new InternalServerError("Method not implemented.");
  }
  public async hasTransactionFinality(): Promise<boolean> {
    throw new InternalServerError("Method not implemented.");
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<void> {
    this.log.info("ENTER onPluginInit();");
    this.log.info("EXIT onPluginInit();");
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const oasPath =
        OAS.paths[
          "/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-stellar/get-open-api-spec"
        ];

      const operationId = oasPath.get.operationId;
      const opts: IGetOpenApiSpecV1EndpointOptions = {
        oas: OAS,
        oasPath,
        operationId,
        path: oasPath.get["x-hyperledger-cacti"].http.path,
        pluginRegistry: this.pluginRegistry,
        verbLowerCase: oasPath.get["x-hyperledger-cacti"].http.verbLowerCase,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetOpenApiSpecV1Endpoint(opts);
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cacti-plugin-ledger-connector-stellar`;
  }
}
