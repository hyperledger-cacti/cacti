import { Server } from "http";
import { Server as SecureServer } from "https";
import { Config as SshConfig } from "node-ssh";
import { Express } from "express";

import OAS from "../json/openapi.json";

import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPluginOptions,
  ConsensusAlgorithmFamily,
} from "@hyperledger/cactus-core-api";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractJarsEndpoint } from "./web-services/deploy-contract-jars-endpoint";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  IInvokeContractEndpointV1Options,
  InvokeContractEndpointV1,
} from "./web-services/invoke-contract-endpoint-v1";
import {
  IListFlowsEndpointV1Options,
  ListFlowsEndpointV1,
} from "./web-services/list-flows-endpoint-v1";
import {
  INetworkMapEndpointV1Options,
  NetworkMapEndpointV1,
} from "./web-services/network-map-endpoint-v1";
import {
  IDiagnoseNodeEndpointV1Options,
  DiagnoseNodeEndpointV1,
} from "./web-services/diagnose-node-endpoint-v1";

import fs from "fs";

export interface IPluginLedgerConnectorCordaOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  sshConfigAdminShell: SshConfig;
  corDappsDir: string;
  prometheusExporter?: PrometheusExporter;
  cordaStartCmd?: string;
  cordaStopCmd?: string;
  apiUrl?: string;
  /**
   * Path to the file where the private key for the ssh configuration is located
   * This property is optional. Its use is not recommended for most cases, it will override the privateKey property of the sshConfigAdminShell.
   * @type {string}
   * @memberof IPluginLedgerConnectorCordaOptions
   */
  sshPrivateKeyPath?: string;
}

export class PluginLedgerConnectorCorda
  implements IPluginLedgerConnector<any, any, any, any>, IPluginWebService {
  public static readonly CLASS_NAME = "DeployContractJarsEndpoint";

  private readonly instanceId: string;
  private readonly log: Logger;
  public prometheusExporter: PrometheusExporter;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return DeployContractJarsEndpoint.CLASS_NAME;
  }

  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginLedgerConnectorCordaOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.sshConfigAdminShell, `${fnTag} sshConfigAdminShell`);
    Checks.truthy(options.instanceId, `${fnTag} instanceId`);

    const level = options.logLevel || "INFO";
    const label = "plugin-ledger-connector-corda";
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = this.options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.startMetricsCollection();
    // if privateKeyPath exists, overwrite privateKey in sshConfigAdminShell
    this.readSshPrivateKeyFromFile();
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

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-ledger-connector-corda";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public deployContract(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async transact(): Promise<any> {
    this.prometheusExporter.addCurrentTransaction();
    return null as any;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    // await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  private readSshPrivateKeyFromFile(): void {
    const { sshPrivateKeyPath } = this.options;
    if (sshPrivateKeyPath) {
      const fileContent = fs
        .readFileSync(sshPrivateKeyPath, "utf-8")
        .toString();
      this.options.sshConfigAdminShell.privateKey = fileContent;
    }
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const pkgName = this.getPackageName();
    this.log.info(`Instantiating web services for ${pkgName}...`);
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractJarsEndpoint({
        sshConfigAdminShell: this.options.sshConfigAdminShell,
        logLevel: this.options.logLevel,
        corDappsDir: this.options.corDappsDir,
        cordaStartCmd: this.options.cordaStartCmd,
        cordaStopCmd: this.options.cordaStopCmd,
        apiUrl: this.options.apiUrl,
      });

      endpoints.push(endpoint);
    }

    {
      const opts: IInvokeContractEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new InvokeContractEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IListFlowsEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new ListFlowsEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: INetworkMapEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new NetworkMapEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IDiagnoseNodeEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new DiagnoseNodeEndpointV1(opts);
      endpoints.push(endpoint);
    }

    this.log.info(`Instantiated endpoints of ${pkgName}`);
    return endpoints;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public async getFlowList(): Promise<string[]> {
    return ["getFlowList()_NOT_IMPLEMENTED"];
  }
}
