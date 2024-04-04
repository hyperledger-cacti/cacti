import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  ICrpcSvcRegistration,
  IPluginCrpcService,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import OAS from "../json/openapi.json";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { Express } from "express";

import { GetPrometheusExporterMetricsEndpointV1 } from "./get-prometheus-exporter-metrics/get-prometheus-exporter-metrics-endpoint-v1";
import { SetKeychainEntryV1Endpoint } from "./web-services/set-keychain-entry-endpoint-v1";
import { GetKeychainEntryV1Endpoint } from "./web-services/get-keychain-entry-endpoint-v1";
import { DeleteKeychainEntryV1Endpoint } from "./web-services/delete-keychain-entry-endpoint-v1";
import { HasKeychainEntryV1Endpoint } from "./web-services/has-keychain-entry-endpoint-v1";
import { DefaultService } from "./generated/crpc/services/default_service_connect";
import { KeychainMemoryCrpcSvcOpenApi } from "./crpc-services/keychain-memory-crpc-svc-openapi";
import { ServiceType } from "@bufbuild/protobuf";

export interface IPluginKeychainMemoryOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  backend?: Map<string, string>;
  keychainId: string;
  prometheusExporter?: PrometheusExporter;
}

export class PluginKeychainMemory
  implements IPluginCrpcService, IPluginKeychain, IPluginWebService
{
  public static readonly CLASS_NAME = "PluginKeychainMemory";

  private readonly backend: Map<string, string>;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return PluginKeychainMemory.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainMemoryOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    this.backend = opts.backend || new Map();
    Checks.truthy(this.backend, `${fnTag} arg options.backend`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.startMetricsCollection();

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
    this.log.warn(
      `Never use ${this.className} in production. ` +
        `It does not support encryption. It stores everything in plain text.`,
    );
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

  public async createCrpcSvcRegistrations(): Promise<
    ICrpcSvcRegistration<ServiceType>[]
  > {
    const out: ICrpcSvcRegistration<ServiceType>[] = [];

    const implementation = new KeychainMemoryCrpcSvcOpenApi({
      keychain: this,
      logLevel: this.opts.logLevel,
    });

    const crpcSvcRegistration: ICrpcSvcRegistration<ServiceType> = {
      definition: DefaultService,
      serviceName: DefaultService.typeName,
      implementation,
    };
    out.push(crpcSvcRegistration);
    return out;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [
      new SetKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new GetKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new DeleteKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new HasKeychainEntryV1Endpoint({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
      new GetPrometheusExporterMetricsEndpointV1({
        plugin: this,
        logLevel: this.opts.logLevel,
      }),
    ];

    this.endpoints = endpoints;

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-memory`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async get(key: string): Promise<string> {
    const value = this.backend.get(key);
    if (value) {
      return value;
    } else {
      throw new Error(`Keychain entry for "${key}" not found.`);
    }
  }

  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.backend.set(key, value);
    this.prometheusExporter.setTotalKeyCounter(this.backend.size);
  }

  async delete(key: string): Promise<void> {
    this.backend.delete(key);
    this.prometheusExporter.setTotalKeyCounter(this.backend.size);
  }
}
