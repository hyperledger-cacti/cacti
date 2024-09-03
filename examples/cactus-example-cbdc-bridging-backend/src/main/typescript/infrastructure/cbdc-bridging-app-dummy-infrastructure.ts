import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
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
  InvokeContractV1Request as BesuInvokeContractV1Request,
  IPluginLedgerConnectorBesuOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginRegistry } from "@hyperledger/cactus-core";
import SATPContract from "../../../solidity/main/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/main/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { PluginFactorySATPGateway, SATPGateway, SATPGatewayConfig } from "@hyperledger/cactus-plugin-satp-hermes";
import { IPluginFactoryOptions, PluginImportType } from "@hyperledger/cactus-core-api";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";
import { SupportedChain, GatewayIdentity, DraftVersions } from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/core/types";
import { FabricConfig, NetworkConfig } from "@hyperledger/cactus-plugin-satp-hermes/src/main/typescript/types/blockchain-interaction";

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
  private fabricOptions: IPluginLedgerConnectorFabricOptions | undefined;

  private besuContractAddress: string | undefined;
  private besuWrapperContractAddress: string | undefined;

  private userIdentity1: any;

  private fabricKeychainPlugin: PluginKeychainMemory | undefined;

  private readonly gatewayFactory = new PluginFactorySATPGateway({
    pluginImportType: PluginImportType.Local,
  });
    
  public get className(): string {
    return CbdcBridgingAppDummyInfrastructure.CLASS_NAME;
  }

  public get orgCfgDir(): string {
    return CbdcBridgingAppDummyInfrastructure.FABRIC_2_AIO_CLI_CFG_DIR;
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
      this.besuFirstHighNetWorthAccountPriv = this.besu.getGenesisAccountPrivKey();
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

    const keychainEntryKey3 = "bridge";
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

    const pluginRegistry = new PluginRegistry({ plugins: [this.fabricKeychainPlugin] });

    this.fabricOptions = {
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
    }
    this.log.info(`Creating Fabric Connector...`);
    return new PluginLedgerConnectorFabric(this.fabricOptions);
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

  public async createSATPGateway(
    id: string,
    name: string,
    hostPath: string,
    serverPort: number,
    clientPort: number,
    apiPort: number,
    supportedDLTs: SupportedChain[],
    proofID: string,
    version: DraftVersions[],
    logLevel: LogLevelDesc,
    counterPartyGateways: GatewayIdentity[],
    bridgesConfig: NetworkConfig[],
  ): Promise<SATPGateway> {~
    this.log.info(`Creating Source Gateway...`);
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity = {
      id,
      name,
      version,
      supportedDLTs,
      proofID,
      address: `http://${hostPath}`,
      gatewayServerPort: serverPort,
      gatewayClientPort: clientPort,
      gatewayOpenAPIPort: apiPort,
    } as GatewayIdentity;

    const options: SATPGatewayConfig = {
      logLevel: logLevel,
      gid: gatewayIdentity,
      counterPartyGateways,
      bridgesConfig: bridgesConfig,
    };
    return await factory.create(options);
  }

  public async createSATPGateways(): Promise<SATPGateway[]> {
    const fnTag = `${this.className}#createSATPGateways()`;
    const logLevel = this.options.logLevel || "INFO";

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
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "besuGatewayProofID",
      address: `http://localhost`,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    const pluginBungeeFabricOptions = { //todo change this when bungee is implemented
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    const pluginBungeeBesuOptions = { //todo change this when bungee is implemented
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
      options: this.fabricOptions,
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

    const besuGatewayOptions = {
      logLevel: logLevel,
      gid: besuGatewayIdentity,
      counterPartyGateways: [fabricGatewayIdentity],
      bridgesConfig: [besuConfig],
    };

    const fabricGatewayOptions = {
      logLevel: logLevel,
      gid: fabricGatewayIdentity,
      counterPartyGateways: [besuGatewayIdentity],
      bridgesConfig: [fabricConfig],
    };

    const besuGateway = await this.gatewayFactory.create(besuGatewayOptions);

    this.log.info(`Besu Gateway created`);

    const fabricGateway = await this.gatewayFactory.create(fabricGatewayOptions);
    
    this.log.info(`Fabric Gateway created`);


    return [fabricGateway, besuGateway];
  }

  public async deployFabricSATPContract(
    fabricApiClient: FabricApi,
  ): Promise<void> {
    const channelId = "mychannel";

    const contractName = CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT

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
    
    const res = await fabricApiClient
      .deployContractV1(
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

      const { packageIds, lifecycle, success } = res.data;
      expect(res.status).toBe(200);
      expect(success).toBe(true);
      expect(lifecycle).not.toBeUndefined();
  
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
  

  public async deployFabricWrapperContract(
    fabricApiClient: FabricApi,
  ): Promise<void> {
    const channelId = "mychannel";

    const contractName = CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER;

    const contractRelPath = "../../../fabric-contracts/satp-wrapper/chaincode-typescript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── index.js
    // ├── lib
    // │   ├── tokenERC20.js
    const wrapperSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
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
      const filePath = path.join(
        contractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    await fabricApiClient
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

  public async deployBesuContracts(besuApiClient: BesuApi): Promise<void> {
    const fnTag = `${this.className}#deployBesuContracts()`;

    const deployCbdcContractResponse =
      await besuApiClient.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
        contractAbi: SATPContract.abi,
        constructorArgs: [this.besuFirstHighNetWorthAccount, CbdcBridgingAppDummyInfrastructure.BESU_ASSET_ID],
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
    
    this.besuContractAddress = deployCbdcContractResponse.data.transactionReceipt.contractAddress ?? "";

    const deployWrapperContractResponse =
      await besuApiClient.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
        contractAbi: SATPWrapperContract.abi,
        constructorArgs: [
          CryptoMaterial.accounts["bridge"].ethAddress,
        ],
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

    this.besuWrapperContractAddress = deployWrapperContractResponse.data.transactionReceipt.contractAddress ?? "";

    const giveRoleRes = await besuApiClient.invokeContractV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      keychainId: CryptoMaterial.keychains.keychain2.id,
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [deployWrapperContractResponse.data.transactionReceipt.contractAddress],
      signingCredential: {
        ethAccount: this.besuFirstHighNetWorthAccount,
        secret: this.besuFirstHighNetWorthAccountPriv,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });

    Checks.truthy(giveRoleRes, "giveRoleRes");
  }

  public async initializeContractsAndAddPermitions(fabricApiClient: FabricApi, besuApiClient: BesuApi) {

    const fabricInitializeResponse = await fabricApiClient.runTransactionV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      params: [this.userIdentity1.mspId, CbdcBridgingAppDummyInfrastructure.FABRIC_ASSET_ID],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: this.fabricKeychainPlugin?.getKeychainId()!,
        keychainRef: "userA",
      },
    });

    Checks.truthy(fabricInitializeResponse, "fabricInitializeResponse");
    Checks.truthy(fabricInitializeResponse.status, "fabricInitializeResponse.data");

    if(fabricInitializeResponse.status < 200 || fabricInitializeResponse.status > 299) {
      throw new Error("Failed to initialize CBDC Fabric contract");
    }

    const fabricWrapperInitializeResponse = await fabricApiClient.runTransactionV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      params: ["Org2MSP"],
      methodName: "Initialize",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: this.fabricKeychainPlugin?.getKeychainId()!,
        keychainRef: "adminUser",
      },
    });

    Checks.truthy(fabricWrapperInitializeResponse, "fabricWrapperInitializeResponse");
    Checks.truthy(fabricWrapperInitializeResponse.status, "fabricWrapperInitializeResponse.data");

    if(fabricWrapperInitializeResponse.status < 200 || fabricWrapperInitializeResponse.status > 299) {
      throw new Error("Failed to initialize Wrapper Fabric contract");
    }

    const setBridgeWrapperResponse = await fabricApiClient.runTransactionV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_WRAPPER,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      params: ["Org2MSP", CryptoMaterial.accounts.bridge.fabricID],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: this.fabricKeychainPlugin?.getKeychainId()!,
        keychainRef: "adminUser",
      },
    });

    Checks.truthy(setBridgeWrapperResponse, "setBridgeWrapperResponse");
    Checks.truthy(setBridgeWrapperResponse.status, "setBridgeResponse.data");

    if(setBridgeWrapperResponse.status < 200 || setBridgeWrapperResponse.status > 299) {
      throw new Error("Failed to set Bridge Fabric contract");
    }

    const setBridgeCBDCResponse = await fabricApiClient.runTransactionV1({
      contractName: CbdcBridgingAppDummyInfrastructure.SATP_CONTRACT,
      channelName: CbdcBridgingAppDummyInfrastructure.FABRIC_CHANNEL_NAME,
      params: ["Org2MSP"],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: this.fabricKeychainPlugin?.getKeychainId()!,
        keychainRef: "userA",
      },
    });

    Checks.truthy(setBridgeCBDCResponse, "setBridgeCBDCResponse");
    Checks.truthy(setBridgeCBDCResponse.status, "setBridgeCBDCResponse.data");

    if(setBridgeCBDCResponse.status < 200 || setBridgeCBDCResponse.status > 299) {
      throw new Error("Failed to set Bridge Fabric contract");
    }

    const besuInitializeResponse = await besuApiClient.invokeContractV1({
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
    });

    Checks.truthy(besuInitializeResponse, "besuInitializeResponse");
    Checks.truthy(besuInitializeResponse.status, "besuInitializeResponse.data");

    if(besuInitializeResponse.status < 200 || besuInitializeResponse.status > 299) {
      throw new Error("Failed to initialize CBDC Besu contract");
    }

  }
}