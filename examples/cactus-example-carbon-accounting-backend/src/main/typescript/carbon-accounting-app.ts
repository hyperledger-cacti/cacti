import { AddressInfo } from "net";
import { Server } from "http";
import { Server as SecureServer } from "https";

import { v4 as uuidv4 } from "uuid";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";

import {
  ApiServer,
  ConfigService,
  Configuration,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { CarbonAccountingPlugin } from "@hyperledger/cactus-example-carbon-accounting-business-logic-plugin";

import {
  PluginLedgerConnectorXdai,
  DefaultApi as XdaiApi,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-xdai";

import { CarbonAccountingAppDummyInfrastructure } from "./infrastructure/carbon-accounting-app-dummy-infrastructure";

export interface ICarbonAccountingAppOptions {
  logLevel?: LogLevelDesc;
  keychainId?: string;
  keychain?: PluginKeychainMemory;
  apiServerOptions?: ICactusApiServerOptions;
  httpApi?: Server | SecureServer;
  httpGui?: Server | SecureServer;
  disableSignalHandlers?: true;
}

export type ShutdownHook = () => Promise<void>;
export class CarbonAccountingApp {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  private readonly ledgers: CarbonAccountingAppDummyInfrastructure;
  private readonly keychainId: string;
  private readonly keychain: PluginKeychainMemory;

  public constructor(public readonly options: ICarbonAccountingAppOptions) {
    const fnTag = "CarbonAccountingApp#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel, keychainId } = options;

    const level = logLevel || "INFO";
    const label = "carbon-accounting-app";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.keychainId = keychainId || uuidv4();

    this.shutdownHooks = [];
    this.keychain =
      options.keychain ||
      new PluginKeychainMemory({
        keychainId: this.keychainId,
        instanceId: uuidv4(),
        logLevel: logLevel || "INFO",
      });

    this.ledgers = new CarbonAccountingAppDummyInfrastructure({
      logLevel: logLevel || "INFO",
      keychain: this.keychain,
    });
  }

  public async start(): Promise<void> {
    this.log.debug(`Starting Carbon Accounting App...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((callback: IAsyncExitHookDoneCallback) => {
        this.stop().then(callback);
      });
      this.log.debug(`Registered signal handlers for graceful auto-shutdown`);
    }

    await this.ledgers.start();
    this.onShutdown(() => this.ledgers.stop());

    const xdaiAccount = await this.ledgers.xdai.createEthTestAccount();

    const sshConfig = await this.ledgers.fabric.getSshConfig();
    const connectionProfile = await this.ledgers.fabric.getConnectionProfileOrg1();
    const enrollAdminOut = await this.ledgers.fabric.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await this.ledgers.fabric.enrollUser(adminWallet);
    const keychainEntryKey = "fabric_user2";
    const keychainEntryValue = JSON.stringify(userIdentity);
    await this.keychain.set(keychainEntryKey, keychainEntryValue);

    let httpApi;
    if (this.options.httpApi) {
      httpApi = this.options.httpApi;
    } else {
      httpApi = await Servers.startOnPort(4000, "0.0.0.0");
    }

    let httpGui;
    if (this.options.httpGui) {
      httpGui = this.options.httpGui;
    } else {
      httpGui = await Servers.startOnPort(3000, "0.0.0.0");
    }

    const addressInfo = httpApi.address() as AddressInfo;
    const nodeApiHost = `http://localhost:${addressInfo.port}`;

    const config = new Configuration({ basePath: nodeApiHost });

    const xdaiApiClient = new XdaiApi(config);
    const fabricApiClient = new FabricApi(config);

    this.log.info(`Configuring Cactus Node for Ledger A...`);
    const rpcApiHostA = await this.ledgers.xdai.getRpcApiHttpHost();

    await this.keychain.set(xdaiAccount.address, xdaiAccount.privateKey);

    const pluginRegistry = new PluginRegistry({ plugins: [this.keychain] });

    const fabricPlugin = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: pluginRegistry,
      cliContainerEnv: this.ledgers.org1Env,
      sshConfig,
      connectionProfile,
      logLevel: this.options.logLevel || "INFO",
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    });

    const xdaiPlugin = new PluginLedgerConnectorXdai({
      instanceId: "PluginLedgerConnectorBesu_A",
      rpcApiHttpHost: rpcApiHostA,
      pluginRegistry: pluginRegistry,
      logLevel: this.options.logLevel || "INFO",
    });

    const xdaiContracts = await this.ledgers.deployXdaiContracts(
      xdaiPlugin,
      this.keychain,
    );

    const fabricContracts = await this.ledgers.deployFabricContracts(
      this.keychain,
      fabricPlugin,
    );

    const businessLogicPlugin = new CarbonAccountingPlugin({
      logLevel: this.options.logLevel || "INFO",
      xdaiContracts,
      fabricContracts,
      fabricPlugin,
      pluginRegistry,
      keychainId: this.keychainId,
      instanceId: uuidv4(),
      xdaiApiClient,
      fabricApiClient,
      web3SigningCredential: {
        keychainEntryKey: xdaiAccount.address,
        keychainId: this.keychainId,
        type: Web3SigningCredentialType.CactusKeychainRef,
      },
    });

    pluginRegistry.add(xdaiPlugin);
    pluginRegistry.add(fabricPlugin);
    pluginRegistry.add(businessLogicPlugin);

    await this.startNode(httpApi, httpGui, pluginRegistry);
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
    httpServerCockpit: Server,
    pluginRegistry: PluginRegistry,
  ): Promise<ApiServer> {
    const addressInfoApi = httpServerApi.address() as AddressInfo;
    const addressInfoCockpit = httpServerCockpit.address() as AddressInfo;

    let config;
    if (this.options.apiServerOptions) {
      config = this.options.apiServerOptions;
    } else {
      const configService = new ConfigService();
      const convictConfig = await configService.getOrCreate();
      config = convictConfig.getProperties();
      config.plugins = [];
      config.configFile = "";
      config.apiPort = addressInfoApi.port;
      config.apiHost = addressInfoApi.address;
      config.cockpitHost = addressInfoCockpit.address;
      config.cockpitPort = addressInfoCockpit.port;
      config.grpcPort = 0; // TODO - make this configurable as well
      config.logLevel = this.options.logLevel || "INFO";
    }

    const apiServer = new ApiServer({
      config,
      httpServerApi,
      httpServerCockpit,
      pluginRegistry,
    });

    this.onShutdown(() => apiServer.shutdown());

    await apiServer.start();

    return apiServer;
  }
}
