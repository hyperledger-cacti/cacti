/*
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
*/
import {
  // Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  // IPluginWebService,
  IWebServiceEndpoint,
  // ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  // PluginLedgerConnectorFabric,
  // FabricContractInvocationType,
  // DefaultEventHandlerStrategy,
  // FabricSigningCredential,
  FabricApiClient,
  GatewayOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

// import type { Express } from "express";
// import { StatusEndpointV1 } from "./web-services/status-endpoint-v1";
import PostgresDatabaseClient from "./db-client/db-client";

import OAS from "../json/openapi.json";

export interface IPluginPersistenceFabricBlockOptions
  extends ICactusPluginOptions {
  gatewayOptions: GatewayOptions;
  apiClient: FabricApiClient;
  connectionString: string;
  logLevel: LogLevelDesc;
}

export class PluginPersistenceFabric {
  // implements ICactusPlugin, IPluginWebService
  private log: Logger;
  public static readonly CLASS_NAME = "PluginPersistenceFabricBlock";
  private dbClient: PostgresDatabaseClient;
  private readonly instanceId: string;
  private apiClient: FabricApiClient;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private isConnected = false;
  private isWebServicesRegistered = false;

  constructor(public readonly options: IPluginPersistenceFabricBlockOptions) {
    const level = this.options.logLevel || "INFO";
    const label = PluginPersistenceFabric.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.apiClient = options.apiClient;
    this.dbClient = new PostgresDatabaseClient({
      connectionString: options.connectionString,
      logLevel: level,
    });
  }

  public async shutdown(): Promise<void> {
    this.apiClient.close();
    await this.dbClient.shutdown();
    this.isConnected = false;
  }

  // public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
  // const { log } = this;
  // const pkgName = this.getPackageName();
  // if (this.endpoints) {
  //   return this.endpoints;
  // }
  // log.info(`Creating web services for plugin ${pkgName}...`);
  // const endpoints: IWebServiceEndpoint[] = [];
  // {
  //   const endpoint = new StatusEndpointV1({
  //     connector: this,
  //     logLevel: this.options.logLevel,
  //   });
  //   endpoints.push(endpoint);
  // }
  // this.endpoints = endpoints;
  // log.info(`Instantiated web services for plugin ${pkgName} OK`, {
  //   endpoints,
  // });
  // return endpoints;
  // }

  // public async registerWebServices(
  //   app: Express,
  // ): Promise<IWebServiceEndpoint[]> {
  //   const webServices = await this.getOrCreateWebServices();
  //   webServices.forEach((ws) => ws.registerExpress(app));
  //   this.isWebServicesRegistered = true;
  //   return webServices;
  // }
  public getStatus(): any {
    // return {
    //   instanceId: this.instanceId,
    //   connected: this.isConnected,
    //   webServicesRegistered: this.isWebServicesRegistered,
    //   monitoredTokensCount: this.monitoredTokens.size,
    //   operationsRunning: Array.from(this.trackedOperations.values()),
    //   monitorRunning: this.watchBlocksSubscription !== undefined,
    //   lastSeenBlock: this.lastSeenBlock,
    // };
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-persistence-fabric-block`;
  }

  /**
   * Get OpenAPI definition for this plugin.
   * @returns OpenAPI spec object
   */
  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async onPluginInit(): Promise<void> {
    await this.dbClient.connect();
    await this.dbClient.initializePlugin(
      PluginPersistenceFabric.CLASS_NAME,
      this.instanceId,
    );
    this.isConnected = true;
  }

  /**
   * name
   */
  /*
  public async insertBlockData(data: Record<string, unknown>): Promise<void> {
    console.log(data);
    const test = this.dbClient.insertBlockDataEntry({
      id: data.id,
      blocknum: data.blocknum,
      datahash: data.datahash,
      prehash: data.prehash,
      txcount: data.txcount,
      createdat: data.createdat,
      prev_blockhash: data.prev_blockhash,
      blockhash: data.blockhash,
      channel_genesis_hash: data.channel_genesis_hash,
      blksize: data.blksize,
      network_name: data.network_name,
    });
    this.log.warn(test);
    return test;
  }*/
}
