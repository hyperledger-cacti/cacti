import { AddressInfo } from "net";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import CryptoMaterial from "../../crypto-material/crypto-material.json";

import {
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
import { Server } from "http";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

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

  public async start() /*: Promise<IStartInfo> */ {
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
    const gatways = await this.infrastructure.createSATPGateways();


    this.log.info(`SATP Gateways started.`);
    // Reserve the ports where the API Servers will run
    const httpApiA = await Servers.startOnPort(
      this.options.apiServer1Port,
      this.options.apiHost,
    );
    const httpApiB = await Servers.startOnPort(
      this.options.apiServer2Port,
      this.options.apiHost,
    );
    const addressInfoA = httpApiA.address() as AddressInfo;
    const nodeApiHostA = `http://${this.options.apiHost}:${addressInfoA.port}`;

    const addressInfoB = httpApiB.address() as AddressInfo;
    const nodeApiHostB = `http://${this.options.apiHost}:${addressInfoB.port}`;

    const clientPluginRegistry = new PluginRegistry({
      plugins: [
        new PluginKeychainMemory({
          keychainId: CryptoMaterial.keychains.keychain1.id,
          instanceId: uuidv4(),
          logLevel: "INFO",
        }),
      ],
    });
    const serverPluginRegistry = new PluginRegistry({
      plugins: [
        new PluginKeychainMemory({
          keychainId: CryptoMaterial.keychains.keychain2.id,
          instanceId: uuidv4(),
          logLevel: "INFO",
        }),
      ],
    });

    clientPluginRegistry.add(fabricPlugin);
    clientPluginRegistry.add(gatways[0]);
    await gatways[0].onPluginInit();
    serverPluginRegistry.add(besuPlugin);
    serverPluginRegistry.add(gatways[1]);
    await gatways[1].onPluginInit();

    const crpcOptionsServer1 = {host: 'localhost', port: 6000};
    const apiServer1 = await this.startNode(httpApiA, clientPluginRegistry, crpcOptionsServer1, 5101);
    const crpcOptionsServer2 = {host: 'localhost', port: 6001};

    const apiServer2 = await this.startNode(httpApiB, serverPluginRegistry,crpcOptionsServer2, 5100);

    const fabricApiClient = new FabricApi(
      new Configuration({ basePath: nodeApiHostA }),
    );

    const besuApiClient = new BesuApi(
      new Configuration({ basePath: nodeApiHostB }),
    );

    this.infrastructure.setFabricApi(fabricApiClient);
    this.infrastructure.setBesuApi(besuApiClient);

    this.log.info("Deploying chaincode and smart contracts...");

    await this.infrastructure.deployFabricSATPContract();

    await this.infrastructure.deployFabricWrapperContract();
    this.log.info("Fabric Chaincode Deployed");
    await this.infrastructure.deployBesuContracts();

    await this.infrastructure.initializeContractsAndAddPermitions();

    this.log.info(`Chaincode and smart Contracts deployed.`);

    

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
    grpcPort: number,
  ): Promise<ApiServer> {
    this.log.info(`Starting API Server node...`);

    const addressInfoApi = httpServerApi.address() as AddressInfo;

    

    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfoApi.port;
    apiServerOptions.apiHost = addressInfoApi.address;
    apiServerOptions.logLevel = this.options.logLevel || "INFO";
    apiServerOptions.apiTlsEnabled = false;
    apiServerOptions.grpcPort = grpcPort;
    apiServerOptions.crpcHost = crpcOptions.host;
    apiServerOptions.crpcPort = crpcOptions.port;
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);
    const prop = config.getProperties();
    prop.grpcPort = grpcPort
    prop.apiPort = addressInfoApi.port;
    prop.crpcPort = crpcOptions.port;
    this.log.info(prop);
    const apiServer = new ApiServer({
      httpServerApi: httpServerApi,
      config: prop,
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
  readonly besuApiClient: BesuApi;
  readonly fabricApiClient: FabricApi;
  readonly fabricSatpGateway: SATPGateway;
  readonly besuSatpGateway: SATPGateway;
}
