import {
  IListenOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration } from "../../../main/typescript/generated/gateway-client/typescript-axios";
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
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FabricContractInvocationType,
  FileBase64,
  ChainCodeProgrammingLanguage,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { Config } from "node-ssh";
import { randomUUID as uuidv4 } from "node:crypto";
import { FabricConfig } from "../../../main/typescript/types/blockchain-interaction";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import fs from "fs-extra";
import path from "path";
import { expect } from "@jest/globals";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import bodyParser from "body-parser";
import express from "express";
import http, { Server } from "http";
import { AddressInfo } from "net";
import { Asset } from "../../../main/typescript";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { NetworkId } from "../../../main/typescript/network-identification/chainid-list";

// Test environment for Fabric ledger operations
export class FabricTestEnvironment {
  public static readonly FABRIC_ASSET_ID: string = uuidv4();
  public static readonly FABRIC_NETWORK_ID: string = "FABRIC";
  public readonly network: NetworkId = {
    id: FabricTestEnvironment.FABRIC_NETWORK_ID,
    ledgerType: LedgerType.Fabric2,
  };
  public ledger!: FabricTestLedgerV1;
  public connectorOptions!: IPluginLedgerConnectorFabricOptions;
  public connector!: PluginLedgerConnectorFabric;
  public bungeeOptions!: IPluginBungeeHermesOptions;
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
  public fabricConfig!: FabricConfig;
  public fabricServer!: Server;
  public apiClient!: FabricApi;
  public bridge_id!: string;

  private readonly log: Logger;

  private constructor(
    satpContractName: string,
    bridge_id: string,
    logLevel: LogLevelDesc,
  ) {
    this.satpContractName = satpContractName;
    this.bridge_id = bridge_id;

    const level = logLevel || "INFO";
    const label = "FabricTestEnvironment";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  // Initializes the Ethereum ledger, accounts, and connector for testing
  public async init(logLevel: LogLevelDesc): Promise<void> {
    this.ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
    });
    await this.ledger.start();

    this.fabricChannelName = "mychannel";

    this.connectionProfile = await this.ledger.getConnectionProfileOrg1();
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
    const [bridgeIdentity] = await this.ledger.enrollUserV2(opts);
    this.sshConfig = await this.ledger.getSshConfig();

    this.log.debug("enrolled admin");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
    const keychainEntryValue = JSON.stringify(this.userIdentity);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const keychainInstanceIdBridge = uuidv4();
    const keychainIdBridge = uuidv4();
    this.keychainEntryKeyBridge = "bridge1";
    this.keychainEntryValueBridge = JSON.stringify(bridgeIdentity);

    this.keychainPluginBridge = new PluginKeychainMemory({
      instanceId: keychainInstanceIdBridge,
      keychainId: keychainIdBridge,
      logLevel,
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

    this.connectorOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
      sshConfig: this.sshConfig,
      logLevel,
      connectionProfile: this.connectionProfile,
      discoveryOptions: this.discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    this.connector = new PluginLedgerConnectorFabric(this.connectorOptions);

    this.fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
    this.bridgeFabricSigningCredential = {
      keychainId: keychainIdBridge,
      keychainRef: this.keychainEntryKeyBridge,
    };

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    this.fabricServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: this.fabricServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await this.connector.getOrCreateWebServices();
    await this.connector.registerWebServices(expressApp);

    this.log.info("Fabric Ledger connector check");

    const apiUrl = `http://${address}:${port}`;

    this.configFabric = new Configuration({ basePath: apiUrl });

    this.apiClient = new FabricApi(this.configFabric);
  }

  // Creates and initializes a new FabricTestEnvironment instance
  public static async setupTestEnvironment(
    satpContractName: string,
    bridge_id: string,
    logLevel: LogLevelDesc,
  ): Promise<FabricTestEnvironment> {
    const instance = new FabricTestEnvironment(
      satpContractName,
      bridge_id,
      logLevel,
    );
    await instance.init(logLevel);
    return instance;
  }

  // Generates the Fabric configuration for use in SATP Gateway Docker container
  public async createFabricConfigJSON(
    logLevel?: LogLevelDesc,
  ): Promise<Record<string, unknown>> {
    return {
      network: this.fabricConfig.network,
      signingCredential: this.fabricConfig.signingCredential,
      channelName: this.fabricConfig.channelName,
      contractName: this.fabricConfig.contractName,
      options: {
        instanceId: this.connectorOptions.instanceId,
        dockerBinary: this.connectorOptions.dockerBinary,
        peerBinary: this.connectorOptions.peerBinary,
        goBinary: this.connectorOptions.goBinary,
        pluginRegistryOptions: {
          plugins: [
            {
              instanceId: this.keychainPluginBridge.getInstanceId(),
              keychainId: this.keychainPluginBridge.getKeychainId(),
              logLevel,
              backend: [
                {
                  keychainEntry: this.keychainEntryKeyBridge,
                  keychainEntryValue: this.keychainEntryValueBridge,
                },
                {
                  keychainEntry: "some-other-entry-key",
                  keychainEntryValue: "some-other-entry-value",
                },
              ],
            },
          ],
        },
        cliContainerEnv: this.connectorOptions.cliContainerEnv,
        sshConfig: this.connectorOptions.sshConfig,
        logLevel: this.connectorOptions.logLevel,
        connectionProfile: this.connectorOptions.connectionProfile,
        discoveryOptions: this.connectorOptions.discoveryOptions,
        eventHandlerOptions: this.connectorOptions.eventHandlerOptions,
      },
      bungeeOptions: {
        keyPair: {
          privateKey: Buffer.from(
            this.bungeeOptions.keyPair!.privateKey.buffer,
          ).toString("hex"),
          publicKey: Buffer.from(
            this.bungeeOptions.keyPair!.publicKey.buffer,
          ).toString("hex"),
        },
        instanceId: this.bungeeOptions.instanceId,
        logLevel: this.bungeeOptions.logLevel,
      },
      claimFormat: this.fabricConfig.claimFormat,
    };
  }

  // Deploys smart contracts and sets up configurations for testing
  public async deployAndSetupContracts(claimFormat: ClaimFormat) {
    this.satpContractName = "satp-contract";
    const satpWrapperContractName = "satp-wrapper-contract";
    const satpContractRelPath =
      "./../fabric/contracts/satp-contract/chaincode-typescript";
    const wrapperSatpContractRelPath =
      "../../../main/typescript/fabric-contracts/satp-wrapper/chaincode-typescript";
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

    const wrapperSatpContractDir = path.join(
      __dirname,
      wrapperSatpContractRelPath,
    );

    // ├── package.json
    // ├── src
    // │   ├── index.ts
    // │   ├── interaction-signature.ts
    // │   ├── ITraceableContract.ts
    // │   ├── satp-wrapper.ts
    // │   └── token.ts
    // ├── tsconfig.json
    // --------
    const wrapperSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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
        wrapperSatpContractDir,
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

    const res = await this.apiClient.deployContractV1({
      channelId: this.fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: satpSourceFiles,
      ccName: this.satpContractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "satp-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

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

    const res2 = await this.apiClient.deployContractV1({
      channelId: this.fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: wrapperSourceFiles,
      ccName: satpWrapperContractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "satp-wrapper-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

    const {
      packageIds: packageIds2,
      lifecycle: lifecycle2,
      success: success2,
    } = res2.data;
    expect(res2.status).toBe(200);
    expect(success2).toBe(true);

    const {
      approveForMyOrgList: approveForMyOrgList2,
      installList: installList2,
      queryInstalledList: queryInstalledList2,
      commit: commit2,
      packaging: packaging2,
      queryCommitted: queryCommitted2,
    } = lifecycle2;

    expect(packageIds2).toBeTruthy();
    expect(Array.isArray(packageIds2)).toBe(true);

    expect(approveForMyOrgList2).toBeTruthy();
    expect(Array.isArray(approveForMyOrgList2)).toBe(true);

    expect(installList2).toBeTruthy();
    expect(Array.isArray(installList2)).toBe(true);
    expect(queryInstalledList2).toBeTruthy();
    expect(Array.isArray(queryInstalledList2)).toBe(true);

    expect(commit2).toBeTruthy();
    expect(packaging2).toBeTruthy();
    expect(queryCommitted2).toBeTruthy();

    this.log.info("SATP Wrapper Contract deployed");

    const initializeResponse = await this.apiClient.runTransactionV1({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: [this.userIdentity.mspId, FabricTestEnvironment.FABRIC_ASSET_ID],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(initializeResponse).not.toBeUndefined();
    expect(initializeResponse.status).toBeGreaterThan(199);
    expect(initializeResponse.status).toBeLessThan(300);

    this.log.info(
      `SATPContract.InitToken(): ${JSON.stringify(initializeResponse.data)}`,
    );

    const initializeResponse2 = await this.apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: this.fabricChannelName,
      params: [this.userIdentity.mspId],
      methodName: "Initialize",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(initializeResponse2).not.toBeUndefined();
    expect(initializeResponse2.status).toBeGreaterThan(199);
    expect(initializeResponse2.status).toBeLessThan(300);

    this.log.info(
      `SATPWrapper.Initialize(): ${JSON.stringify(initializeResponse2.data)}`,
    );

    const setBridgeResponse = await this.apiClient.runTransactionV1({
      contractName: this.satpContractName,
      channelName: this.fabricChannelName,
      params: ["Org2MSP"],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    const setBridgeResponse2 = await this.apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: this.fabricChannelName,
      params: ["Org2MSP", this.bridge_id],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    expect(setBridgeResponse2).not.toBeUndefined();
    expect(setBridgeResponse2.status).toBeGreaterThan(199);
    expect(setBridgeResponse2.status).toBeLessThan(300);

    this.log.info(
      `SATPWrapper.setBridge(): ${JSON.stringify(setBridgeResponse.data)}`,
    );

    const responseClientId = await this.apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: this.fabricChannelName,
      params: [],
      methodName: "ClientAccountID",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    this.clientId = responseClientId.data.functionOutput.toString();

    this.bungeeOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
    };

    this.connectorOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: this.pluginRegistryBridge,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      sshConfig: this.sshConfig,
      logLevel: "DEBUG",
      connectionProfile: this.bridgeProfile,
      discoveryOptions: this.discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    this.fabricConfig = {
      network: this.network,
      signingCredential: this.bridgeFabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: satpWrapperContractName,
      options: this.connectorOptions,
      bungeeOptions: this.bungeeOptions,
      claimFormat: claimFormat,
    };

    // networkDetails = {
    //   connectorApiPath: fabricPath,
    //   signingCredential: this.fabricSigningCredential,
    //   channelName: this.fabricChannelName,
    //   contractName: this.satpContractName,
    //   participant: "Org1MSP",
    // };
  }

  // Gets the default asset configuration for testing
  public get defaultAsset(): Asset {
    return {
      owner: this.clientId,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: this.satpContractName,
      mspId: this.userIdentity.mspId,
      channelName: this.fabricChannelName,
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
    await Servers.shutdown(this.fabricServer);
  }
}
