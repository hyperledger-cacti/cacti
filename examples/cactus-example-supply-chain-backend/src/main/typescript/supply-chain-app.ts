import { AddressInfo } from "net";
import { Server } from "http";

import { JWK } from "jose";
import { v4 as uuidv4 } from "uuid";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";

import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
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

import { SupplyChainAppDummyInfrastructure } from "./infrastructure/supply-chain-app-dummy-infrastructure";
import { SupplyChainCactusPlugin } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

export interface ISupplyChainAppOptions {
  logLevel?: LogLevelDesc;
}

export type ShutdownHook = () => Promise<void>;

export class SupplyChainApp {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  private readonly ledgers: SupplyChainAppDummyInfrastructure;

  public constructor(public readonly options: ISupplyChainAppOptions) {
    const fnTag = "SupplyChainApp#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel } = options;

    this.ledgers = new SupplyChainAppDummyInfrastructure({ logLevel });
    this.shutdownHooks = [];

    const level = logLevel || "INFO";
    const label = "supply-chain-app";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async start(): Promise<void> {
    this.log.debug(`Starting SupplyChainApp...`);

    exitHook((callback: IAsyncExitHookDoneCallback) => {
      this.stop().then(callback);
    });

    await this.ledgers.start();
    this.onShutdown(() => this.ledgers.stop());

    const contractsInfo = await this.ledgers.deployContracts();

    const besuAccount = await this.ledgers.besu.createEthTestAccount();
    const quorumAccount = await this.ledgers.quorum.createEthTestAccount();

    const keychainIdA = "PluginKeychainMemory_A";
    const keychainIdB = "PluginKeychainMemory_B";

    // Reserve the ports where the Cactus nodes will run API servers, GUI
    const httpApiA = await Servers.startOnPort(4000, "0.0.0.0");
    const httpApiB = await Servers.startOnPort(4100, "0.0.0.0");
    const httpGuiA = await Servers.startOnPort(3000, "0.0.0.0");
    const httpGuiB = await Servers.startOnPort(3100, "0.0.0.0");

    const addressInfoA = httpApiA.address() as AddressInfo;
    const nodeApiHostA = `http://localhost:${addressInfoA.port}`;

    const addressInfoB = httpApiB.address() as AddressInfo;
    const nodeApiHostB = `http://localhost:${addressInfoB.port}`;

    const besuApiClient = new BesuApi({ basePath: nodeApiHostA });
    const quorumApiClient = new QuorumApi({ basePath: nodeApiHostB });

    const keyPairA = await JWK.generate("EC", "secp256k1");
    const keyPairPemA = keyPairA.toPEM(true);

    const keyPairB = await JWK.generate("EC", "secp256k1");
    const keyPairPemB = keyPairB.toPEM(true);

    const consortiumDatabase = this.createConsortium(
      httpApiA,
      httpApiB,
      keyPairA,
      keyPairB,
    );
    const consortiumPrettyJson = JSON.stringify(consortiumDatabase, null, 4);
    this.log.info(`Created Consortium definition: %o`, consortiumPrettyJson);

    this.log.info(`Configuring Cactus Node for Ledger A...`);
    const rpcApiHostA = await this.ledgers.besu.getRpcApiHttpHost();
    const rpcApiHostB = await this.ledgers.quorum.getRpcApiHttpHost();

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
          web3SigningCredential: {
            keychainEntryKey: besuAccount.address,
            keychainId: keychainIdA,
            type: Web3SigningCredentialType.CACTUSKEYCHAINREF,
          },
        }),
        new PluginKeychainMemory({
          instanceId: uuidv4(),
          keychainId: keychainIdA,
          backend: new Map([[besuAccount.address, besuAccount.privateKey]]),
        }),
      ],
    });

    const connectorBesu = new PluginLedgerConnectorBesu({
      instanceId: "PluginLedgerConnectorBesu_A",
      rpcApiHttpHost: rpcApiHostA,
      pluginRegistry: registryA,
      logLevel: this.options.logLevel,
    });

    registryA.add(connectorBesu);

    await this.startNode(httpApiA, httpGuiA, registryA);

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
          web3SigningCredential: {
            keychainEntryKey: quorumAccount.address,
            keychainId: keychainIdB,
            type: Web3SigningCredentialType.CACTUSKEYCHAINREF,
          },
        }),
        new PluginKeychainMemory({
          instanceId: uuidv4(),
          keychainId: keychainIdB,
          backend: new Map([[quorumAccount.address, quorumAccount.privateKey]]),
        }),
      ],
    });

    const quorumConnector = new PluginLedgerConnectorQuorum({
      instanceId: "PluginLedgerConnectorQuorum_B",
      rpcApiHttpHost: rpcApiHostB,
      logLevel: this.options.logLevel,
      pluginRegistry: registryB,
    });

    registryB.add(quorumConnector);

    await this.startNode(httpApiB, httpGuiB, registryB);
  }

  public async stop(): Promise<void> {
    for (const hook of this.shutdownHooks) {
      await hook(); // FIXME add timeout here so that shutdown does not hang
    }
  }

  public onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  public createConsortium(
    serverA: Server,
    serverB: Server,
    keyPairA: JWK.ECKey,
    keyPairB: JWK.ECKey,
  ): ConsortiumDatabase {
    const consortiumName = "Example Supply Chain Consortium";
    const consortiumId = uuidv4();

    const memberIdA = uuidv4();
    const nodeIdA = uuidv4();
    const addressInfoA = serverA.address() as AddressInfo;
    const nodeApiHostA = `http://localhost:${addressInfoA.port}`;

    const cactusNodeA: CactusNode = {
      nodeApiHost: nodeApiHostA,
      memberId: memberIdA,
      publicKeyPem: keyPairA.toPEM(false),
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
      ledgerType: LedgerType.BESU1X,
    };
    cactusNodeA.ledgerIds.push(ledger1.id);

    const memberIdB = uuidv4();
    const nodeIdB = uuidv4();
    const addressInfoB = serverB.address() as AddressInfo;
    const nodeApiHostB = `http://localhost:${addressInfoB.port}`;

    const cactusNodeB: CactusNode = {
      nodeApiHost: nodeApiHostB,
      memberId: memberIdB,
      publicKeyPem: keyPairB.toPEM(false),
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
      ledgerType: LedgerType.QUORUM2X,
    };

    cactusNodeB.ledgerIds.push(ledger2.id);

    const consortium: Consortium = {
      id: consortiumId,
      name: consortiumName,
      mainApiHost: nodeApiHostA,
      memberIds: [memberA.id, memberB.id],
    };

    const consortiumDatabase: ConsortiumDatabase = {
      cactusNode: [cactusNodeA, cactusNodeB],
      consortium: [consortium],
      consortiumMember: [memberA, memberB],
      ledger: [ledger1, ledger2],
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
    const config = configService.getOrCreate();
    const properties = config.getProperties();

    properties.plugins = [];
    properties.configFile = "";
    properties.apiPort = addressInfoApi.port;
    properties.apiHost = addressInfoApi.address;
    properties.cockpitHost = addressInfoCockpit.address;
    properties.cockpitPort = addressInfoCockpit.port;
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
