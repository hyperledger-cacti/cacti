import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express } from "express";
import bodyParser from "body-parser";

import {
  ConsortiumDatabase,
  IPluginWebService,
  PluginAspect,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { GetConsortiumEndpointV1 } from "./consortium/get-consortium-jws-endpoint-v1";
import { GetNodeJwsEndpoint } from "./consortium/get-node-jws-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./consortium/get-prometheus-exporter-metrics-endpoint-v1";
export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginConsortiumManualOptions extends ICactusPluginOptions {
  keyPairPem: string;
  consortiumDatabase: ConsortiumDatabase;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
}

export class PluginConsortiumManual
  implements ICactusPlugin, IPluginWebService {
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly instanceId: string;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginConsortiumManualOptions) {
    const fnTag = `PluginConsortiumManual#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.consortiumDatabase,
      `${fnTag} options.consortiumDatabase`,
    );
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-consortium-manual",
    });
    this.instanceId = this.options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.setNodeCount(this.getNodeCount());
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getNodeCount(): number {
    const consortiumDatabase: ConsortiumDatabase = this.options
      .consortiumDatabase;
    const consortiumRepo: ConsortiumRepository = new ConsortiumRepository({
      db: consortiumDatabase,
    });
    return consortiumRepo.allNodes.length;
  }

  /**
   * Updates the Node count Prometheus metric of the plugin.
   * Note: This does not change the underlying consortium database at all,
   * only affects **the metrics**.
   */
  public updateMetricNodeCount(): void {
    const constortiumDatabase: ConsortiumDatabase = this.options
      .consortiumDatabase;
    const consortiumRepo: ConsortiumRepository = new ConsortiumRepository({
      db: constortiumDatabase,
    });
    this.prometheusExporter.setNodeCount(consortiumRepo.allNodes.length);
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  public async installWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);
    const webApp: Express = this.options.webAppOptions ? express() : expressApp;

    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on
    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err?: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const { consortiumDatabase, keyPairPem } = this.options;
    const consortiumRepo = new ConsortiumRepository({
      db: consortiumDatabase,
    });

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const options = { keyPairPem, consortiumRepo };
      const endpoint = new GetConsortiumEndpointV1(options);
      const path = endpoint.getPath();
      webApp.get(path, endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered GetConsortiumEndpointV1 at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetNodeJwsEndpoint(options);
      const path = endpoint.getPath();
      webApp.get(path, endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered GetNodeJwsEndpoint at ${path}`);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    log.info(`Installed web svcs for plugin ${this.getPackageName()} OK`, {
      endpoints,
    });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-consortium-manual`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.CONSORTIUM;
  }
}
