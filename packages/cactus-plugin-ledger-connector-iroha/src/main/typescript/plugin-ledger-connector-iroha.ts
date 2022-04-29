import { Server } from "http";
import { Server as SecureServer } from "https";
import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";

import type { Express } from "express";

import { IrohaTransactionWrapper } from "./iroha-transaction-wrapper";

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
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { RuntimeError } from "run-time-error";

import {
  RunTransactionRequestV1,
  RunTransactionResponse,
  IrohaSocketSessionEvent,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { IrohaSocketIOEndpoint } from "./web-services/iroha-socketio-endpoint";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.iroha.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcToriiPortHost: string; //http host:port
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
  instanceId: string;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionRequestV1,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly pluginRegistry: PluginRegistry;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";
  private socketSessionDictionary: { [char: string]: IrohaSocketIOEndpoint };

  public get className(): string {
    return PluginLedgerConnectorIroha.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIrohaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(
      options.rpcToriiPortHost,
      `${fnTag} options.rpcToriiPortHost`,
    );
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
    this.socketSessionDictionary = {};
    this.prometheusExporter.startMetricsCollection();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  deployContract(): Promise<never> {
    throw new RuntimeError("Method not implemented.");
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

  public async onPluginInit(): Promise<unknown> {
    return;
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
      let irohaSocketEndpoint: IrohaSocketIOEndpoint;

      if (socket.id in this.socketSessionDictionary) {
        this.log.debug(`Connected to existing socket session ID=${socket.id}`);
        irohaSocketEndpoint = this.socketSessionDictionary[socket.id];
      } else {
        this.log.debug(`New Socket connected. ID=${socket.id}`);
        irohaSocketEndpoint = new IrohaSocketIOEndpoint({ socket, logLevel });
        this.socketSessionDictionary[socket.id] = irohaSocketEndpoint;
      }

      let monitorFlag: boolean;

      socket.on(IrohaSocketSessionEvent.Subscribe, (monitorOptions: any) => {
        this.log.debug(`Caught event: Subscribe`);
        monitorFlag = true;
        irohaSocketEndpoint.startMonitor(monitorOptions);
      });

      socket.on(IrohaSocketSessionEvent.Unsubscribe, () => {
        this.log.debug(`Caught event: Unsubscribe`);
        irohaSocketEndpoint.stopMonitor();
      });

      socket.on(
        IrohaSocketSessionEvent.SendAsyncRequest,
        (asyncRequestData: any) => {
          this.log.debug(`Caught event: SendAsyncRequest`);
          irohaSocketEndpoint.sendRequest(asyncRequestData, true);
        },
      );

      socket.on(
        IrohaSocketSessionEvent.SendSyncRequest,
        (syncRequestData: any) => {
          this.log.debug(`Caught event: SendSyncRequest`);
          irohaSocketEndpoint.sendRequest(syncRequestData, false);
        },
      );

      socket.on("disconnect", async (reason: string) => {
        this.log.info(`Session: ${socket.id} disconnected. Reason: ${reason}`);
        if (monitorFlag) {
          irohaSocketEndpoint.stopMonitor();
          monitorFlag = false;
        }
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
      const endpoint = new RunTransactionEndpoint({
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
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha`;
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

  public async transact(
    req: RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    const transaction = new IrohaTransactionWrapper({
      logLevel: this.options.logLevel,
    });
    return await transaction.transact(req);
  }
}
