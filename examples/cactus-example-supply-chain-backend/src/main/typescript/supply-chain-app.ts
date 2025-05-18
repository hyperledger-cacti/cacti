import { AddressInfo } from "net";
import { Server } from "http";

import {
  exportPKCS8,
  generateKeyPair,
  KeyLike,
  exportSPKI,
  SignJWT,
} from "jose";
import expressJwt from "express-jwt";

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
  IJoseFittingJwtParams,
} from "@hyperledger/cactus-common";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  IAuthorizationConfig,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginConsortiumManual } from "@hyperledger/cactus-plugin-consortium-manual";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorXdai,
  Web3SigningCredentialType,
  DefaultApi as XdaiApi,
} from "@hyperledger/cactus-plugin-ledger-connector-xdai";

import {
  PluginLedgerConnectorBesu,
  DefaultApi as BesuApi,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import {
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1 } from "@hyperledger/cactus-test-tooling";

import { SupplyChainAppDummyInfrastructure } from "./infrastructure/supply-chain-app-dummy-infrastructure";
import {
  Configuration,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { SupplyChainCactusPlugin } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { DiscoveryOptions } from "fabric-network";

/**
 * The log pattern message that will be printed on stdout when the
 * Supply Chain Application finished booting (it can take a long time).
 */
export const SUPPLY_CHAIN_APP_OK_LOG_MSG_PATTERN =
  "Cacti API Server - REST API reachable at:";

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
  private _xdaiApiClient?: XdaiApi;
  private _fabricApiClient?: FabricApi;
  private authorizationConfig?: IAuthorizationConfig;
  private token?: string;

  public get besuApiClientOrThrow(): BesuApi {
    if (this._besuApiClient) {
      return this._besuApiClient;
    } else {
      throw new Error("Invalid state: ledgers were not started yet.");
    }
  }

  public get xdaiApiClientOrThrow(): XdaiApi {
    if (this._xdaiApiClient) {
      return this._xdaiApiClient;
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

  async getOrCreateToken(): Promise<string> {
    if (!this.token) {
      await this.createAuthorizationConfig();
    }
    return this.token as string;
  }

  async getOrCreateAuthorizationConfig(): Promise<IAuthorizationConfig> {
    if (!this.authorizationConfig) {
      await this.createAuthorizationConfig();
    }
    return this.authorizationConfig as IAuthorizationConfig;
  }

  async createAuthorizationConfig(): Promise<void> {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPrivateKeyPem = await exportPKCS8(jwtKeyPair.privateKey);
    const expressJwtOptions: expressJwt.Params & IJoseFittingJwtParams = {
      algorithms: ["RS256"],
      secret: jwtPrivateKeyPem,
      audience: uuidv4(),
      issuer: uuidv4(),
    };

    const jwtPayload = { name: "Peter", location: "London" };
    this.token = await new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: "RS256",
      })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    this.authorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions: {
        secret: jwtPrivateKeyPem,
      },
    };
  }

  public async start(): Promise<IStartInfo> {
    this.log.debug(`Starting SupplyChainApp...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((onHookDone: IAsyncExitHookDoneCallback) => {
        this.log.info("Starting async-exit-hook for supply-chain-app ...");
        this.stop()
          .catch((ex: unknown) => {
            this.log.warn("Failed async-exit-hook for supply-chain-app", ex);
            throw ex;
          })
          .finally(() => {
            this.log.info("Concluded async-exit-hook for supply-chain-app ...");
            onHookDone();
          });
        this.log.info("Started async-exit-hook for supply-chain-app OK");
      });
      this.log.info("Registered async-exit-hook for supply-chain-app shutdown");
    }

    this.onShutdown(async () => {
      this.log.info("SupplyChainApp onShutdown() - stopping ledgers...");
      await this.ledgers.stop();
      this.log.info("SupplyChainApp onShutdown() - stopped ledgers OK");
    });
    await this.ledgers.start();

    const contractsInfo = await this.ledgers.deployContracts();

    const besuAccount = await this.ledgers.besu.createEthTestAccount();
    await this.keychain.set(besuAccount.address, besuAccount.privateKey);
    const xdaiBesuAccount = await this.ledgers.xdaiBesu.createEthTestAccount();
    await this.keychain.set(
      xdaiBesuAccount.address,
      xdaiBesuAccount.privateKey,
    );

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
    const nodeApiHostA = `http://127.0.0.1:${addressInfoA.port}`;

    const addressInfoB = httpApiB.address() as AddressInfo;
    const nodeApiHostB = `http://127.0.0.1:${addressInfoB.port}`;

    const addressInfoC = httpApiC.address() as AddressInfo;
    const nodeApiHostC = `http://127.0.0.1:${addressInfoC.port}`;

    const token = await this.getOrCreateToken();
    const baseOptions = { headers: { Authorization: `Bearer ${token}` } };

    const besuConfig = new Configuration({
      basePath: nodeApiHostA,
      baseOptions,
    });
    const xdaiBesuConfig = new Configuration({
      basePath: nodeApiHostB,
      baseOptions,
    });
    const fabricConfig = new Configuration({
      basePath: nodeApiHostC,
      baseOptions,
    });

    const besuApiClient = new BesuApi(besuConfig);
    const xdaiApiClient = new XdaiApi(xdaiBesuConfig);
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
    const rpcApiHostB = await this.ledgers.xdaiBesu.getRpcApiHttpHost();

    const connectionProfile =
      await this.ledgers.fabric.getConnectionProfileOrg1();
    const sshConfig = await this.ledgers.fabric.getSshConfig();

    const registryA = new PluginRegistry({
      plugins: [
        new PluginConsortiumManual({
          instanceId: "PluginConsortiumManual_A",
          consortiumDatabase,
          keyPairPem: keyPairPemA,
          logLevel: this.options.logLevel,
          ctorArgs: {
            baseOptions: {
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        }),
        new SupplyChainCactusPlugin({
          logLevel: this.options.logLevel,
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          xdaiApiClient,
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
          ctorArgs: {
            baseOptions: {
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        }),
        new SupplyChainCactusPlugin({
          logLevel: this.options.logLevel,
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          xdaiApiClient,
          fabricApiClient,
          web3SigningCredential: {
            keychainEntryKey: xdaiBesuAccount.address,
            keychainId: this.keychain.getKeychainId(),
            type: Web3SigningCredentialType.CactusKeychainRef,
          },
        }),
        this.keychain,
      ],
    });

    const xdaiConnector = new PluginLedgerConnectorXdai({
      instanceId: "PluginLedgerConnectorXdai_B",
      rpcApiHttpHost: rpcApiHostB,
      logLevel: this.options.logLevel,
      pluginRegistry: registryB,
    });

    registryB.add(xdaiConnector);

    const apiServerB = await this.startNode(httpApiB, httpGuiB, registryB);

    this.log.info(`Configuring Cactus Node for Ledger C...`);

    const registryC = new PluginRegistry({
      plugins: [
        new PluginConsortiumManual({
          instanceId: "PluginConsortiumManual_C",
          consortiumDatabase,
          keyPairPem: keyPairPemC,
          logLevel: "INFO",
          ctorArgs: {
            baseOptions: {
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        }),
        new SupplyChainCactusPlugin({
          logLevel: "INFO",
          contracts: contractsInfo,
          instanceId: uuidv4(),
          besuApiClient,
          xdaiApiClient,
          fabricApiClient,
          fabricEnvironment: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
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
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
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

    this.log.info(`JWT generated by the application: ${token}`);

    return {
      apiServerA,
      apiServerB,
      apiServerC,
      besuApiClient,
      fabricApiClient,
      xdaiApiClient,
      supplyChainApiClientA: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA, baseOptions }),
      ),
      supplyChainApiClientB: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA, baseOptions }),
      ),
      supplyChainApiClientC: new SupplyChainApi(
        new Configuration({ basePath: nodeApiHostA, baseOptions }),
      ),
    };
  }

  public async stop(): Promise<void> {
    let i = 0;
    for (const hook of this.shutdownHooks) {
      i++;
      this.log.info("Executing exit hook #%d...", i);
      await hook(); // FIXME add timeout here so that shutdown does not hang
      this.log.info("Executed exit hook #%d OK", i);
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
    const nodeApiHostA = `http://127.0.0.1:${addressInfoA.port}`;

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
    const nodeApiHostB = `http://127.0.0.1:${addressInfoB.port}`;

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
      id: "XdaiBesuDemoLedger",
      ledgerType: LedgerType.Besu2X,
    };

    cactusNodeB.ledgerIds.push(ledger2.id);

    const memberIdC = uuidv4();
    const nodeIdC = uuidv4();
    const addressInfoC = serverC.address() as AddressInfo;
    const nodeApiHostC = `http://127.0.0.1:${addressInfoC.port}`;

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
      ledgerType: LedgerType.Fabric2,
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
    properties.logLevel = "WARN"; // silence the logs about 0.0.0.0 web hosts
    properties.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
    properties.authorizationConfigJson =
      await this.getOrCreateAuthorizationConfig();
    properties.crpcPort = 0;
    // We must disable the API server's own shutdown hooks because if we didn't
    // it would clash with the supply chain app's own shutdown hooks and the
    // async functions wouldn't be waited for their conclusion leaving the containers
    // running after the supply chain app NodeJS process has exited.
    properties.enableShutdownHook = false;

    const apiServer = new ApiServer({
      config: properties,
      httpServerApi,
      httpServerCockpit,
      pluginRegistry,
      enableShutdownHook: false,
    });

    this.onShutdown(async () => {
      this.log.info("SupplyChainApp onShutdown() - stopping API server");
      await apiServer.shutdown();
      this.log.info("SupplyChainApp onShutdown() - stopped API server OK");
    });

    await apiServer.start();

    const restApiUrl = `http://127.0.0.1:${properties.apiPort}`;
    this.log.info("%s: %s", SUPPLY_CHAIN_APP_OK_LOG_MSG_PATTERN, restApiUrl);

    const guiUrl = `http://127.0.0.1:${properties.cockpitPort}`;
    this.log.info("SupplyChainApp Web GUI - reachable at: %s", guiUrl);

    return apiServer;
  }
}

export interface IStartInfo {
  readonly apiServerA: ApiServer;
  readonly apiServerB: ApiServer;
  readonly apiServerC: ApiServer;
  readonly besuApiClient: BesuApi;
  readonly xdaiApiClient: XdaiApi;
  readonly fabricApiClient: FabricApi;
  readonly supplyChainApiClientA: SupplyChainApi;
  readonly supplyChainApiClientB: SupplyChainApi;
  readonly supplyChainApiClientC: SupplyChainApi;
}
