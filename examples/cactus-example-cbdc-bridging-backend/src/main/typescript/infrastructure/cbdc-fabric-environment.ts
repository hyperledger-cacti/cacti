import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  ChainCodeProgrammingLanguage,
  ConnectionProfile,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FabricSigningCredential,
  FileBase64,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  ClaimFormat,
  INetworkOptions,
  NetworkId,
  NetworkIdLedgerTypeEnum,
  TokenType,
  TransactRequestSourceAsset,
} from "@hyperledger/cactus-plugin-satp-hermes";
import {
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
} from "@hyperledger/cactus-test-tooling";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { Config } from "node-ssh";
import { randomUUID as uuidv4 } from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { getUserFromPseudonim } from "./utils";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";
import ExampleOntology from "../../json/ontologies/ontology-satp-erc20-interact-fabric.json";
import { PeerCerts } from "@hyperledger/cactus-test-tooling/dist/lib/main/typescript/fabric/fabric-test-ledger-v1";
import {
  TargetOrganization,
  FabricConfigJSON,
} from "@hyperledger/cactus-plugin-satp-hermes";

export class FabricEnvironment {
  public static readonly FABRIC_NETWORK_ID: string = "FabricLedgerNetwork";
  public static readonly SATP_CONTRACT_NAME: string = "CBDCContract";
  public static readonly FABRIC_ASSET_ID: string = "FabricAsset";
  public static readonly FABRIC_ASSET_REFERENCE_ID: string = ExampleOntology.id;

  private readonly network: NetworkId = {
    id: FabricEnvironment.FABRIC_NETWORK_ID,
    ledgerType: LedgerType.Fabric2,
  };
  private ledger!: FabricTestLedgerV1;
  private dockerNetwork: string = "fabric";
  private readonly log: Logger;
  private fabricChannelName: string = "mychannel";
  private connectionProfileOrg1?: ConnectionProfile;
  private connectionProfileBridge?: ConnectionProfile;
  private userIdentity1?: X509Identity;
  private userIdentity2?: X509Identity;
  private bridgeIdentity?: X509Identity;
  private bridgeMSPID: string = "Org2MSP";
  private sshConfig?: Config;
  private keychainPluginBridge?: PluginKeychainMemory;
  private keychainEntryKeyBridge?: string;
  private keychainEntryValueBridge?: string;
  private pluginRegistryBridge?: PluginRegistry;
  private discoveryOptions?: DiscoveryOptions;
  private connector?: PluginLedgerConnectorFabric;
  private fabricSigningCredential?: FabricSigningCredential;
  private bridgeFabricSigningCredential?: FabricSigningCredential;
  private fabricKeychainPlugin?: PluginKeychainMemory;
  private approveAddress?: string;

  private peer0Org1Certs: PeerCerts | undefined;
  private peer0Org2Certs: PeerCerts | undefined;
  private coreFile: FileBase64 | undefined;

  private readonly logLevel: LogLevelDesc;

  public constructor(logLevel: LogLevelDesc, network?: string) {
    if (network) {
      this.dockerNetwork = network;
    }

    this.logLevel = logLevel || "INFO";
    const label = "FabricTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });
  }

  public async init(): Promise<void> {
    this.ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      networkName: this.dockerNetwork,
    });

    await this.ledger.start();

    this.connectionProfileOrg1 =
      await this.ledger.getConnectionProfileOrgX("org1");
    this.connectionProfileBridge =
      await this.ledger.getConnectionProfileOrgX("org2");
    if (!this.connectionProfileOrg1) {
      throw new Error("connectionProfileOrg1 is undefined");
    }
    if (!this.connectionProfileBridge) {
      throw new Error("connectionProfileBridge is undefined");
    }

    const enrollAdminOutOrg1 = await this.ledger.enrollAdmin();
    const adminWalletOrg1 = enrollAdminOutOrg1[1];

    const [adminIdentityOrg1] = await this.ledger.enrollUserV2({
      wallet: adminWalletOrg1,
      enrollmentID: "adminUser",
      organization: "org1",
    });

    [this.userIdentity1] = await this.ledger.enrollUserV2({
      wallet: adminWalletOrg1,
      enrollmentID: "userA",
      organization: "org1",
    });
    const [userIdentity2] = await this.ledger.enrollUserV2({
      wallet: adminWalletOrg1,
      enrollmentID: "userB",
      organization: "org1",
    });

    const enrollAdminOutOrg2 = await this.ledger.enrollAdminV2({
      organization: "org2",
    });
    const adminWalletOrg2 = enrollAdminOutOrg2[1];
    [this.bridgeIdentity] = await this.ledger.enrollUserV2({
      wallet: adminWalletOrg2,
      enrollmentID: "bridge",
      organization: "org2",
    });

    this.sshConfig = await this.ledger.getSshConfig();

    this.log.debug("enrolled admin");

    const keychainEntryKey1 = "userA";
    const keychainEntryValue1 = JSON.stringify(this.userIdentity1);

    const keychainEntryKey2 = "userB";
    const keychainEntryValue2 = JSON.stringify(userIdentity2);

    const keychainEntryKey3 = "bridge";
    const keychainEntryValue3 = JSON.stringify(this.bridgeIdentity);

    const keychainEntryKey4 = "adminUser";
    const keychainEntryValue4 = JSON.stringify(adminIdentityOrg1);

    const keychainId = uuidv4();
    this.fabricKeychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: keychainId,
      logLevel: this.logLevel || "INFO",
      backend: new Map([
        [keychainEntryKey1, keychainEntryValue1],
        [keychainEntryKey2, keychainEntryValue2],
        [keychainEntryKey3, keychainEntryValue3],
        [keychainEntryKey4, keychainEntryValue4],
      ]),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [this.fabricKeychainPlugin],
    });

    this.keychainEntryKeyBridge = "user2";
    this.keychainEntryValueBridge = JSON.stringify(this.bridgeIdentity);

    this.discoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const connectorOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      pluginRegistry,
      logLevel: this.logLevel,
      connectionProfile: this.connectionProfileOrg1,
      discoveryOptions: this.discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
      dockerNetworkName: this.dockerNetwork,
    };

    this.connector = new PluginLedgerConnectorFabric(connectorOptions);

    this.fabricSigningCredential = {
      keychainId: keychainId,
      keychainRef: keychainEntryKey4,
    };

    this.peer0Org1Certs = await this.ledger.getPeerOrgCertsAndConfig(
      "org1",
      "peer0",
    );
    this.peer0Org2Certs = await this.ledger.getPeerOrgCertsAndConfig(
      "org2",
      "peer0",
    );

    const filePath = path.join(__dirname, "../../yml/resources/core.yml");
    const buffer = await fs.readFile(filePath);
    this.coreFile = {
      body: buffer.toString("base64"),
      filename: "core.yaml",
    };
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts() {
    const satpContractRelPath =
      "./fabric-contracts/satp-contract/chaincode-typescript";
    const satpContractDir = path.join(__dirname, satpContractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── index.ts
    // │   ├── ITraceableContract.ts
    // │   ├── satp-contract-interface.ts
    // │   ├── satp-contract.ts
    // ├── tsconfig.json
    // ├── lib
    // │   └── tokenERC20.js
    // --------
    const satpSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
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
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    if (!this.peer0Org1Certs || !this.peer0Org2Certs || !this.coreFile) {
      throw new Error("Peer certificates are not defined");
    }

    const res = await this.connector?.deployContract({
      channelId: this.fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: satpSourceFiles,
      ccName: FabricEnvironment.SATP_CONTRACT_NAME,
      targetOrganizations: [
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: this.peer0Org1Certs.mspConfig,
          CORE_PEER_TLS_ROOTCERT: this.peer0Org1Certs.peerTlsCert,
          ORDERER_TLS_ROOTCERT: this.peer0Org1Certs.ordererTlsRootCert,
        },
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: this.peer0Org2Certs.mspConfig,
          CORE_PEER_TLS_ROOTCERT: this.peer0Org2Certs.peerTlsCert,
          ORDERER_TLS_ROOTCERT: this.peer0Org2Certs.ordererTlsRootCert,
        },
      ],
      caFile: this.peer0Org1Certs.ordererTlsRootCert,
      ccLabel: "satp-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      coreYamlFile: this.coreFile,
    });

    if (!res) {
      throw new Error("Deploy Contract Response is undefined");
    }
    const { packageIds, lifecycle } = res;

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

    const initializeResponse = await this.connector?.transact({
      contractName: FabricEnvironment.SATP_CONTRACT_NAME,
      channelName: this.fabricChannelName,
      params: [
        this.userIdentity1?.mspId ?? "",
        FabricEnvironment.FABRIC_ASSET_ID,
      ],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential:
        this.fabricSigningCredential ??
        (() => {
          throw new Error("fabricSigningCredential is undefined");
        })(),
    });
    if (!initializeResponse) {
      throw new Error("Initialization response is undefined");
    }

    this.log.info(
      `SATPContract.InitToken(): ${JSON.stringify(initializeResponse)}`,
    );
  }

  public async mintTokensFabric(frontendUser: string, amount: string) {
    this.log.debug(
      `Minting Fabric tokens for user: ${frontendUser}, amount: ${amount}`,
    );
    if (!this.connector) {
      throw new Error("Connector is not initialized");
    }

    try {
      const response = await this.connector?.transact({
        contractName: FabricEnvironment.SATP_CONTRACT_NAME,
        channelName: this.fabricChannelName,
        params: [amount],
        methodName: "mint",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricSigningCredential?.keychainId ?? "",
          keychainRef: getUserFromPseudonim(frontendUser),
        },
      });

      this.log.debug(
        `Fabric - Minting tokens for user: ${frontendUser} is ${JSON.stringify(response)}`,
      );
    } catch (error) {
      console.error(error.msg);
      throw new Error("Failed to mint tokens");
    }
  }

  public getFabricId(user: string) {
    switch (getUserFromPseudonim(user)) {
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

  public getFabricAsset(owner: string, amount: string) {
    return {
      owner: owner,
      contractName: FabricEnvironment.SATP_CONTRACT_NAME,
      channelName: this.fabricChannelName,
      mspId: "Org1MSP",
      id: FabricEnvironment.FABRIC_ASSET_ID,
      referenceId: FabricEnvironment.FABRIC_ASSET_REFERENCE_ID,
      amount,
      tokenType: TokenType.NonstandardFungible,
      networkId: {
        id: FabricEnvironment.FABRIC_NETWORK_ID,
        ledgerType: NetworkIdLedgerTypeEnum.Fabric2,
      },
    } as TransactRequestSourceAsset;
  }

  public async getAmountApprovedFabric(frontendUser: string) {
    const owner = this.getFabricId(frontendUser);
    this.log.debug(`Getting Fabric approved balance for user: ${frontendUser}`);

    if (!this.connector) {
      throw new Error("Connector is not initialized");
    }

    let response;
    try {
      response = await this.connector.transact({
        contractName: FabricEnvironment.SATP_CONTRACT_NAME,
        channelName: this.fabricChannelName,
        params: [owner, this.approveAddress!],
        methodName: "Allowance",
        invocationType: FabricContractInvocationType.Call,
        signingCredential: {
          keychainId: this.fabricSigningCredential?.keychainId ?? "",
          keychainRef: getUserFromPseudonim(frontendUser),
        },
      });
    } catch (error) {
      this.log.error(
        `Fabric - Error getting approved balance user: ${frontendUser}`,
      );
      return "0";
    }

    return response.functionOutput;
  }
  public setApproveAddress(approveAddress: string) {
    this.approveAddress = approveAddress;
  }

  public async approveNTokensFabric(user: string, amount: string) {
    this.log.debug(`Approving Fabric tokens for user: ${user}`);

    if (!this.connector) {
      throw new Error("Connector is not initialized");
    }
    await this.connector?.transact({
      contractName: FabricEnvironment.SATP_CONTRACT_NAME,
      channelName: this.fabricChannelName,
      params: [this.approveAddress!, amount],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId: this.fabricSigningCredential?.keychainId ?? "",
        keychainRef: getUserFromPseudonim(user),
      },
    });
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
    if (!this.connector) {
      throw new Error("Connector is not initialized");
    }

    try {
      await this.connector.transact({
        contractName: FabricEnvironment.SATP_CONTRACT_NAME,
        channelName: this.fabricChannelName,
        params: [to, amount],
        methodName: "transfer",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: {
          keychainId: this.fabricSigningCredential?.keychainId ?? "",
          keychainRef: getUserFromPseudonim(frontendUserFrom),
        },
      });
    } catch (error) {
      console.error(error.msg);
      throw new Error("Failed to transfer tokens");
    }
  }

  public async getFabricBalance(frontendUser: string) {
    const fabricID = this.getFabricId(frontendUser);
    this.log.debug(`Getting Fabric balance for user: ${frontendUser}`);
    let response;

    if (!this.connector) {
      throw new Error("Connector is not initialized");
    }

    try {
      response = await this.connector.transact({
        contractName: FabricEnvironment.SATP_CONTRACT_NAME,
        channelName: this.fabricChannelName,
        params: [fabricID],
        methodName: "ClientIDAccountBalance",
        invocationType: FabricContractInvocationType.Call,
        signingCredential: {
          keychainId: this.fabricSigningCredential?.keychainId ?? "",
          keychainRef: getUserFromPseudonim(frontendUser),
        },
      });
      this.log.debug(
        `Fabric - Balance for user: ${frontendUser} is ${JSON.stringify(response)}`,
      );
    } catch (error) {
      this.log.error(`Fabric - Error getting balance user: ${frontendUser}`);
      return -1;
    }

    return parseInt(response.functionOutput);
  }

  public async createFabricDockerConfig(
    testFilesDirectory: string,
  ): Promise<FabricConfigJSON & INetworkOptions> {
    if (!this.peer0Org1Certs || !this.peer0Org2Certs || !this.coreFile) {
      throw new Error("Peer certificates are not defined");
    }

    const testFileCerts = path.join(testFilesDirectory, "certs");

    if (!fs.existsSync(testFileCerts)) {
      fs.mkdirSync(testFileCerts, { recursive: true });
    }

    for (const org of ["org1", "org2"]) {
      if (!fs.existsSync(path.join(testFileCerts, "certs", org))) {
        fs.mkdirSync(path.join(testFileCerts, org), {
          recursive: true,
        });
      } else {
        // Clear the directory if it already exists
        fs.emptyDirSync(path.join(testFileCerts, org));
      }
    }

    // Write peer certs and core.yaml to files in the testFilesDirectory
    const org1Dir = path.join(testFileCerts, "org1");
    const org2Dir = path.join(testFileCerts, "org2");
    const coreYamlPath = path.join(testFileCerts, "core.yaml");

    // Org1 certs
    const org1MspConfigPath = path.join(org1Dir, "msp");
    const org1PeerTlsCertPath = path.join(org1Dir, "peerTlsCert.pem");
    const org1OrdererTlsRootCertPath = path.join(
      org1Dir,
      "ordererTlsRootCert.pem",
    );

    // Org2 certs
    const org2MspConfigPath = path.join(org2Dir, "msp");
    const org2PeerTlsCertPath = path.join(org2Dir, "peerTlsCert.pem");
    const org2OrdererTlsRootCertPath = path.join(
      org2Dir,
      "ordererTlsRootCert.pem",
    );

    // mspConfig is a folder of files with relative paths, so we need to write each file
    for (const peerCerts of [
      { certs: this.peer0Org1Certs, mspPath: org1MspConfigPath },
      { certs: this.peer0Org2Certs, mspPath: org2MspConfigPath },
    ]) {
      for (const file of peerCerts.certs.mspConfig) {
        const destPath = path.join(
          peerCerts.mspPath,
          file.filepath || "",
          file.filename,
        );
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        // Ensure fileContent is a string or Buffer
        await fs.writeFile(destPath, Buffer.from(file.body, "base64"));
      }
    }

    await fs.writeFile(org1PeerTlsCertPath, this.peer0Org1Certs.peerTlsCert);
    await fs.writeFile(
      org1OrdererTlsRootCertPath,
      this.peer0Org1Certs.ordererTlsRootCert,
    );

    await fs.writeFile(org2PeerTlsCertPath, this.peer0Org2Certs.peerTlsCert);
    await fs.writeFile(
      org2OrdererTlsRootCertPath,
      this.peer0Org2Certs.ordererTlsRootCert,
    );

    // core.yaml
    await fs.writeFile(coreYamlPath, Buffer.from(this.coreFile.body, "base64"));

    // targetOrganizations array
    const basePath = path.join("/opt/cacti/satp-hermes/config", "certs");
    const targetOrganizations: TargetOrganization[] = [
      {
        CORE_PEER_LOCALMSPID:
          FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_LOCALMSPID,
        CORE_PEER_ADDRESS:
          FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
        CORE_PEER_MSPCONFIG_PATH: path.join(basePath, "org1/msp"),
        CORE_PEER_TLS_ROOTCERT_PATH: path.join(
          basePath,
          "/org1/peerTlsCert.pem",
        ),
        ORDERER_TLS_ROOTCERT_PATH: path.join(
          basePath,
          "/org1/ordererTlsRootCert.pem",
        ),
      },
      {
        CORE_PEER_LOCALMSPID:
          FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_LOCALMSPID,
        CORE_PEER_ADDRESS:
          FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
        CORE_PEER_MSPCONFIG_PATH: path.join(basePath, "org2/msp"),
        CORE_PEER_TLS_ROOTCERT_PATH: path.join(
          basePath,
          "/org2/peerTlsCert.pem",
        ),
        ORDERER_TLS_ROOTCERT_PATH: path.join(
          basePath,
          "/org2/ordererTlsRootCert.pem",
        ),
      },
    ];
    this.peer0Org2Certs;
    return {
      networkIdentification: this.network,
      userIdentity: this.bridgeIdentity,
      channelName: this.fabricChannelName,
      targetOrganizations: targetOrganizations,
      caFilePath: path.join(basePath, "/org2/ordererTlsRootCert.pem"),
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      mspId: this.bridgeMSPID,
      connectorOptions: {
        connectionProfile: await this.ledger.getConnectionProfileOrgX(
          "org2",
          false,
        ),
        discoveryOptions: {
          enabled: true,
          asLocalhost: false,
        },
        eventHandlerOptions: {
          strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
          commitTimeout: 300,
        },
      },
      claimFormats: [ClaimFormat.DEFAULT],
      coreYamlFilePath: path.join(basePath, "core.yaml"),
    };
  }

  public async giveRoleToBridge(mspID: string): Promise<void> {
    const setBridgeResponse = await this.connector?.transact({
      contractName: FabricEnvironment.SATP_CONTRACT_NAME,
      channelName: this.fabricChannelName,
      params: [mspID],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential:
        this.fabricSigningCredential ??
        (() => {
          throw new Error("fabricSigningCredential is undefined");
        })(),
    });
    if (!setBridgeResponse) {
      throw new Error("setBridgeResponse is undefined");
    }

    this.log.info(
      `SATPWrapper.setBridge(): ${JSON.stringify(setBridgeResponse)}`,
    );
  }
  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
