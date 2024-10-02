import express from "express";
import cors from "cors";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import bodyParser from "body-parser";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  DefaultApi as FabricApi,
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  DeploymentTargetOrgFabric2x,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  DefaultApi as BesuApi,
  DeployContractSolidityBytecodeV1Request,
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  IPluginLedgerConnectorBesuOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginRegistry } from "@hyperledger/cactus-core";
import SATPContract from "../../../solidity/main/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/main/generated/satp-wrapper.sol/SATPWrapperContract.json";
import {
  Configuration,
  PluginFactorySATPGateway,
  SATPGateway,
  SATPGatewayConfig,
} from "@hyperledger/cactus-plugin-satp-hermes";
import {
  IWebServiceEndpoint,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";
import {
  SupportedChain,
  GatewayIdentity,
  DraftVersions,
} from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/core/types";
import { FabricConfig } from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/types/blockchain-interaction";
import { bufArray2HexStr } from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/gateway-utils";
import { SessionReference } from "../types";

import BesuSATPInteraction from "../../../ontology/besu-erc20-ontology.json";
import FabricSATPInteraction from "../../../ontology/fabric-erc20-ontology.json";
import { ApproveEndpointV1 } from "../web-services/approve-endpoint";
import { GetSessionsDataEndpointV1 } from "../web-services/get-all-session-data-endpoints";
import { GetBalanceEndpointV1 } from "../web-services/get-balance-endpoint";
import { MintEndpointV1 } from "../web-services/mint-endpoint";
import { TransactEndpointV1 } from "../web-services/transact-endpoint";
import { TransferEndpointV1 } from "../web-services/transfer-endpoint";
import { GetAmountApprovedEndpointV1 } from "../web-services/get-amount-approved-endpoint";

import {
  AdminApi,
  TransactionApi,
} from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/generated/gateway-client/typescript-axios/api";

export interface ICbdcBridgingAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
}

export class CbdcBridgingAppDummyInfrastructure {
  public static readonly CLASS_NAME = "CbdcBridgingAppDummyInfrastructure";
  // TODO: Move this to the FabricTestLedger class where it belongs.
  public static readonly FABRIC_2_AIO_CLI_CFG_DIR =
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";
  public static readonly SATP_CONTRACT = "SATPContract";
  public static readonly SATP_WRAPPER = "SATPWrapperContract";
  public static readonly FABRIC_ASSET_ID = "FabricAssetID";
  public static readonly BESU_ASSET_ID = "BesuAssetID";
  private static readonly FABRIC_CHANNEL_NAME = "mychannel";

  private readonly besu: BesuTestLedger;
  private readonly fabric: FabricTestLedgerV1;
  private readonly log: Logger;
  private besuFirstHighNetWorthAccount: string = "";
  private besuFirstHighNetWorthAccountPriv: string = "";

  private besuOptions: IPluginLedgerConnectorBesuOptions | undefined;
  private fabricConnectorBridgeOptions:
    | IPluginLedgerConnectorFabricOptions
    | undefined;

  private besuContractAddress: string | undefined;
  private besuWrapperContractAddress: string | undefined;

  private userIdentity1: any;

  private fabricKeychainPlugin: PluginKeychainMemory | undefined;

  private fabricApiTransactApi: TransactionApi | undefined;
  private besuApiTransactApi: TransactionApi | undefined;

  private fabricApiAdminApi: AdminApi | undefined;
  private besuApiAdminApi: AdminApi | undefined;

  private fabricConnectorApi: FabricApi | undefined;
  private besuConnectorApi: BesuApi | undefined;

  private readonly gatewayFactory = new PluginFactorySATPGateway({
    pluginImportType: PluginImportType.Local,
  });
  endpoints: any;

  public get className(): string {
    return CbdcBridgingAppDummyInfrastructure.CLASS_NAME;
  }

  public get orgCfgDir(): string {
    return CbdcBridgingAppDummyInfrastructure.FABRIC_2_AIO_CLI_CFG_DIR;
  }

  public setFabricApi(value: FabricApi) {
    this.fabricConnectorApi = value;
  }

  public setBesuApi(value: BesuApi) {
    this.besuConnectorApi = value;
  }

  constructor(
    public readonly options: ICbdcBridgingAppDummyInfrastructureOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;

    this.log = LoggerProvider.getOrCreate({ level, label });

    this.besu = new BesuTestLedger({
      logLevel: level || "DEBUG",
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });

    this.fabric = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel: level || "DEBUG",
    });
  }

  public get org1Env(): NodeJS.ProcessEnv & DeploymentTargetOrgFabric2x {
    return FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1;
  }

  public get org2Env(): NodeJS.ProcessEnv & DeploymentTargetOrgFabric2x {
    return FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2;
  }

  public get draftVersions(): DraftVersions[] {
    return [
      {
        Core: "v02",
        Architecture: "v02",
        Crash: "v02",
      },
    ];
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await Promise.all([this.besu.start(), this.fabric.start()]);
      this.besuFirstHighNetWorthAccount = this.besu.getGenesisAccountPubKey();
      this.besuFirstHighNetWorthAccountPriv =
        this.besu.getGenesisAccountPrivKey();
      this.log.info(`Started dummy infrastructure OK`);
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.all([
        this.besu.stop().then(() => this.besu.destroy()),
        this.fabric.stop().then(() => this.fabric.destroy()),
      ]);
      this.log.info(`Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async createFabricLedgerConnector(): Promise<PluginLedgerConnectorFabric> {
    const connectionProfileOrg1 = await this.fabric.getConnectionProfileOrg1();
    const connectionProfileOrg2 =
      await this.fabric.getConnectionProfileOrgX("org2");

    const enrollAdminOutOrg1 = await this.fabric.enrollAdmin();
    const adminWalletOrg1 = enrollAdminOutOrg1[1];
    [this.userIdentity1] = await this.fabric.enrollUserV2({
      wallet: adminWalletOrg1,
      enrollmentID: "userA",
      organization: "org1",
    });
    const [userIdentity2] = await this.fabric.enrollUserV2({
      wallet: adminWalletOrg1,
      enrollmentID: "userB",
      organization: "org1",
    });

    const enrollAdminOutOrg2 = await this.fabric.enrollAdminV2({
      organization: "org2",
    });
    const adminWalletOrg2 = enrollAdminOutOrg2[1];
    const [bridgeIdentity] = await this.fabric.enrollUserV2({
      wallet: adminWalletOrg2,
      enrollmentID: "bridge",
      organization: "org2",
    });

    const [adminIdentityOrg2] = await this.fabric.enrollUserV2({
      wallet: adminWalletOrg2,
      enrollmentID: "adminUser",
      organization: "org2",
    });

    const sshConfig = await this.fabric.getSshConfig();

    const keychainEntryKey1 = "userA";
    const keychainEntryValue1 = JSON.stringify(this.userIdentity1);

    const keychainEntryKey2 = "userB";
    const keychainEntryValue2 = JSON.stringify(userIdentity2);

    const keychainEntryKey3 = CryptoMaterial.keychains.keychain2.ref;
    const keychainEntryValue3 = JSON.stringify(bridgeIdentity);

    const keychainEntryKey4 = "adminUser";
    const keychainEntryValue4 = JSON.stringify(adminIdentityOrg2);

    this.fabricKeychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: CryptoMaterial.keychains.keychain1.id,
      logLevel: this.options.logLevel || "INFO",
      backend: new Map([
        [keychainEntryKey1, keychainEntryValue1],
        [keychainEntryKey2, keychainEntryValue2],
        [keychainEntryKey3, keychainEntryValue3],
        [keychainEntryKey4, keychainEntryValue4],
      ]),
    });

    const bridgeKeychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: CryptoMaterial.keychains.keychain2.id,
      logLevel: this.options.logLevel || "INFO",
      backend: new Map([[keychainEntryKey3, keychainEntryValue3]]),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [this.fabricKeychainPlugin],
    });

    const bridgePluginRegistry = new PluginRegistry({
      plugins: [bridgeKeychainPlugin],
    });

    const fabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: this.org1Env,
      sshConfig,
      connectionProfile: connectionProfileOrg1,
      logLevel: this.options.logLevel || "INFO",
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    this.fabricConnectorBridgeOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: bridgePluginRegistry,
      cliContainerEnv: this.org2Env,
      sshConfig,
      connectionProfile: connectionProfileOrg2,
      logLevel: this.options.logLevel || "INFO",
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    this.log.info(`Creating Fabric Connector...`);
    return new PluginLedgerConnectorFabric(fabricOptions);
  }

  public async createBesuLedgerConnector(): Promise<PluginLedgerConnectorBesu> {
    const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();
    const rpcApiWsHost = await this.besu.getRpcApiWsHost();

    const keychainEntryKey = CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT;
    const keychainEntryValue = JSON.stringify(SATPContract);

    const keychainEntryKey2 = CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER;
    const keychainEntryValue2 = JSON.stringify(SATPWrapperContract);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: CryptoMaterial.keychains.keychain2.id,
      logLevel: undefined,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        [keychainEntryKey2, keychainEntryValue2],
      ]),
    });

    this.besuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      logLevel: this.options.logLevel || "INFO",
    };

    this.log.info(`Creating Besu Connector...`);
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const besuConnector = await factory.create(this.besuOptions);

    const accounts = [
      CryptoMaterial.accounts.userA.ethAddress,
      CryptoMaterial.accounts.userB.ethAddress,
      CryptoMaterial.accounts.bridge.ethAddress,
    ];

    for (const account of accounts) {
      await this.besu.sendEthToAccount(account);
    }

    return besuConnector;
  }

  public async createSATPGateways(): Promise<SATPGateway[]> {
    const fnTag = `${this.className}#createSATPGateways()`;
    const logLevel = this.options.logLevel || "INFO";
    this.log.info(`${fnTag} Creating SATP Gateways...`);

    const fabricGatewayKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const besuGatewayKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const fabricGatewayIdentity = {
      id: "fabric-satp-gateway-id",
      name: "Fabric SATP Gateway",
      version: this.draftVersions,
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "fabricGatewayProofID",
      address: `http://localhost`,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayOpenAPIPort: 4010,
    } as GatewayIdentity;

    const besuGatewayIdentity = {
      id: "besu-satp-gateway-id",
      name: "Besu SATP Gateway",
      version: this.draftVersions,
      supportedDLTs: [SupportedChain.BESU],
      proofID: "besuGatewayProofID",
      address: `http://localhost`,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    const pluginBungeeFabricOptions = {
      //todo change this when bungee is implemented
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    const pluginBungeeBesuOptions = {
      //todo change this when bungee is implemented
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    const fabricConfig = {
      network: SupportedChain.FABRIC,
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain2.id,
        keychainRef: CryptoMaterial.keychains.keychain2.ref,
      },
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
      options: this.fabricConnectorBridgeOptions,
      bungeeOptions: pluginBungeeFabricOptions,
    } as FabricConfig;

    const besuConfig = {
      network: SupportedChain.BESU,
      keychainId: CryptoMaterial.keychains.keychain2.id,
      signingCredential: {
        ethAccount: CryptoMaterial.accounts.bridge.ethAddress,
        secret: CryptoMaterial.accounts.bridge.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
      contractAddress: this.besuWrapperContractAddress,
      options: this.besuOptions,
      bungeeOptions: pluginBungeeBesuOptions,
      gas: 999999999999999,
    };

    const besuGatewayOptions: SATPGatewayConfig = {
      logLevel: logLevel,
      gid: besuGatewayIdentity,
      counterPartyGateways: [
        {
          id: "fabric-satp-gateway-id",
          name: "Fabric SATP Gateway",
          version: this.draftVersions,
          supportedDLTs: [SupportedChain.FABRIC],
          proofID: "fabricGatewayProofID",
          address: `http://localhost`,
          gatewayServerPort: 3010,
          gatewayClientPort: 3011,
          gatewayOpenAPIPort: 4010,
          pubKey: bufArray2HexStr(fabricGatewayKeyPair.publicKey),
        } as GatewayIdentity,
      ],
      bridgesConfig: [besuConfig],
      enableOpenAPI: true,
      keyPair: besuGatewayKeyPair,
    };

    const fabricGatewayOptions = {
      logLevel: logLevel,
      gid: fabricGatewayIdentity,
      counterPartyGateways: [
        {
          id: "besu-satp-gateway-id",
          name: "Besu SATP Gateway",
          version: this.draftVersions,
          supportedDLTs: [SupportedChain.BESU],
          proofID: "besuGatewayProofID",
          address: `http://localhost`,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
          pubKey: bufArray2HexStr(besuGatewayKeyPair.publicKey),
        } as GatewayIdentity,
      ],
      bridgesConfig: [fabricConfig],
      enableOpenAPI: true,
      keyPair: fabricGatewayKeyPair,
    };

    const besuGateway = await this.gatewayFactory.create(besuGatewayOptions);

    const configurationBesuGateway = new Configuration({
      basePath: `http://localhost:${besuGatewayIdentity.gatewayOpenAPIPort}`,
    });

    this.log.info(`Besu Gateway created`);

    const fabricGateway =
      await this.gatewayFactory.create(fabricGatewayOptions);

    const configurationFabricGateway = new Configuration({
      basePath: `http://localhost:${fabricGatewayIdentity.gatewayOpenAPIPort}`,
    });

    this.log.info(`Fabric Gateway created`);

    this.besuApiTransactApi = new TransactionApi(configurationBesuGateway);
    this.besuApiAdminApi = new AdminApi(configurationBesuGateway);
    this.fabricApiTransactApi = new TransactionApi(configurationFabricGateway);
    this.fabricApiAdminApi = new AdminApi(configurationFabricGateway);

    return [fabricGateway, besuGateway];
  }

  public async deployFabricSATPContract(): Promise<void> {
    const channelId = "mychannel";

    const contractName = CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT;

    const contractRelPath =
      "../../../fabric-contracts/satp-contract/chaincode-typescript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   └── index.ts
    // ├── tsconfig.json
    // └── tslint.json
    const satpSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./ITraceableContract.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-contract-interface.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-contract.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./tokenERC20.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    this.log.info(`Deploying Fabric SATP contract in API`);

    if (!this.fabricConnectorApi) {
      throw new Error(`Fabric connector API not set`);
    }

    const res = await this.fabricConnectorApi.deployContractV1(
      {
        channelId: channelId,
        ccVersion: "1.0.0",
        sourceFiles: satpSourceFiles,
        ccName: contractName,
        targetOrganizations: [this.org1Env, this.org2Env],
        caFile:
          FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
        ccLabel: contractName,
        ccLang: ChainCodeProgrammingLanguage.Typescript,
        ccSequence: 1,
        orderer: "orderer.example.com:7050",
        ordererTLSHostnameOverride: "orderer.example.com",
        connTimeout: 60,
      },
      // {
      //   maxContentLength: Infinity,
      //   maxBodyLength: Infinity,
      // },
    );

    const { packageIds, lifecycle } = res.data;

    const {
      approveForMyOrgList,
      installList,
      queryInstalledList,
      commit,
      packaging,
      queryCommitted,
    } = lifecycle;

    Checks.truthy(packageIds, `packageIds truthy OK`);
    Checks.truthy(
      Array.isArray(packageIds),
      `Array.isArray(packageIds) truthy OK`,
    );

    Checks.truthy(approveForMyOrgList, `approveForMyOrgList truthy OK`);
    Checks.truthy(
      Array.isArray(approveForMyOrgList),
      `Array.isArray(approveForMyOrgList) truthy OK`,
    );
    Checks.truthy(installList, `installList truthy OK`);
    Checks.truthy(
      Array.isArray(installList),
      `Array.isArray(installList) truthy OK`,
    );
    Checks.truthy(queryInstalledList, `queryInstalledList truthy OK`);
    Checks.truthy(
      Array.isArray(queryInstalledList),
      `Array.isArray(queryInstalledList) truthy OK`,
    );
    Checks.truthy(commit, `commit truthy OK`);
    Checks.truthy(packaging, `packaging truthy OK`);
    Checks.truthy(queryCommitted, `queryCommitted truthy OK`);
    this.log.info("SATP Contract deployed");
  }

  public async deployFabricWrapperContract(): Promise<void> {
    const channelId = "mychannel";

    const contractName = CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER;

    const contractRelPath =
      "../../../fabric-contracts/satp-wrapper/chaincode-typescript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── index.js
    // ├── lib
    // │   ├── tokenERC20.js
    const wrapperSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./interaction-signature.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./ITraceableContract.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-wrapper.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./token.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    if (!this.fabricConnectorApi) {
      throw new Error(`Fabric connector API not set`);
    }

    await this.fabricConnectorApi
      .deployContractV1(
        {
          channelId,
          ccVersion: "1.0.0",
          sourceFiles: wrapperSourceFiles,
          ccName: contractName,
          targetOrganizations: [this.org1Env, this.org2Env],
          caFile:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
          ccLabel: contractName,
          ccLang: ChainCodeProgrammingLanguage.Typescript,
          ccSequence: 1,
          orderer: "orderer.example.com:7050",
          ordererTLSHostnameOverride: "orderer.example.com",
          connTimeout: 120,
        },
        {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      )
      .then(async (res: { data: { packageIds: any; lifecycle: any } }) => {
        const { packageIds, lifecycle } = res.data;

        const {
          approveForMyOrgList,
          installList,
          queryInstalledList,
          commit,
          packaging,
          queryCommitted,
        } = lifecycle;

        Checks.truthy(packageIds, `packageIds truthy OK`);
        Checks.truthy(
          Array.isArray(packageIds),
          `Array.isArray(packageIds) truthy OK`,
        );
        Checks.truthy(approveForMyOrgList, `approveForMyOrgList truthy OK`);
        Checks.truthy(
          Array.isArray(approveForMyOrgList),
          `Array.isArray(approveForMyOrgList) truthy OK`,
        );
        Checks.truthy(installList, `installList truthy OK`);
        Checks.truthy(
          Array.isArray(installList),
          `Array.isArray(installList) truthy OK`,
        );
        Checks.truthy(queryInstalledList, `queryInstalledList truthy OK`);
        Checks.truthy(
          Array.isArray(queryInstalledList),
          `Array.isArray(queryInstalledList) truthy OK`,
        );
        Checks.truthy(commit, `commit truthy OK`);
        Checks.truthy(packaging, `packaging truthy OK`);
        Checks.truthy(queryCommitted, `queryCommitted truthy OK`);
      })
      .catch(() => console.log("trying to deploy fabric contract again"));
  }

  public async deployBesuContracts(): Promise<void> {
    const fnTag = `${this.className}#deployBesuContracts()`;

    if (!this.besuConnectorApi) {
      throw new Error(`${fnTag}, Besu connector API not set`);
    }

    const deployCbdcContractResponse =
      await this.besuConnectorApi.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        contractAbi: SATPContract.abi,
        constructorArgs: [
          this.besuFirstHighNetWorthAccount,
          CbdcBridgingAppDummyInfrastructure.BESU_ASSET_ID,
        ],
        web3SigningCredential: {
          ethAccount: this.besuFirstHighNetWorthAccount,
          secret: this.besuFirstHighNetWorthAccountPriv,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: SATPContract.bytecode.object,
        gas: 10000000,
      } as DeployContractSolidityBytecodeV1Request);

    if (deployCbdcContractResponse == undefined) {
      throw new Error(`${fnTag}, error when deploying CBDC smart contract`);
    }

    this.besuContractAddress =
      deployCbdcContractResponse.data.transactionReceipt.contractAddress ?? "";

    await this.startDummyServer();

    const deployWrapperContractResponse =
      await this.besuConnectorApi.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
        contractAbi: SATPWrapperContract.abi,
        constructorArgs: [CryptoMaterial.accounts["bridge"].ethAddress],
        web3SigningCredential: {
          ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
          secret: CryptoMaterial.accounts["bridge"].privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: SATPWrapperContract.bytecode.object,
        gas: 10000000,
      } as DeployContractSolidityBytecodeV1Request);

    if (deployWrapperContractResponse == undefined) {
      throw new Error(
        `${fnTag}, error when deploying Asset Reference smart contract`,
      );
    }

    this.besuWrapperContractAddress =
      deployWrapperContractResponse.data.transactionReceipt.contractAddress ??
      "";

    const giveRoleRes = await this.besuConnectorApi.invokeContractV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      keychainId: CryptoMaterial.keychains.keychain2.id,
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [
        deployWrapperContractResponse.data.transactionReceipt.contractAddress,
      ],
      signingCredential: {
        ethAccount: this.besuFirstHighNetWorthAccount,
        secret: this.besuFirstHighNetWorthAccountPriv,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    const giveRoleRes1 = await this.besuConnectorApi.invokeContractV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      keychainId: CryptoMaterial.keychains.keychain2.id,
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [CryptoMaterial.accounts["bridge"].ethAddress],
      signingCredential: {
        ethAccount: this.besuFirstHighNetWorthAccount,
        secret: this.besuFirstHighNetWorthAccountPriv,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });

    Checks.truthy(giveRoleRes, "giveRoleRes");
    Checks.truthy(giveRoleRes1, "giveRoleRes1");
  }

  public async initializeContractsAndAddPermitions() {
    if (!this.fabricConnectorApi) {
      throw new Error(`Fabric connector API not set`);
    }

    if (this.fabricKeychainPlugin === undefined) {
      throw new Error(`Fabric keychain plugin not set`);
    }

    const fabricInitializeResponse =
      await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: [
          this.userIdentity1.mspId,
          CbdcBridgingAppDummyInfrastructure.FABRIC_ASSET_ID,
        ],
        methodName: "InitToken",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricKeychainPlugin.getKeychainId()!,
          keychainRef: "userA",
        },
      });

    Checks.truthy(fabricInitializeResponse, "fabricInitializeResponse");
    Checks.truthy(
      fabricInitializeResponse.status,
      "fabricInitializeResponse.data",
    );

    if (
      fabricInitializeResponse.status < 200 ||
      fabricInitializeResponse.status > 299
    ) {
      throw new Error("Failed to initialize CBDC Fabric contract");
    }

    const fabricWrapperInitializeResponse =
      await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: ["Org2MSP"],
        methodName: "Initialize",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricKeychainPlugin.getKeychainId()!,
          keychainRef: "adminUser",
        },
      });

    Checks.truthy(
      fabricWrapperInitializeResponse,
      "fabricWrapperInitializeResponse",
    );
    Checks.truthy(
      fabricWrapperInitializeResponse.status,
      "fabricWrapperInitializeResponse.data",
    );

    if (
      fabricWrapperInitializeResponse.status < 200 ||
      fabricWrapperInitializeResponse.status > 299
    ) {
      throw new Error("Failed to initialize Wrapper Fabric contract");
    }

    const setBridgeWrapperResponse =
      await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: ["Org2MSP", CryptoMaterial.accounts.bridge.fabricID],
        methodName: "setBridge",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricKeychainPlugin.getKeychainId()!,
          keychainRef: "adminUser",
        },
      });

    Checks.truthy(setBridgeWrapperResponse, "setBridgeWrapperResponse");
    Checks.truthy(setBridgeWrapperResponse.status, "setBridgeResponse.data");

    if (
      setBridgeWrapperResponse.status < 200 ||
      setBridgeWrapperResponse.status > 299
    ) {
      throw new Error("Failed to set Bridge Fabric contract");
    }

    const setBridgeCBDCResponse =
      await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: ["Org2MSP"],
        methodName: "setBridge",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricKeychainPlugin.getKeychainId()!,
          keychainRef: "userA",
        },
      });

    Checks.truthy(setBridgeCBDCResponse, "setBridgeCBDCResponse");
    Checks.truthy(setBridgeCBDCResponse.status, "setBridgeCBDCResponse.data");

    if (
      setBridgeCBDCResponse.status < 200 ||
      setBridgeCBDCResponse.status > 299
    ) {
      throw new Error("Failed to set Bridge Fabric contract");
    }

    if (!this.besuConnectorApi) {
      throw new Error(`Besu connector API not set`);
    }

    const besuInitializeResponse = await this.besuConnectorApi.invokeContractV1(
      {
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Send,
        methodName: "giveRole",
        params: [this.besuWrapperContractAddress],
        signingCredential: {
          ethAccount: this.besuFirstHighNetWorthAccount,
          secret: this.besuFirstHighNetWorthAccountPriv,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      },
    );

    Checks.truthy(besuInitializeResponse, "besuInitializeResponse");
    Checks.truthy(besuInitializeResponse.status, "besuInitializeResponse.data");

    if (
      besuInitializeResponse.status < 200 ||
      besuInitializeResponse.status > 299
    ) {
      throw new Error("Failed to initialize CBDC Besu contract");
    }
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${CbdcBridgingAppDummyInfrastructure.CLASS_NAME}#getOrCreateWebServices()`;
    this.log.info(`${fnTag}, Registering webservices`);

    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const approveEndpointV1 = new ApproveEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const gelAllSessionDataEndpointV1 = new GetSessionsDataEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const getBalanceEndpointV1 = new GetBalanceEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const mintEndpointV1 = new MintEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const transactEndpointV1 = new TransactEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const transferEndpointV1 = new TransferEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const getApprovedEndpointV1 = new GetAmountApprovedEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const theEndpoints = [
      approveEndpointV1,
      gelAllSessionDataEndpointV1,
      getBalanceEndpointV1,
      mintEndpointV1,
      transactEndpointV1,
      transferEndpointV1,
      getApprovedEndpointV1,
    ];
    this.endpoints = theEndpoints;

    return theEndpoints;
  }

  public async getSessionsData(gateway: string): Promise<SessionReference[]> {
    this.log.debug(`Getting sessions data from ${gateway}`);
    let api;
    if (gateway === "FABRIC") {
      api = this.fabricApiAdminApi;
    } else {
      api = this.besuApiAdminApi;
    }
    try {
      if (api === undefined) {
        throw new Error("API is undefined");
      }
      const response = await api.getSessionIds();

      if (response.status !== 200) {
        return [
          {
            id: "MockID",
            status: "undefined",
            substatus: "undefined",
            sourceLedger: "undefined",
            receiverLedger: "undefined",
          },
        ];
      }

      const ids = response.data;

      const sessionsData = [];
      for (const id of ids) {
        try {
          const sessionData = await api.getStatus(id);
          const data: SessionReference = {
            id,
            status: sessionData.data.status,
            substatus: sessionData.data.substatus,
            sourceLedger: sessionData.data.originChain.dltProtocol,
            receiverLedger: sessionData.data.destinationChain.dltProtocol,
          };

          sessionsData.push(data);
        } catch (error) {
          sessionsData.push({
            id: "MockID",
            status: "undefined",
            substatus: "undefined",
            sourceLedger: "undefined",
            receiverLedger: "undefined",
          });
        }
      }
      return sessionsData;
    } catch (error) {
      console.log(error);
      return [
        {
          id: "MockID",
          status: "undefined",
          substatus: "undefined",
          sourceLedger: "undefined",
          receiverLedger: "undefined",
        },
      ];
    }
  }

  public async bridgeTokens(
    sender: string,
    recipient: string,
    sourceChain: string,
    destinationChain: string,
    amount: number,
  ) {
    this.log.debug(
      `Bridging tokens from ${sourceChain} to ${destinationChain}`,
    );
    let senderAddress;
    let receiverAddress;
    let sourceAsset;
    let receiverAsset;

    let fromDLTNetworkID;
    let toDLTNetworkID;
    let api;

    if (sourceChain === "FABRIC") {
      senderAddress = this.getFabricId(sender);
      sourceAsset = this.setFabricAsset(senderAddress as string);
      fromDLTNetworkID = "FabricSATPGateway";
      api = this.fabricApiTransactApi;
    } else {
      senderAddress = this.getEthAddress(sender);
      sourceAsset = this.setBesuAsset(
        senderAddress as string,
        this.besuContractAddress!,
      );
      fromDLTNetworkID = "BesuSATPGateway";
      api = this.besuApiTransactApi;
    }

    if (destinationChain === "BESU") {
      toDLTNetworkID = "BesuSATPGateway";
      receiverAddress = this.getEthAddress(recipient);
      receiverAsset = this.setBesuAsset(
        receiverAddress as string,
        this.besuContractAddress!,
      );
    } else {
      toDLTNetworkID = "FabricSATPGateway";
      receiverAddress = this.getFabricId(recipient);
      receiverAsset = this.setFabricAsset(receiverAddress as string);
    }

    if (api === undefined) {
      throw new Error("API is undefined");
    }

    try {
      await api.transact({
        contextID: "MockID",
        fromDLTNetworkID,
        toDLTNetworkID,
        fromAmount: amount.toString(),
        toAmount: amount.toString(),
        originatorPubkey: senderAddress,
        beneficiaryPubkey: receiverAddress,
        sourceAsset,
        receiverAsset: receiverAsset,
      });
    } catch (error) {
      this.log.error(
        `Error bridging tokens from ${sourceChain} to ${receiverAsset}`,
      );
      throw error;
    }
  }

  public async getFabricBalance(frontendUser: string) {
    const fabricID = this.getFabricId(frontendUser);
    this.log.debug(`Getting Fabric balance for user: ${frontendUser}`);
    let response;

    if (this.fabricConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      response = await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: [fabricID],
        methodName: "ClientIDAccountBalance",
        invocationType: FabricContractInvocationType.Call,
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: "userA",
        },
      });
      this.log.debug(
        `Fabric - Balance for user: ${frontendUser} is ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      this.log.error(`Fabric - Error getting balance user: ${frontendUser}`);
      return -1;
    }

    return parseInt(response.data.functionOutput);
  }

  public async getBesuBalance(frontendUser: string) {
    const userEthAddress = this.getEthAddress(frontendUser);
    this.log.debug(`Getting BESU balance for user: ${frontendUser}`);

    if (this.besuConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      const response = await this.besuConnectorApi.invokeContractV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Call,
        methodName: "checkBalance",
        params: [userEthAddress],
        signingCredential: {
          ethAccount: userEthAddress,
          secret: this.getEthUserPrKey(frontendUser),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });

      this.log.debug(
        `BESU - Balance for user: ${frontendUser} is ${JSON.stringify(response.data)}`,
      );
      this.log.debug(
        `BESU - Balance for user: ${frontendUser} is ${response.data.callOutput}`,
      );

      return parseInt(response.data.callOutput);
    } catch (error) {
      this.log.error(`BESU - Error getting balance user: ${frontendUser}`);
      return -1;
    }
  }

  public async mintTokensFabric(frontendUser: string, amount: string) {
    this.log.debug(
      `Minting Fabric tokens for user: ${frontendUser}, amount: ${amount}`,
    );

    if (this.fabricConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      const response = await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: [amount],
        methodName: "mint",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: this.getUserFromPseudonim(frontendUser),
        },
      });

      this.log.debug(
        `Fabric - Minting tokens for user: ${frontendUser} is ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      console.error(error.msg);
      throw new Error("Failed to mint tokens");
    }
  }

  public async mintTokensBesu(user: string, amount: number) {
    const userEthAddress = this.getEthAddress(user);
    this.log.debug(
      `Minting Besu tokens for user: ${userEthAddress}, amount: ${amount}`,
    );

    if (this.besuConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      const response = await this.besuConnectorApi.invokeContractV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Send,
        methodName: "mint",
        params: [userEthAddress, amount],
        signingCredential: {
          ethAccount: this.getEthAddress("Bridge"),
          secret: this.getEthUserPrKey("Bridge"),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });

      this.log.debug(
        `Besu - Minting tokens for user: ${user} is ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      console.error(error.msg);
      throw new Error("Failed to mint tokens");
    }
  }

  public async transferTokensFabric(
    frontendUserFrom: string,
    frontendUserTo: string,
    amount: string,
  ) {
    const to = this.getFabricId(frontendUserTo);
    this.log.debug(
      `Transferring Fabric tokens from: ${frontendUserFrom} to: ${frontendUserTo}`,
    );

    if (this.fabricConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: [to, amount],
        methodName: "transfer",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: this.getUserFromPseudonim(frontendUserFrom),
        },
      });
    } catch (error) {
      console.error(error.msg);
      throw new Error("Failed to transfer tokens");
    }
  }

  public async transferTokensBesu(
    frontendUserFrom: string,
    frontendUserTo: string,
    amount: number,
  ) {
    const from = this.getEthAddress(frontendUserFrom);
    const to = this.getEthAddress(frontendUserTo);
    this.log.debug(
      `Transferring Besu tokens from: ${frontendUserFrom} to: ${frontendUserTo}`,
    );

    if (this.besuConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      await this.besuConnectorApi.invokeContractV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Send,
        methodName: "transfer",
        params: [to, amount],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUserFrom),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Failed to transfer tokens");
    }
  }

  public async approveNTokensFabric(user: string, amount: string) {
    this.log.debug(`Approving Fabric tokens for user: ${user}`);

    if (this.fabricConnectorApi === undefined) {
      throw new Error("API is undefined");
    }
    await this.fabricConnectorApi.runTransactionV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      params: [CryptoMaterial.accounts.bridge.fabricID, amount],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: this.getUserFromPseudonim(user),
      },
    });
  }

  public async approveNTokensBesu(frontendUserFrom: string, amount: number) {
    const from = this.getEthAddress(frontendUserFrom);
    this.log.debug(`Approving Besu tokens for user: ${frontendUserFrom}`);

    if (this.besuConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      await this.besuConnectorApi.invokeContractV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Send,
        methodName: "approve",
        params: [this.besuWrapperContractAddress, amount],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUserFrom),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
    } catch (error) {
      this.log.error(error);
      return -1;
    }
  }

  public async getAmountApprovedBesu(frontendUser: string) {
    const from = this.getEthAddress(frontendUser);
    this.log.debug(`Getting approved balance for user: ${frontendUser}`);

    if (this.besuConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    try {
      const response = await this.besuConnectorApi.invokeContractV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: EthContractInvocationType.Call,
        methodName: "allowance",
        params: [from, this.besuWrapperContractAddress],
        signingCredential: {
          ethAccount: from,
          secret: this.getEthUserPrKey(frontendUser),
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      });
      return response.data.callOutput;
    } catch (error) {
      this.log.error(
        `Besu - Error getting approved balance user: ${frontendUser}`,
      );
      return "0";
    }
  }

  public async getAmountApprovedFabric(frontendUser: string) {
    const owner = this.getFabricId(frontendUser);
    this.log.debug(`Getting Fabric approved balance for user: ${frontendUser}`);

    if (this.fabricConnectorApi === undefined) {
      throw new Error("API is undefined");
    }

    let response;
    try {
      response = await this.fabricConnectorApi.runTransactionV1({
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
        params: [owner, CryptoMaterial.accounts.bridge.fabricID],
        methodName: "Allowance",
        invocationType: FabricContractInvocationType.Call,
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: this.getUserFromPseudonim(frontendUser),
        },
      });
    } catch (error) {
      this.log.error(
        `Fabric - Error getting approved balance user: ${frontendUser}`,
      );
      return "0";
    }

    return response.data.functionOutput;
  }

  private setBesuAsset(owner: string, contractAddress: string) {
    return {
      owner,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      contractAddress,
    };
  }

  private setFabricAsset(owner: string) {
    return {
      owner,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      mspId: "Org1MSP",
    };
  }

  private getUserFromPseudonim(user: string): string {
    switch (user) {
      case "Alice":
        return "userA";
      case "Charlie":
        return "userB";
      case "Bridge":
        return "bridge";
      default:
        throw new Error(`User pseudonym not found for user: ${user}`);
    }
  }

  private getFabricId(user: string) {
    switch (this.getUserFromPseudonim(user)) {
      case "userA":
        return CryptoMaterial.accounts["userA"].fabricID;
      case "userB":
        return CryptoMaterial.accounts["userB"].fabricID;
      case "bridge":
        return CryptoMaterial.accounts["bridge"].fabricID;
      default:
        throw new Error("User not found");
    }
  }

  private getEthAddress(user: string) {
    switch (this.getUserFromPseudonim(user)) {
      case "userA":
        return CryptoMaterial.accounts["userA"].ethAddress;
      case "userB":
        return CryptoMaterial.accounts["userB"].ethAddress;
      case "bridge":
        return CryptoMaterial.accounts["bridge"].ethAddress;
      default:
        throw new Error("User not found");
    }
  }

  private getEthUserPrKey(user: string) {
    switch (this.getUserFromPseudonim(user)) {
      case "userA":
        return CryptoMaterial.accounts["userA"].privateKey;
      case "userB":
        return CryptoMaterial.accounts["userB"].privateKey;
      case "bridge":
        return CryptoMaterial.accounts["bridge"].privateKey;
      default:
        throw new Error("User not found");
    }
  }

  async startDummyServer() {
    //just to send contract address to the frontend at each run
    const app = express();
    app.use(bodyParser.json({ limit: "250mb" }));
    app.use(cors());
    const port = 9999;

    const webServices = await this.getOrCreateWebServices();
    for (const service of webServices) {
      this.log.debug(`Registering web service: ${service.getPath()}`);
      await service.registerExpress(app);
    }

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }
}
