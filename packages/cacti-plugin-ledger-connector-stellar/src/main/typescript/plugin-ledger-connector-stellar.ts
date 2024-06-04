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

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  DeployContractV1Request,
  DeployContractV1Response,
  RunSorobanTransactionRequest,
  RunSorobanTransactionResponse,
  WatchBlocksV1,
} from "./generated/openapi/typescript-axios";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import {
  GetOpenApiSpecV1Endpoint,
  IGetOpenApiSpecV1EndpointOptions,
} from "./web-services/get-open-api-spec-v1-endpoint";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { deployContract, invokeContract } from "./core/contract-engine";
import { convertApiTransactionInvocationToStellarPlus } from "./utils";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { DeployContractEndpoint } from "./web-services/deploy-contract-endpoint";
import { RunSorobanTransactionEndpoint } from "./web-services/run-soroban-transaction-endpoint";

export const E_KEYCHAIN_NOT_FOUND =
  "cacti.connector.stellar.keychain_not_found";

export interface IPluginLedgerConnectorStellarOptions
  extends ICactusPluginOptions {
  networkConfig: NetworkConfig;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorStellar
  implements
    IPluginLedgerConnector<
      DeployContractV1Request,
      DeployContractV1Response,
      RunSorobanTransactionRequest,
      RunSorobanTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService
{
  private networkConfig: NetworkConfig;
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly pluginRegistry: PluginRegistry;
  public prometheusExporter: PrometheusExporter;

  public static readonly CLASS_NAME = "PluginLedgerConnectorStellar";

  public get className(): string {
    return PluginLedgerConnectorStellar.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorStellarOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.networkConfig, `${fnTag} options.networkConfig`);

    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    this.networkConfig = options.networkConfig;

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

  public async deployContract(
    req: DeployContractV1Request,
  ): Promise<DeployContractV1Response> {
    // const { logLevel } = this.options;

    const wasm = req.wasmBuffer
      ? { wasmBuffer: Buffer.from(req.wasmBuffer, "base64") }
      : { wasmHash: req.wasmHash as string };

    const response = await deployContract({
      ...wasm,
      txInvocation: convertApiTransactionInvocationToStellarPlus(
        req.transactionInvocation,
        this.networkConfig,
      ),
      networkConfig: this.networkConfig,
      fnLogPrefix: this.className,
    });

    this.prometheusExporter.addCurrentTransaction();
    return response;
  }

  public async runSorobanTransaction(
    req: RunSorobanTransactionRequest,
  ): Promise<RunSorobanTransactionResponse> {
    const invokeArgs = {
      ...req,
      methodArgs: req.methodArgs ?? {},
      networkConfig: this.networkConfig,
      readOnly: !!req.readOnly,
      fnLogPrefix: this.className,
      txInvocation: convertApiTransactionInvocationToStellarPlus(
        req.transactionInvocation,
        this.networkConfig,
      ),
    };

    const result =
      await invokeContract<typeof invokeArgs.methodArgs>(invokeArgs);

    this.prometheusExporter.addCurrentTransaction();
    return { result } as RunSorobanTransactionResponse;
  }

  public async transact(
    req: RunSorobanTransactionRequest,
  ): Promise<RunSorobanTransactionResponse> {
    return this.runSorobanTransaction(req);
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
      const endpoint = new DeployContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RunSorobanTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
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
