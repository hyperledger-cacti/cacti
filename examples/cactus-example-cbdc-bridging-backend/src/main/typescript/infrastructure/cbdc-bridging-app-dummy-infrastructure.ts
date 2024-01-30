import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  DEFAULT_FABRIC_2_AIO_FABRIC_VERSION,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
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
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  DefaultApi as BesuApi,
  DeployContractSolidityBytecodeV1Request,
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginRegistry } from "@hyperledger/cactus-core";
import AssetReferenceContractJson from "../../../solidity/asset-reference-contract/AssetReferenceContract.json";
import CBDCcontractJson from "../../../solidity/cbdc-erc-20/CBDCcontract.json";
import { IKeyPair } from "@hyperledger/cactus-plugin-satp-hermes";
import { FabricSATPGateway } from "../satp-extension/fabric-satp-gateway";
import { BesuSATPGateway } from "../satp-extension/besu-satp-gateway";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";
import { ClientHelper } from "../satp-extension/client-helper";
import { ServerHelper } from "../satp-extension/server-helper";

export interface ICbdcBridgingAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
}

export class CbdcBridgingAppDummyInfrastructure {
  public static readonly CLASS_NAME = "CbdcBridgingAppDummyInfrastructure";
  // TODO: Move this to the FabricTestLedger class where it belongs.
  public static readonly FABRIC_2_AIO_CLI_CFG_DIR =
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";

  private readonly besu: BesuTestLedger;
  private readonly fabric: FabricTestLedgerV1;
  private readonly log: Logger;

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
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
      envVars: new Map([
        ["FABRIC_VERSION", DEFAULT_FABRIC_2_AIO_FABRIC_VERSION],
      ]),
      logLevel: level || "DEBUG",
    });
  }

  public get org1Env(): NodeJS.ProcessEnv & DeploymentTargetOrgFabric2x {
    return {
      CORE_LOGGING_LEVEL: "debug",
      FABRIC_LOGGING_SPEC: "debug",
      CORE_PEER_LOCALMSPID: "Org1MSP",

      ORDERER_CA: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

      FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
      CORE_PEER_TLS_ENABLED: "true",
      CORE_PEER_TLS_ROOTCERT_FILE: `${this.orgCfgDir}peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
      CORE_PEER_MSPCONFIGPATH: `${this.orgCfgDir}peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
      CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
      ORDERER_TLS_ROOTCERT_FILE: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    };
  }

  public get org2Env(): NodeJS.ProcessEnv & DeploymentTargetOrgFabric2x {
    return {
      CORE_LOGGING_LEVEL: "debug",
      FABRIC_LOGGING_SPEC: "debug",
      CORE_PEER_LOCALMSPID: "Org2MSP",

      FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
      CORE_PEER_TLS_ENABLED: "true",
      ORDERER_CA: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

      CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
      CORE_PEER_MSPCONFIGPATH: `${this.orgCfgDir}peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp`,
      CORE_PEER_TLS_ROOTCERT_FILE: `${this.orgCfgDir}peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`,
      ORDERER_TLS_ROOTCERT_FILE: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    };
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await Promise.all([this.besu.start(), this.fabric.start()]);
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
    const enrollAdminOutOrg1 = await this.fabric.enrollAdminV2({
      organization: "org1",
    });
    const adminWalletOrg1 = enrollAdminOutOrg1[1];
    const [userIdentity1] = await this.fabric.enrollUserV2({
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

    const sshConfig = await this.fabric.getSshConfig();

    const keychainEntryKey1 = "userA";
    const keychainEntryValue1 = JSON.stringify(userIdentity1);

    const keychainEntryKey2 = "userB";
    const keychainEntryValue2 = JSON.stringify(userIdentity2);

    const keychainEntryKey3 = "bridge";
    const keychainEntryValue3 = JSON.stringify(bridgeIdentity);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: CryptoMaterial.keychains.keychain1.id,
      logLevel: undefined,
      backend: new Map([
        [keychainEntryKey1, keychainEntryValue1],
        [keychainEntryKey2, keychainEntryValue2],
        [keychainEntryKey3, keychainEntryValue3],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    this.log.info(`Creating Fabric Connector...`);
    return new PluginLedgerConnectorFabric({
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
    });
  }

  public async createBesuLedgerConnector(): Promise<PluginLedgerConnectorBesu> {
    const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();
    const rpcApiWsHost = await this.besu.getRpcApiWsHost();

    const keychainEntryKey = AssetReferenceContractJson.contractName;
    const keychainEntryValue = JSON.stringify(AssetReferenceContractJson);

    const keychainEntryKey2 = CBDCcontractJson.contractName;
    const keychainEntryValue2 = JSON.stringify(CBDCcontractJson);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: CryptoMaterial.keychains.keychain2.id,
      logLevel: undefined,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        [keychainEntryKey2, keychainEntryValue2],
      ]),
    });

    this.log.info(`Creating Besu Connector...`);
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const besuConnector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

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

  public async createClientGateway(
    nodeApiHost: string,
    keyPair: IKeyPair,
  ): Promise<FabricSATPGateway> {
    this.log.info(`Creating Source Gateway...`);
    const pluginSourceGateway = new FabricSATPGateway({
      name: "cactus-plugin-source#satpGateway",
      dltIDs: ["DLT2"],
      instanceId: uuidv4(),
      keyPair: keyPair,
      fabricPath: nodeApiHost,
      fabricSigningCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "bridge",
      },
      fabricChannelName: "mychannel",
      fabricContractName: "asset-reference-contract",
      clientHelper: new ClientHelper(),
      serverHelper: new ServerHelper({}),
    });

    await pluginSourceGateway.localRepository?.reset();
    await pluginSourceGateway.remoteRepository?.reset();

    return pluginSourceGateway;
  }

  public async createServerGateway(
    nodeApiHost: string,
    keyPair: IKeyPair,
  ): Promise<BesuSATPGateway> {
    this.log.info(`Creating Recipient Gateway...`);
    const pluginRecipientGateway = new BesuSATPGateway({
      name: "cactus-plugin-recipient#satpGateway",
      dltIDs: ["DLT1"],
      instanceId: uuidv4(),
      keyPair: keyPair,
      besuPath: nodeApiHost,
      besuWeb3SigningCredential: {
        ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
        secret: CryptoMaterial.accounts["bridge"].privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      besuContractName: AssetReferenceContractJson.contractName,
      besuKeychainId: CryptoMaterial.keychains.keychain2.id,
      clientHelper: new ClientHelper(),
      serverHelper: new ServerHelper({}),
    });

    await pluginRecipientGateway.localRepository?.reset();
    await pluginRecipientGateway.remoteRepository?.reset();

    return pluginRecipientGateway;
  }

  public async deployFabricAssetReferenceContract(
    fabricApiClient: FabricApi,
  ): Promise<void> {
    const channelId = "mychannel";

    const contractName = "asset-reference-contract";

    const contractRelPath =
      "../../../fabric-contracts/asset-reference/typescript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   └── index.ts
    // ├── tsconfig.json
    // └── tslint.json
    const sourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
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
      sourceFiles.push({
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
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./asset-reference.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./asset-reference-contract.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    let retries = 0;
    while (retries <= 5) {
      await fabricApiClient
        .deployContractV1(
          {
            channelId,
            ccVersion: "1.0.0",
            sourceFiles,
            ccName: contractName,
            targetOrganizations: [this.org1Env, this.org2Env],
            caFile: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
            ccLabel: "asset-reference-contract",
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
          retries = 6;

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
      retries++;
    }
  }

  public async deployFabricCbdcContract(
    fabricApiClient: FabricApi,
  ): Promise<void> {
    const channelId = "mychannel";
    const channelName = channelId;

    const contractName = "cbdc";

    const contractRelPath = "../../../fabric-contracts/cbdc-erc-20/javascript";
    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── index.js
    // ├── lib
    // │   ├── tokenERC20.js
    const sourceFiles: FileBase64[] = [];
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.js";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./tokenERC20.js";
      const relativePath = "./lib/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./crypto-material.json";
      const relativePath = "./crypto-material/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    let retries = 0;
    while (retries <= 5) {
      await fabricApiClient
        .deployContractV1(
          {
            channelId,
            ccVersion: "1.0.0",
            sourceFiles,
            ccName: contractName,
            targetOrganizations: [this.org1Env, this.org2Env],
            caFile: `${this.orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
            ccLabel: "cbdc",
            ccLang: ChainCodeProgrammingLanguage.Javascript,
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
          retries = 6;

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

          // FIXME - without this wait it randomly fails with an error claiming that
          // the endorsement was impossible to be obtained. The fabric-samples script
          // does the same thing, it just waits 10 seconds for good measure so there
          // might not be a way for us to avoid doing this, but if there is a way we
          // absolutely should not have timeouts like this, anywhere...
          let retries_2 = 0;
          while (retries_2 <= 5) {
            await new Promise((resolve) => setTimeout(resolve, 10000));

            await fabricApiClient
              .runTransactionV1({
                contractName,
                channelName,
                params: ["name1", "symbol1", "8"],
                methodName: "Initialize",
                invocationType: FabricContractInvocationType.Send,
                signingCredential: {
                  keychainId: CryptoMaterial.keychains.keychain1.id,
                  keychainRef: "userA",
                },
              })
              .then(() => (retries_2 = 6))
              .catch(() =>
                console.log("trying to Initialize fabric contract again"),
              );
            retries_2++;
          }
        })
        .catch(() => console.log("trying to deploy fabric contract again"));
      retries++;
    }
  }

  public async deployBesuContracts(besuApiClient: BesuApi): Promise<void> {
    const fnTag = `${this.className}#deployBesuContracts()`;

    const deployCbdcContractResponse =
      await besuApiClient.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: CBDCcontractJson.contractName,
        contractAbi: CBDCcontractJson.abi,
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
          secret: CryptoMaterial.accounts["bridge"].privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: CBDCcontractJson.bytecode,
        gas: 10000000,
      } as DeployContractSolidityBytecodeV1Request);

    if (deployCbdcContractResponse == undefined) {
      throw new Error(`${fnTag}, error when deploying CBDC smart contract`);
    }

    const deployAssetReferenceContractResponse =
      await besuApiClient.deployContractSolBytecodeV1({
        keychainId: CryptoMaterial.keychains.keychain2.id,
        contractName: AssetReferenceContractJson.contractName,
        contractAbi: AssetReferenceContractJson.abi,
        constructorArgs: [
          deployCbdcContractResponse.data.transactionReceipt.contractAddress,
        ],
        web3SigningCredential: {
          ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
          secret: CryptoMaterial.accounts["bridge"].privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: AssetReferenceContractJson.bytecode,
        gas: 10000000,
      } as DeployContractSolidityBytecodeV1Request);

    if (deployAssetReferenceContractResponse == undefined) {
      throw new Error(
        `${fnTag}, error when deploying Asset Reference smart contract`,
      );
    }

    // set Asset Reference smart contract address in cbdc one (sidechain contract)
    const insertARContractAddress = await besuApiClient.invokeContractV1({
      contractName: CBDCcontractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setAssetReferenceContract",
      gas: 1000000,
      params: [
        deployAssetReferenceContractResponse.data.transactionReceipt
          .contractAddress,
      ],
      signingCredential: {
        ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
        secret: CryptoMaterial.accounts["bridge"].privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    } as BesuInvokeContractV1Request);

    if (insertARContractAddress == undefined) {
      throw new Error(
        `${fnTag}, error when setting Asset Reference smart contract address in sidechain contract`,
      );
    }

    // make the owner of the sidechain contract the asset reference one
    const transferOwnership = await besuApiClient.invokeContractV1({
      contractName: CBDCcontractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "transferOwnership",
      gas: 1000000,
      params: [
        deployAssetReferenceContractResponse.data.transactionReceipt
          .contractAddress,
      ],
      signingCredential: {
        ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
        secret: CryptoMaterial.accounts["bridge"].privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    } as BesuInvokeContractV1Request);

    if (transferOwnership == undefined) {
      throw new Error(
        `${fnTag}, error when transferring the ownershop Reference smart contract address in sidechain contract`,
      );
    }

    // make the owner of the asset reference contract the sidechain one
    const addOwnerToAssetRefContract = await besuApiClient.invokeContractV1({
      contractName: AssetReferenceContractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "addOwner",
      gas: 1000000,
      params: [
        deployCbdcContractResponse.data.transactionReceipt.contractAddress,
      ],
      signingCredential: {
        ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
        secret: CryptoMaterial.accounts["bridge"].privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    } as BesuInvokeContractV1Request);

    if (addOwnerToAssetRefContract == undefined) {
      throw new Error(
        `${fnTag}, error when transfering CBDC smart contract ownership`,
      );
    }
  }
}
