import type { Express } from "express";
import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  StatusResponseV1,
  WatchBlocksV1,
  WatchBlocksV1Options,
} from "./generated/openapi/typescript-axios";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { StatusEndpointV1 } from "./web-services/status-endpoint-v1";
import OAS from "../json/openapi.json";
import { Configuration, DefaultApi as SawtoothRestApi } from "./sawtooth-api";

export interface IPluginLedgerConnectorSawtoothOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  sawtoothRestApiEndpoint: string;
  watchBlocksPollTime?: number;
}

export class PluginLedgerConnectorSawtooth
  implements
    IPluginLedgerConnector<never, never, never, never>,
    ICactusPlugin,
    IPluginWebService
{
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private runningWatchBlocksMonitors = new Set<WatchBlocksV1Endpoint>();
  private sawtoothApiClient: SawtoothRestApi;

  public get className(): string {
    return "PluginLedgerConnectorSawtooth";
  }

  constructor(public readonly options: IPluginLedgerConnectorSawtoothOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.sawtoothRestApiEndpoint,
      `${fnTag} arg options.sawtoothRestApiEndpoint`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;

    this.sawtoothApiClient = new SawtoothRestApi(
      new Configuration({ basePath: this.options.sawtoothRestApiEndpoint }),
    );
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
    this.runningWatchBlocksMonitors.forEach((m) => m.close());
    this.runningWatchBlocksMonitors.clear();
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    // Register WatchBlocksV1Endpoint on SocketIO
    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(
        WatchBlocksV1.Subscribe,
        async (options?: WatchBlocksV1Options) => {
          const watchBlocksEndpoint = new WatchBlocksV1Endpoint({
            socket,
            sawtoothApiClient: this.sawtoothApiClient,
            options,
            pollTime: this.options.watchBlocksPollTime,
          });
          this.runningWatchBlocksMonitors.add(watchBlocksEndpoint);
          await watchBlocksEndpoint.subscribe();
          this.log.debug(
            "Running WatchBlocksMonitors count:",
            this.runningWatchBlocksMonitors.size,
          );

          socket.on("disconnect", () => {
            this.runningWatchBlocksMonitors.delete(watchBlocksEndpoint);
            this.log.debug(
              "Running monitors count:",
              this.runningWatchBlocksMonitors.size,
            );
          });
        },
      );
    });

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];

    {
      const endpoint = new StatusEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-sawtooth`;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   * @warn Not implemented!
   */
  deployContract(): Promise<never> {
    throw new Error("Method not implemented.");
  }

  /**
   * @warn Not implemented!
   */
  transact(): Promise<never> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get this connector status and response of /status endpoint from Sawtooth REST API.
   *
   * @returns StatusResponseV1
   */
  async getStatus(): Promise<StatusResponseV1> {
    const openApiSpecVersion =
      (this.getOpenApiSpec() as Record<string, any>)?.info?.version ??
      "unknown";

    const status = await this.sawtoothApiClient.statusGet();

    return {
      instanceId: this.instanceId,
      openApiSpecVersion,
      initialized: Boolean(this.endpoints),
      sawtoothStatus: status.data.data,
    };
  }
}
