import { Express } from "express";
import { importPKCS8, GeneralSign } from "jose";
import jsonStableStringify from "json-stable-stringify";
import { v4 as uuidv4 } from "uuid";

import OAS from "../json/openapi.json";

import {
  ConsortiumDatabase,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  JWSGeneral,
  JWSRecipient,
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

import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";
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
  ctorArgs?: Record<string, unknown>;
}

export class PluginConsortiumManual
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginConsortiumManual";
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly instanceId: string;
  private readonly repo: ConsortiumRepository;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return PluginConsortiumManual.CLASS_NAME;
  }

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
    this.repo = new ConsortiumRepository({ db: options.consortiumDatabase });

    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });

    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.startMetricsCollection();
    this.prometheusExporter.setNodeCount(this.getNodeCount());
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getNodeCount(): number {
    Checks.truthy(this.repo, `${this.className}.this.repo`);
    return this.repo.allNodes.length;
  }

  /**
   * Updates the Node count Prometheus metric of the plugin.
   * Note: This does not change the underlying consortium database at all,
   * only affects **the metrics**.
   */
  public updateMetricNodeCount(): void {
    const nodeCount = this.getNodeCount();
    this.prometheusExporter.setNodeCount(nodeCount);
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    log.info(`Creating web services for plugin ${pkgName}...`);
    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on

    const { keyPairPem } = this.options;
    const consortiumRepo = this.repo;

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetConsortiumEndpointV1(options);
      endpoints.push(endpoint);
      const path = endpoint.getPath();
      this.log.info(`Instantiated GetConsortiumEndpointV1 at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetNodeJwsEndpoint(options);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    this.endpoints = endpoints;

    log.info(`Instantiated web svcs for plugin ${pkgName} OK`, { endpoints });
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-consortium-manual`;
  }

  public async getNodeJws(): Promise<JWSGeneral> {
    Checks.truthy(this.repo, `${this.className}.this.repo`);
    const { keyPairPem } = this.options;

    this.updateMetricNodeCount();
    const keyPair = await importPKCS8(keyPairPem, "ES256K");
    const payloadObject = { consortiumDatabase: this.repo.consortiumDatabase };
    const payloadJson = jsonStableStringify(payloadObject);
    const _protected = {
      iat: Date.now(),
      jti: uuidv4(),
      iss: "Hyperledger Cactus",
    };
    // TODO: double check if this casting is safe (it is supposed to be)
    const encoder = new TextEncoder();
    const sign = new GeneralSign(encoder.encode(payloadJson));
    sign
      .addSignature(keyPair)
      .setProtectedHeader({ alg: "ES256K", _protected });
    const jwsGeneral = await sign.sign();
    return jwsGeneral as JWSGeneral;
  }

  public async getConsortiumJws(): Promise<JWSGeneral> {
    const nodes = this.repo.allNodes;

    const ctorArgs = this.options.ctorArgs || {};

    const requests = nodes
      .map((cnm) => cnm.nodeApiHost)
      .map(function (host) {
        // overwrite basePath with node api host
        ctorArgs.basePath = host;
        // return the ApiClient configuration object
        return new Configuration(ctorArgs);
      })
      .map((configuration) => new DefaultApi(configuration))
      .map((apiClient) => apiClient.getNodeJwsV1());

    const responses = await Promise.all(requests);

    const signatures: JWSRecipient[] = [];

    responses
      .map((apiResponse) => apiResponse.data)
      .map((getNodeJwsResponse) => getNodeJwsResponse.jws)
      .forEach((aJws: JWSGeneral) =>
        aJws.signatures.forEach((signature) => signatures.push(signature)),
      );

    const [response] = responses;
    const jws = response.data.jws;
    jws.signatures = signatures;
    return jws;
  }
}
