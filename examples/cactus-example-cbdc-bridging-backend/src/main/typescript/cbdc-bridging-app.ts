import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  IListenOptions,
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";
import {
  Configuration,
  SATPGateway,
} from "@hyperledger/cactus-plugin-satp-hermes/";
import { CbdcBridgingAppDummyInfrastructure } from "./infrastructure/cbdc-bridging-app-dummy-infrastructure";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DefaultApi as BesuApi } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import express from "express";
import bodyParser from "body-parser";
import http, { Server } from "http";
import { Constants } from "@hyperledger/cactus-core-api";
import cors from "cors";

import { Server as SocketIoServer } from "socket.io";

export interface ICbdcBridgingApp {
  apiHost: string;
  apiServer1Port: number;
  apiServer2Port: number;
  apiGateway1ServerPort: number;
  apiGateway1ClientPort: number;
  apiGateway1BloPort: number;
  apiGateway2ServerPort: number;
  apiGateway2ClientPort: number;
  apiGateway2BloPort: number;


  logLevel?: LogLevelDesc;
  apiServerOptions?: ICactusApiServerOptions;
  disableSignalHandlers?: true;
}

interface ICrpcOptions {
  host: string;
  port: number;
}

export type ShutdownHook = () => Promise<void>;
export class CbdcBridgingApp {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  readonly infrastructure: CbdcBridgingAppDummyInfrastructure;

  public constructor(public readonly options: ICbdcBridgingApp) {
    const fnTag = "CbdcBridgingApp#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel } = options;

    const level = logLevel || "INFO";
    const label = "cbdc-bridging-app";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.shutdownHooks = [];

    this.infrastructure = new CbdcBridgingAppDummyInfrastructure({
      logLevel: level,
    });
  }

  public async start()/*: Promise<IStartInfo> */{
    this.log.debug(`Starting CBDC Bridging App...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((callback: IAsyncExitHookDoneCallback) => {
        this.stop().then(callback);
      });
      this.log.debug(`Registered signal handlers for graceful auto-shutdown`);
    }

    await this.infrastructure.start();
    this.onShutdown(() => this.infrastructure.stop());
    this.log.info("Creating Fabric Connector");
    const fabricPlugin =
      await this.infrastructure.createFabricLedgerConnector();
    this.log.info("Creating Besu Connector");
    const besuPlugin = await this.infrastructure.createBesuLedgerConnector();

    let addressInfoA: AddressInfo;
    let addressInfoB: AddressInfo;

    // Reserve the ports where the API Servers will run
    {
      const expressApp = express();
      expressApp.use(cors());
      expressApp.use(bodyParser.json({ limit: "250mb" }));
      const fabricServer = http.createServer(expressApp);

      const listenOptions: IListenOptions = {
        hostname: this.options.apiHost,
        port: this.options.apiServer1Port,
        server: fabricServer,
      };
      addressInfoA = (await Servers.listen(listenOptions)) as AddressInfo;
          
      await fabricPlugin.getOrCreateWebServices();
      await fabricPlugin.registerWebServices(expressApp);

    }

  {    
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    expressApp.use(cors());
    const besuServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: this.options.apiHost,
      port: this.options.apiServer2Port,
      server: besuServer,
    };
    addressInfoB = (await Servers.listen(listenOptions)) as AddressInfo;
    await besuPlugin.getOrCreateWebServices();
    const wsApi = new SocketIoServer(besuServer, {
      path: Constants.SocketIoConnectionPathV1,
    });
    await besuPlugin.registerWebServices(expressApp, wsApi);
  }
   
    const nodeApiHostA = `http://${this.options.apiHost}:${addressInfoA.port}`;
    const nodeApiHostB = `http://${this.options.apiHost}:${addressInfoB.port}`;

    const fabricApiClient = new FabricApi(
      new Configuration({ basePath: nodeApiHostA }),
    );

    const besuApiClient = new BesuApi(
      new Configuration({ basePath: nodeApiHostB }),
    );

    this.log.info("Deploying chaincode and smart contracts...");

    await this.infrastructure.deployFabricSATPContract(fabricApiClient);

    await this.infrastructure.deployFabricWrapperContract(
      fabricApiClient,
    );
    this.log.info("Fabric Chaincode Deployed");
    await this.infrastructure.deployBesuContracts(besuApiClient);

    await this.infrastructure.initializeContractsAndAddPermitions(fabricApiClient, besuApiClient);

    this.log.info(`Chaincode and smart Contracts deployed.`);

    const gatways = await this.infrastructure.createSATPGateways();

    for(const gateway of gatways){
      await gateway.startup();
    }

    this.log.info(`SATP Gateways started.`);

    return {
      fabricApiClient,
      besuApiClient,
    };
  }

  public async stop(): Promise<void> {
    for (const hook of this.shutdownHooks) {
      await hook(); // FIXME add timeout here so that shutdown does not hang
    }
  }

  public onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  public async startNode(
    httpServerApi: Server,
    pluginRegistry: PluginRegistry,
    crpcOptions: ICrpcOptions,
  ): Promise<ApiServer> {
    this.log.info(`Starting API Server node...`);

    const addressInfoApi = httpServerApi.address() as AddressInfo;

    let config;
    if (this.options.apiServerOptions) {
      config = this.options.apiServerOptions;
    } else {
      const configService = new ConfigService();
      const convictConfig = await configService.getOrCreate();
      config = convictConfig.getProperties();
      config.configFile = "";
      config.apiCorsDomainCsv = `http://${process.env.API_HOST_FRONTEND}:${process.env.API_PORT_FRONTEND}`;
      config.cockpitCorsDomainCsv = `http://${process.env.API_HOST_FRONTEND}:${process.env.API_PORT_FRONTEND}`;
      config.apiPort = addressInfoApi.port;
      config.apiHost = addressInfoApi.address;
      config.grpcPort = 0;
      config.logLevel = this.options.logLevel || "INFO";
      config.authorizationProtocol = AuthorizationProtocol.NONE;
      config.crpcHost = crpcOptions.host;
      config.crpcPort = crpcOptions.port;
    }

    const apiServer = new ApiServer({
      config,
      httpServerApi,
      pluginRegistry,
    });

    this.onShutdown(() => apiServer.shutdown());

    await apiServer.start();

    return apiServer;
  }
}

export interface IStartInfo {
  readonly apiServer1: ApiServer;
  readonly apiServer2: ApiServer;
  //readonly fabricGatewayApi: SatpApi;
  //readonly besuGatewayApi: SatpApi;
  readonly besuApiClient: BesuApi;
  readonly fabricApiClient: FabricApi;
  readonly fabricSatpGateway: SATPGateway;
  readonly besuSatpGateway: SATPGateway;
}
