import { AddressInfo } from "net";
import { Server } from "http";

import { exportPKCS8, generateKeyPair, KeyLike, exportSPKI } from "jose";
import { v4 as uuidv4 } from "uuid";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";

import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
  IPluginKeychain,
  Ledger,
  LedgerType,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";

import { PluginConsortiumManual } from "@hyperledger/cactus-plugin-consortium-manual";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";

import {
  PluginLedgerConnectorBesu,
  DefaultApi as BesuApi,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import {
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import {
  SupplyChainAppDummyInfrastructure,
  org1Env,
} from "./infrastructure/supply-chain-app-dummy-infrastructure";
import {
  Configuration,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { SupplyChainCactusPlugin } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { DiscoveryOptions } from "fabric-network";

export interface ISupplyChainAppOptions {
  disableSignalHandlers?: true;
  logLevel?: LogLevelDesc;
  keychain?: IPluginKeychain;
}

export type ShutdownHook = () => Promise<void>;
//TODO: Generate fabric connector and set in the pluginRegistry
export class SupplyChainApp {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  private readonly ledgers: SupplyChainAppDummyInfrastructure;
  public readonly keychain: IPluginKeychain;
  private _besuApiClient?: BesuApi;
  private _quorumApiClient?: QuorumApi;
  private _fabricApiClient?: FabricApi;

  public get besuApiClientOrThrow(): BesuApi {
    if (this._besuApiClient) {
      return this._besuApiClient;
    } else {
      throw new Error("Invalid state: ledgers were not started yet.");
    }
  }

  public get quorumApiClientOrThrow(): QuorumApi {
    if (this._quorumApiClient) {
      return this._quorumApiClient;
    } else {
      throw new Error("Invalid state: ledgers were not started yet.");
    }
  }

  public get fabricApiClientOrThrow(): FabricApi {
    if (this._fabricApiClient) {
      return this._fabricApiClient;
    } else {
      throw new Error("Invalid state: ledgers were not started yet.");
    }
  }

  public constructor(public readonly options: ISupplyChainAppOptions) {
    const fnTag = "SupplyChainApp#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel } = options;

    const level = logLevel || "INFO";
    const label = "supply-chain-app";
    this.log = LoggerProvider.getOrCreate({ level, label });

    if (this.options.keychain) {
      this.keychain = this.options.keychain;
      this.log.info("Reusing the provided keychain plugin...");
    } else {
      this.log.info("Instantiating new keychain plugin...");
      this.keychain = new PluginKeychainMemory({
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel: this.options.logLevel || "INFO",
      });
    }
    this.log.info("KeychainID=%o", this.keychain.getKeychainId());

    this.ledgers = new SupplyChainAppDummyInfrastructure({
      logLevel,
      keychain: this.keychain,
    });
    this.shutdownHooks = [];
  }

  public async start(): Promise<IStartInfo> {
    this.log.debug(`Starting SupplyChainApp...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((callback: IAsyncExitHookDoneCallback) => {
        this.stop().then(callback);
      });
      this.log.debug(`Registered signal handlers for graceful auto-shutdown`);
    }

    await this.ledgers.start();
    this.onShutdown(() => this.ledgers.stop());

    const contractsInfo = await this.ledgers.deployContracts();

    const besuAccount = await this.ledgers.besu.createEthTestAccount();
    await this.keychain.set(besuAccount.address, besuAccount.privateKey);
    const quorumAccount = await this.ledgers.quorum.createEthTestAccount();
    await this.keychain.set(quorumAccount.address, quorumAccount.privateKey);

    const enrollAdminOut = await this.ledgers.fabric.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await this.ledgers.fabric.enrollUser(adminWallet);
    const fabricUserKeychainKey = "user2";
    const fabricUserKeychainValue = JSON.stringify(userIdentity);
    await this.keychain.set(fabricUserKeychainKey, fabricUserKeychainValue);

    // Reserve the ports where the Cactus nodes will run API servers, GUI
    const httpApiA = await Servers.startOnPort(4000, "0.0.0.0");
    const httpApiB = await Servers.startOnPort(4100, "0.0.0.0");
    const httpApiC = await Servers.startOnPort(4200, "0.0.0.0");
    const httpGuiA = await Servers.startOnPort(3000, "0.0.0.0");
    const httpGuiB = await Servers.startOnPort(3100, "0.0.0.0");
    const httpGuiC = await Servers.startOnPort(3200, "0.0.0.0");

    const addressInfoA = httpApiA.address() as AddressInfo;
    const nodeApiHostA = `http://localhost:${addressInfoA.port}`;

    const addressInfoB = httpApiB.address() as AddressInfo;
    const nodeApiHostB = `http://localhost:${addressInfoB.port}`;

    const addressInfoC = httpApiC.address() as AddressInfo;
    const nodeApiHostC = `http://localhost:${addressInfoC.port}`;

    const besuConfig = new Configuration({ basePath: nodeApiHostA });
    const quorumConfig = new Configuration({ basePath: nodeApiHostB });
    const fabricConfig = new Configuration({ basePath: nodeApiHostC });

    const besuApiClient = new BesuApi(besuConfig);
    const quorumApiClient = new QuorumApi(quorumConfig);
    const fabricApiClient = new FabricApi(fabricConfig);

    const keyPairA = await generateKeyPair("ES256K");
    const keyPairPemA = await exportPKCS8(keyPairA.privateKey);

    const keyPairB = await generateKeyPair("ES256K");
    const keyPairPemB = await exportPKCS8(keyPairB.privateKey);

    const keyPairC = await generateKeyPair("ES256K");
    const keyPairPemC = await exportPKCS8(keyPairC.privateKey);

    const consortiumDatabase = await this.createConsortium(
      httpApiA,
      httpApiB,
      httpApiC,
      keyPairA.publicKey,
      keyPairB.publicKey,
      keyPairC.publicKey,
    );
    const consortiumPrettyJson = JSON.stringify(consortiumDatabase, null, 4);
    this.log.info(`Created Consortium definition: %o`, consortiumPrettyJson);

    this.log.info(`Configuring Cactus Node for Ledger A...`);
    const rpcApiHostA = await this.ledgers.besu.getRpcApiHttpHost();
    const rpcApiWsHostA = await this.ledgers.besu.getRpcApiWsHost();
    const rpcApiHostB = await this.ledgers.quorum.getRpcApiHttpHost();

    const connectionProfile = await this.ledgers.fabric.getConnectionProfileOrg1();
    const sshConfig = await this.ledgers.fabric.getSshConfig();

    const registryA = new PluginRegistry({
      plugins: [
        new PluginConsortiumManual({
          instanceId: "PluginConsortiumManual_A",
          consortiumDatabase,
          keyPairPem: keyPairPemA,
          logLevel: this.options.logLevel,
        }),
        new SupplyChainCactusPlugin({
          logLevel: this.options.logLevel,
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          quorumApiClient,
          fabricApiClient,
          web3SigningCredential: {
            keychainEntryKey: besuAccount.address,
            keychainId: this.keychain.getKeychainId(),
            type: Web3SigningCredentialType.CactusKeychainRef,
          },
        }),
        this.keychain,
      ],
    });

    const connectorBesu = new PluginLedgerConnectorBesu({
      instanceId: "PluginLedgerConnectorBesu_A",
      rpcApiHttpHost: rpcApiHostA,
      rpcApiWsHost: rpcApiWsHostA,
      pluginRegistry: registryA,
      logLevel: this.options.logLevel,
    });

    registryA.add(connectorBesu);

    const apiServerA = await this.startNode(httpApiA, httpGuiA, registryA);

    this.log.info(`Configuring Cactus Node for Ledger B...`);

    const registryB = new PluginRegistry({
      plugins: [
        new PluginConsortiumManual({
          instanceId: "PluginConsortiumManual_B",
          consortiumDatabase,
          keyPairPem: keyPairPemB,
          logLevel: this.options.logLevel,
        }),
        new SupplyChainCactusPlugin({
          logLevel: this.options.logLevel,
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          quorumApiClient,
          fabricApiClient,
          web3SigningCredential: {
            keychainEntryKey: quorumAccount.address,
            keychainId: this.keychain.getKeychainId(),
            type: Web3SigningCredentialType.CactusKeychainRef,
          },
        }),
        this.keychain,
      ],
    });

    const quorumConnector = new PluginLedgerConnectorQuorum({
      instanceId: "PluginLedgerConnectorQuorum_B",
      rpcApiHttpHost: rpcApiHostB,
      logLevel: this.options.logLevel,
      pluginRegistry: registryB,
    });

    registryB.add(quorumConnector);

    const apiServerB = await this.startNode(httpApiB, httpGuiB, registryB);

    this.log.info(`Configuring Cactus Node for Ledger C...`);

    const registryC = new PluginRegistry({
      plugins: [
        new PluginConsortiumManual({
          instanceId: "PluginConsortiumManual_C",
          consortiumDatabase,
          keyPairPem: keyPairPemC,
          logLevel: "INFO",
        }),
        new SupplyChainCactusPlugin({
          logLevel: "INFO",
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          quorumApiClient,
          fabricApiClient,
          fabricEnvironment: org1Env,
        }),
        this.keychain,
      ],
    });

    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const fabricConnector = new PluginLedgerConnectorFabric({
      instanceId: "PluginLedgerConnectorFabric_C",
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "peer",
      cliContainerEnv: org1Env,
      connectionProfile: connectionProfile,
      sshConfig: sshConfig,
      logLevel: "INFO",
      pluginRegistry: registryC,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    });

    registryC.add(fabricConnector);

    const apiServerC = await this.startNode(httpApiC, httpGuiC, registryC);

    return {
      apiServerA,
      apiServerB,
      apiServerC,
      besuApiClient,
      fabricApiClient,
      quorumApiClient,
      supplyChainApiClientA: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA }),
      ),
      supplyChainApiClientB: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA }),
      ),
      supplyChainApiClientC: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA }),
      ),
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

  public async createConsortium(
    serverA: Server,
    serverB: Server,
    serverC: Server,
    keyPairA: KeyLike,
    keyPairB: KeyLike,
    keyPairC: KeyLike,
  ): Promise<ConsortiumDatabase> {
    const consortiumName = "Example Supply Chain Consortium";
    const consortiumId = uuidv4();

    const memberIdA = uuidv4();
    const nodeIdA = uuidv4();
    const addressInfoA = serverA.address() as AddressInfo;
    const nodeApiHostA = `http://localhost:${addressInfoA.port}`;

    const publickKeyPemA = await exportSPKI(keyPairA);
    const cactusNodeA: CactusNode = {
      nodeApiHost: nodeApiHostA,
      memberId: memberIdA,
      publicKeyPem: publickKeyPemA,
      consortiumId,
      id: nodeIdA,
      pluginInstanceIds: [],
      ledgerIds: [],
    };

    const memberA: ConsortiumMember = {
      id: memberIdA,
      nodeIds: [cactusNodeA.id],
      name: "Example Manufacturer Corp",
    };

    const ledger1 = {
      id: "BesuDemoLedger",
      ledgerType: LedgerType.Besu1X,
    };
    cactusNodeA.ledgerIds.push(ledger1.id);

    const memberIdB = uuidv4();
    const nodeIdB = uuidv4();
    const addressInfoB = serverB.address() as AddressInfo;
    const nodeApiHostB = `http://localhost:${addressInfoB.port}`;

    const publickKeyPemB = await exportSPKI(keyPairB);
    const cactusNodeB: CactusNode = {
      nodeApiHost: nodeApiHostB,
      memberId: memberIdB,
      publicKeyPem: publickKeyPemB,
      consortiumId,
      id: nodeIdB,
      pluginInstanceIds: [],
      ledgerIds: [],
    };

    const memberB: ConsortiumMember = {
      id: memberIdB,
      nodeIds: [cactusNodeB.id],
      name: "Example Retailer Corp",
    };

    const ledger2: Ledger = {
      id: "QuorumDemoLedger",
      ledgerType: LedgerType.Quorum2X,
    };

    cactusNodeB.ledgerIds.push(ledger2.id);

    const memberIdC = uuidv4();
    const nodeIdC = uuidv4();
    const addressInfoC = serverC.address() as AddressInfo;
    const nodeApiHostC = `http://localhost:${addressInfoC.port}`;

    const publickKeyPemC = await exportSPKI(keyPairC);
    const cactusNodeC: CactusNode = {
      nodeApiHost: nodeApiHostC,
      memberId: memberIdC,
      publicKeyPem: publickKeyPemC,
      consortiumId,
      id: nodeIdC,
      pluginInstanceIds: [],
      ledgerIds: [],
    };

    const memberC: ConsortiumMember = {
      id: memberIdC,
      nodeIds: [cactusNodeC.id],
      name: "TODO",
    };

    const ledger3: Ledger = {
      id: "FabricDemoLedger",
      ledgerType: LedgerType.Fabric14X,
    };

    cactusNodeC.ledgerIds.push(ledger3.id);

    const consortium: Consortium = {
      id: consortiumId,
      name: consortiumName,
      mainApiHost: nodeApiHostA,
      memberIds: [memberA.id, memberB.id, memberC.id],
    };

    const consortiumDatabase: ConsortiumDatabase = {
      cactusNode: [cactusNodeA, cactusNodeB, cactusNodeC],
      consortium: [consortium],
      consortiumMember: [memberA, memberB, memberC],
      ledger: [ledger1, ledger2, ledger3],
      pluginInstance: [],
    };

    return consortiumDatabase;
  }

  public async startNode(
    httpServerApi: Server,
    httpServerCockpit: Server,
    pluginRegistry: PluginRegistry,
  ): Promise<ApiServer> {
    const addressInfoApi = httpServerApi.address() as AddressInfo;
    const addressInfoCockpit = httpServerCockpit.address() as AddressInfo;

    const configService = new ConfigService();
    const config = await configService.getOrCreate();
    const properties = config.getProperties();

    properties.plugins = [];
    properties.configFile = "";
    properties.apiPort = addressInfoApi.port;
    properties.apiHost = addressInfoApi.address;
    properties.cockpitEnabled = true;
    properties.cockpitHost = addressInfoCockpit.address;
    properties.cockpitPort = addressInfoCockpit.port;
    properties.grpcPort = 0; // TODO - make this configurable as well
    properties.logLevel = this.options.logLevel || "INFO";

    const apiServer = new ApiServer({
      config: properties,
      httpServerApi,
      httpServerCockpit,
      pluginRegistry,
    });

    this.onShutdown(() => apiServer.shutdown());

    await apiServer.start();

    return apiServer;
  }
}

export interface IStartInfo {
  readonly apiServerA: ApiServer;
  readonly apiServerB: ApiServer;
  readonly apiServerC: ApiServer;
  readonly besuApiClient: BesuApi;
  readonly quorumApiClient: QuorumApi;
  readonly fabricApiClient: FabricApi;
  readonly supplyChainApiClientA: SupplyChainApi;
  readonly supplyChainApiClientB: SupplyChainApi;
  readonly supplyChainApiClientC: SupplyChainApi;
}
