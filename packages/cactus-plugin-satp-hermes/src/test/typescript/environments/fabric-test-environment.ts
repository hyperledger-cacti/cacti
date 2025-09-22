import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  AssetTokenTypeEnum,
  Configuration,
} from "../../../main/typescript/generated/gateway-client/typescript-axios";
import {
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  ConnectionProfile,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  PluginLedgerConnectorFabric,
  FabricContractInvocationType,
  FileBase64,
  ChainCodeProgrammingLanguage,
  RunTransactionResponse,
  IPluginLedgerConnectorFabricOptions,
  RunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { Config } from "node-ssh";
import { randomUUID as uuidv4 } from "node:crypto";
import fs from "fs-extra";
import path from "path";
import { expect } from "@jest/globals";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Asset, NetworkId } from "../../../main/typescript";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { IFabricLeafOptions } from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import ExampleOntology from "../../ontologies/ontology-satp-erc20-interact-fabric.json";
import { INetworkOptions } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-types";
import Docker from "dockerode";
import { PeerCerts } from "@hyperledger/cactus-test-tooling/dist/lib/main/typescript/fabric/fabric-test-ledger-v1";
import {
  FabricConfigJSON,
  TargetOrganization,
} from "../../../main/typescript/services/validation/config-validating-functions/bridges-config-validating-functions/validate-fabric-config";
// Test environment for Fabric ledger operations

export interface IFabricTestEnvironment {
  contractName: string;
  logLevel: LogLevelDesc;
  claimFormat?: ClaimFormat;
  network?: string;
}
export class FabricTestEnvironment {
  public static readonly FABRIC_ASSET_ID: string = "FabricExampleAsset";
  public static readonly FABRIC_REFERENCE_ID: string = ExampleOntology.id;
  public static readonly FABRIC_NETWORK_ID: string = "FabricLedgerTestNetwork";
  public readonly network: NetworkId = {
    id: FabricTestEnvironment.FABRIC_NETWORK_ID,
    ledgerType: LedgerType.Fabric2,
  };
  public ledger!: FabricTestLedgerV1;
  public connector!: PluginLedgerConnectorFabric;
  public userIdentity!: X509Identity;
  public bridgeProfile!: ConnectionProfile;
  public connectionProfile!: ConnectionProfile;
  public keychainPluginBridge!: PluginKeychainMemory;
  public keychainEntryKeyBridge!: string;
  public keychainEntryValueBridge!: string;
  public fabricSigningCredential!: FabricSigningCredential;
  public bridgeFabricSigningCredential!: FabricSigningCredential;
  public pluginRegistryBridge!: PluginRegistry;
  public sshConfig!: Config;
  public discoveryOptions!: DiscoveryOptions;
  public configFabric!: Configuration;
  public fabricChannelName!: string;
  public satpContractName!: string;
  public clientId!: string;
  public wrapperContractName?: string;
  private channelName: string = "mychannel";

  private dockerContainerIP?: string;
  private dockerNetwork: string = "fabric";

  private readonly log: Logger;

  private bridgeMSPID?: string;
  public bridgeIdentity?: X509Identity;
  private claimFormat: number;

  private peer0Org1Certs: PeerCerts | undefined;
  private peer0Org2Certs: PeerCerts | undefined;
  private coreFile: FileBase64 | undefined;

  private level: LogLevelDesc;

  private constructor(
    satpContractName: string,
    logLevel: LogLevelDesc,
    network?: string,
    claimFormat?: ClaimFormat,
  ) {
    if (network) {
      this.dockerNetwork = network;
    }
    this.satpContractName = satpContractName;

    this.claimFormat = claimFormat || ClaimFormat.DEFAULT;

    this.level = logLevel || "INFO";
    const label = "FabricTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level: this.level, label });
  }

  // Initializes the Fabric ledger, accounts, and connector for testing
  public async init(): Promise<void> {
    this.ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      networkName: this.dockerNetwork,
      logLevel: this.level,
    });

    const docker = new Docker();

    const container = await this.ledger.start();

    const containerData = await docker
      .getContainer((await container).id)
      .inspect();

    this.dockerContainerIP =
      containerData.NetworkSettings.Networks[
        this.dockerNetwork || "bridge"
      ].IPAddress;

    this.fabricChannelName = "mychannel";

    this.connectionProfile = await this.ledger.getConnectionProfileOrgX("org1");
    this.bridgeProfile = await this.ledger.getConnectionProfileOrgX("org2");
    expect(this.connectionProfile).not.toBeUndefined();
    expect(this.bridgeProfile).not.toBeUndefined();

    const enrollAdminOut = await this.ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const enrollAdminBridgeOut = await this.ledger.enrollAdminV2({
      organization: "org2",
    });
    const bridgeWallet = enrollAdminBridgeOut[1];
    [this.userIdentity] = await this.ledger.enrollUser(adminWallet);
    const opts = {
      enrollmentID: "bridge",
      organization: "org2",
      wallet: bridgeWallet,
    };
    [this.bridgeIdentity] = await this.ledger.enrollUserV2(opts);
    this.bridgeMSPID = this.bridgeIdentity!.mspId;
    this.sshConfig = await this.ledger.getSshConfig();

    this.log.debug("enrolled admin");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
    const keychainEntryValue = JSON.stringify(this.userIdentity);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel: this.level,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const keychainInstanceIdBridge = uuidv4();
    const keychainIdBridge = uuidv4();
    this.keychainEntryKeyBridge = "user2";
    this.keychainEntryValueBridge = JSON.stringify(this.bridgeIdentity);

    this.keychainPluginBridge = new PluginKeychainMemory({
      instanceId: keychainInstanceIdBridge,
      keychainId: keychainIdBridge,
      logLevel: this.level,
      backend: new Map([
        [this.keychainEntryKeyBridge, this.keychainEntryValueBridge],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    this.pluginRegistryBridge = new PluginRegistry({
      plugins: [this.keychainPluginBridge],
    });

    this.discoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const connectorOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      pluginRegistry,
      logLevel: this.level,
      connectionProfile: this.connectionProfile,
      discoveryOptions: this.discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
      dockerNetworkName: this.dockerNetwork,
    };

    this.connector = new PluginLedgerConnectorFabric(connectorOptions);

    this.fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
    this.bridgeFabricSigningCredential = {
      keychainId: keychainIdBridge,
      keychainRef: this.keychainEntryKeyBridge,
    };

    this.peer0Org1Certs = await this.ledger.getPeerOrgCertsAndConfig(
      "org1",
      "peer0",
    );
    this.peer0Org2Certs = await this.ledger.getPeerOrgCertsAndConfig(
      "org2",
      "peer0",
    );
    const filePath = path.join(__dirname, "../../yaml/resources/core.yaml");
    const buffer = await fs.readFile(filePath);
    this.coreFile = {
      body: buffer.toString("base64"),
      filename: "core.yaml",
    };
  }

  // Method to wrap the transact calls with retry logic
  private async transactWithRetry(
    request: RunTransactionRequest,
    maxRetries = 3,
  ): Promise<RunTransactionResponse> {
    for (let i = 0; i < maxRetries; i++) {
      this.log.debug(`Attempt ${i + 1} to transact`);
      try {
        return await this.connector.transact(request);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Endorsement policy failure")
        ) {
          this.log.warn(
            `Endorsement policy failure detected. Retrying... (${
              i + 1
            }/${maxRetries})`,
          );
        } else {
          throw error;
        }
      }
    }
    this.log.error(
      `Failed to complete transaction after ${maxRetries} retries due to Endorsement policy failure.`,
    );
    throw new Error(
      "Max retries reached due to endorsement policy failure. Aborting transaction.",
    );
  }

  public getTestContractName(): string {
    return this.satpContractName;
  }

  public getTestChannelName(): string {
    return this.fabricChannelName;
  }

  public getTestOwnerSigningCredential(): FabricSigningCredential {
    return this.fabricSigningCredential;
  }

  public getTestOwnerAccount(): string {
    return this.clientId;
  }

  public getBridgeMSPID(): string {
    if (this.bridgeMSPID === undefined) {
      throw new Error("Bridge MSPID is undefined");
    }
    return this.bridgeMSPID;
  }

  public getNetworkId(): string {
    return this.network.id;
  }

  public getNetworkType(): LedgerType {
    return this.network.ledgerType;
  }

  // Creates and initializes a new FabricTestEnvironment instance

  public static async setupTestEnvironment(
    config: IFabricTestEnvironment,
  ): Promise<FabricTestEnvironment> {
    const { contractName, logLevel, claimFormat, network } = config;
    const instance = new FabricTestEnvironment(
      contractName,
      logLevel,
      network,
      claimFormat,
    );
    await instance.init();
    return instance;
  }

  // this is the config to be loaded by the gateway, does not contain the log level because it will use the one in the gateway config
  public createFabricConfig(): INetworkOptions {
    return {
      networkIdentification: this.network,
      userIdentity: this.bridgeIdentity,
      channelName: this.channelName,
      targetOrganizations: [
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: this.peer0Org1Certs?.mspConfig,
          CORE_PEER_TLS_ROOTCERT: this.peer0Org1Certs?.peerTlsCert,
          ORDERER_TLS_ROOTCERT: this.peer0Org1Certs?.ordererTlsRootCert,
        },
        {
          CORE_PEER_LOCALMSPID:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_LOCALMSPID,
          CORE_PEER_ADDRESS:
            FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.CORE_PEER_ADDRESS,
          CORE_PEER_MSPCONFIG: this.peer0Org2Certs?.mspConfig,
          CORE_PEER_TLS_ROOTCERT: this.peer0Org2Certs?.peerTlsCert,
          ORDERER_TLS_ROOTCERT: this.peer0Org2Certs?.ordererTlsRootCert,
        },
      ],
      caFile: this.peer0Org2Certs?.ordererTlsRootCert,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      mspId: this.bridgeMSPID,
      connectorOptions: {
        connectionProfile: this.bridgeProfile,
        discoveryOptions: {
          enabled: true,
          asLocalhost: true,
        },
        eventHandlerOptions: {
          strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
          commitTimeout: 300,
        },
        dockerNetworkName: this.dockerNetwork,
      },
      claimFormats: [this.claimFormat],
      coreYamlFile: this.coreFile,
    } as INetworkOptions;
  }

  // this is the config to be loaded by the gateway, does not contain the log level because it will use the one in the gateway config
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
      claimFormats: [this.claimFormat],
      coreYamlFilePath: path.join(basePath, "core.yaml"),
    };
  }
  // this creates the same config as the bridge manager does
  public createFabricLeafConfig(logLevel?: LogLevelDesc): IFabricLeafOptions {
    if (!this.peer0Org1Certs || !this.peer0Org2Certs) {
      throw new Error("Peer certificates are not defined");
    }
    return {
      networkIdentification: this.network,
      signingCredential: this.bridgeFabricSigningCredential,
      channelName: this.fabricChannelName,
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
      caFile: this.peer0Org2Certs.ordererTlsRootCert,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      mspId: this.bridgeMSPID,
      connectorOptions: {
        instanceId: uuidv4(),
        pluginRegistry: this.pluginRegistryBridge,
        logLevel: logLevel,
        connectionProfile: this.bridgeProfile,
        discoveryOptions: {
          enabled: true,
          asLocalhost: true,
        },
        eventHandlerOptions: {
          strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
          commitTimeout: 300,
        },
        dockerNetworkName: this.dockerNetwork,
      },
      claimFormats: [this.claimFormat],
      logLevel: logLevel,
      coreYamlFile: this.coreFile,
    };
  }

  public async checkBalance(
    contractName: string,
    channelName: string,
    account: string,
    amount: string,
    signingCredential: FabricSigningCredential,
  ): Promise<void> {
    const responseBalance1 = await this.transactWithRetry({
      contractName: contractName,
      channelName: channelName,
      params: [account],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: signingCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.functionOutput).toBe(amount);
  }

  public async giveRoleToBridge(mspID: string): Promise<void> {
    const setBridgeResponse = await this.transactWithRetry({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [mspID],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(setBridgeResponse).not.toBeUndefined();

    this.log.info(
      `SATPWrapper.setBridge(): ${JSON.stringify(setBridgeResponse)}`,
    );
  }

  public async approveAmount(
    bridgeAddress: string,
    amount: string,
  ): Promise<void> {
    const response = await this.transactWithRetry({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [bridgeAddress, amount],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(response).not.toBeUndefined();

    this.log.info(`SATPWrapper.Approve(): ${JSON.stringify(response)}`);
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts() {
    this.satpContractName = "satp-contract";
    const satpContractRelPath =
      "./../fabric/contracts/satp-contract/chaincode-typescript";
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

    const res = await this.connector.deployContract({
      channelId: this.fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: satpSourceFiles,
      ccName: this.satpContractName,
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

    const { packageIds, lifecycle, success } = res;
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

    expect(packageIds).toBeTruthy();
    expect(Array.isArray(packageIds)).toBe(true);

    expect(approveForMyOrgList).toBeTruthy();
    expect(Array.isArray(approveForMyOrgList)).toBe(true);

    expect(installList).toBeTruthy();
    expect(Array.isArray(installList)).toBe(true);
    expect(queryInstalledList).toBeTruthy();
    expect(Array.isArray(queryInstalledList)).toBe(true);

    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();
    this.log.info("SATP Contract deployed");

    const initializeResponse = await this.transactWithRetry({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [this.userIdentity.mspId, FabricTestEnvironment.FABRIC_ASSET_ID],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(initializeResponse).not.toBeUndefined();

    this.log.info(
      `SATPContract.InitToken(): ${JSON.stringify(initializeResponse)}`,
    );

    if (this.bridgeMSPID === undefined) {
      throw new Error("Bridge MSPID is undefined");
    }

    const responseClientId = await this.transactWithRetry({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [],
      methodName: "ClientAccountID",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    this.clientId = responseClientId.functionOutput.toString();
  }

  public async deployAndSetupOracleContracts() {
    this.satpContractName = "oracle-bl-contract";
    const satpContractRelPath =
      "./../fabric/contracts/oracle-bl-contract/chaincode-typescript";
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
    const oracleSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      oracleSourceFiles.push({
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
      oracleSourceFiles.push({
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
      oracleSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./data.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      oracleSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./oracleBusinessLogic.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      oracleSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    if (!this.peer0Org1Certs || !this.peer0Org2Certs || !this.coreFile) {
      throw new Error("Peer certificates are not defined");
    }

    const res = await this.connector.deployContract({
      channelId: this.fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: oracleSourceFiles,
      ccName: this.satpContractName,
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
      ccLabel: "oracle-bl-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      coreYamlFile: this.coreFile,
    });

    const { packageIds, lifecycle, success } = res;
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

    expect(packageIds).toBeTruthy();
    expect(Array.isArray(packageIds)).toBe(true);

    expect(approveForMyOrgList).toBeTruthy();
    expect(Array.isArray(approveForMyOrgList)).toBe(true);

    expect(installList).toBeTruthy();
    expect(Array.isArray(installList)).toBe(true);
    expect(queryInstalledList).toBeTruthy();
    expect(Array.isArray(queryInstalledList)).toBe(true);

    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();
    this.log.info("Oracle Business Logic Contract deployed");

    const initializeResponse = await this.transactWithRetry({
      contractName: "oracle-bl-contract",
      channelName: this.fabricChannelName,
      params: [],
      methodName: "InitLedger",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(initializeResponse).not.toBeUndefined();

    this.log.info(
      `OracleBLContract.InitLedger(): ${JSON.stringify(initializeResponse)}`,
    );

    if (this.bridgeMSPID === undefined) {
      throw new Error("Bridge MSPID is undefined");
    }
  }

  public async writeData(
    contractName: string,
    methodName: string,
    params: string[],
  ): Promise<RunTransactionResponse> {
    const readData = await this.transactWithRetry({
      contractName: contractName,
      channelName: this.fabricChannelName,
      params: params,
      methodName: methodName,
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });
    expect(readData).not.toBeUndefined();

    return readData;
  }

  public async readData(
    contractName: string,
    methodName: string,
    params: string[],
  ): Promise<RunTransactionResponse> {
    const readData = await this.transactWithRetry({
      contractName: contractName,
      channelName: this.fabricChannelName,
      params: params,
      methodName: methodName,
      invocationType: FabricContractInvocationType.Call,
      signingCredential: this.fabricSigningCredential,
    });
    expect(readData).not.toBeUndefined();

    return readData;
  }

  public async mintTokens(amount: string): Promise<void> {
    const responseMint = await this.transactWithRetry({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [amount],
      methodName: "Mint",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });
    expect(responseMint).not.toBeUndefined();

    this.log.info(
      `Mint 100 amount asset by the owner response: ${JSON.stringify(responseMint)}`,
    );
  }

  public getNetwork(): string {
    return this.dockerNetwork;
  }

  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      id: FabricTestEnvironment.FABRIC_ASSET_ID,
      referenceId: FabricTestEnvironment.FABRIC_REFERENCE_ID,
      owner: this.clientId,
      contractName: this.satpContractName,
      mspId: this.userIdentity.mspId,
      channelName: this.fabricChannelName,
      networkId: this.network,
      tokenType: AssetTokenTypeEnum.NonstandardFungible,
    };
  }

  // Returns the user identity certificate used for testing transactions
  get transactRequestPubKey(): string {
    return this.userIdentity.credentials.certificate;
  }

  // Stops and destroys the test ledger
  public async tearDown(): Promise<void> {
    await this.ledger.stop();
    await this.ledger.destroy();
  }
}
