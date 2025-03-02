import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import "jest-extended";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { DiscoveryOptions } from "fabric-network";
import bodyParser from "body-parser";
import path from "path";

import http, { Server } from "http";

import fs from "fs-extra";

import {
  Configuration,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FileBase64,
  ChainCodeProgrammingLanguage,
  FabricContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  Containers,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import express from "express";
import { AddressInfo } from "net";

import { v4 as uuidv4 } from "uuid";
import { FabricBridge } from "../../../../main/typescript/cross-chain-mechanisms/satp-bridge/fabric-bridge";
import type { FabricConfig } from "../../../../main/typescript/types/blockchain-interaction";
import type { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { TokenType } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import SATPInteraction from "../../../../test/typescript/fabric/satp-erc20-interact.json";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { FabricTestEnvironment } from "../../test-utils";
let fabricServer: Server;

let fabricSigningCredential: FabricSigningCredential;
let bridgeFabricSigningCredential: FabricSigningCredential;
const logLevel: LogLevelDesc = "DEBUG";

let fabricLedger: FabricTestLedgerV1;
let satpContractName: string;
let satpWrapperContractName: string;
let fabricChannelName: string;

let configFabric: Configuration;
let apiClient: FabricApi;

let fabricConnector: PluginLedgerConnectorFabric;

let pluginBungeeFabricOptions: IPluginBungeeHermesOptions;

let fabricBridge: FabricBridge;
let fabricConfig: FabricConfig;

let clientId: string;

let bridgeId: string;

const FABRIC_ASSET_ID = uuidv4();

const BRIDGE_ID =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "Satp - Hermes",
});

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  {
    // Fabric ledger connection
    const channelId = "mychannel";
    fabricChannelName = channelId;

    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
    });

    await fabricLedger.start();
    log.info("Fabric Ledger started");

    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();

    const bridgeProfile = await fabricLedger.getConnectionProfileOrgX("org2");
    expect(bridgeProfile).not.toBeUndefined();

    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];

    const enrollAdminBridgeOut = await fabricLedger.enrollAdminV2({
      organization: "org2",
    });
    const bridgeWallet = enrollAdminBridgeOut[1];

    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);

    const opts = {
      enrollmentID: "bridge",
      organization: "org2",
      wallet: bridgeWallet,
    };

    const [bridgeIdentity] = await fabricLedger.enrollUserV2(opts);

    const sshConfig = await fabricLedger.getSshConfig();

    log.info("enrolled admin");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
    const keychainEntryValue = JSON.stringify(userIdentity);

    console.log("keychainEntryValue: ", keychainEntryValue);

    const keychainInstanceIdBridge = uuidv4();
    const keychainIdBridge = uuidv4();
    const keychainEntryKeyBridge = "bridge1";
    const keychainEntryValueBridge = JSON.stringify(bridgeIdentity);

    console.log("keychainEntryValue: ", keychainEntryValueBridge);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const keychainPluginBridge = new PluginKeychainMemory({
      instanceId: keychainInstanceIdBridge,
      keychainId: keychainIdBridge,
      logLevel,
      backend: new Map([
        [keychainEntryKeyBridge, keychainEntryValueBridge],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const pluginRegistryBridge = new PluginRegistry({
      plugins: [keychainPluginBridge],
    });

    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
      sshConfig,
      logLevel: "DEBUG",
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    fabricServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: fabricServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await fabricConnector.getOrCreateWebServices();
    await fabricConnector.registerWebServices(expressApp);

    log.info("Fabric Ledger connector check");

    const apiUrl = `http://${address}:${port}`;

    configFabric = new Configuration({ basePath: apiUrl });

    apiClient = new FabricApi(configFabric);

    // deploy contracts ...
    satpContractName = "satp-contract";
    satpWrapperContractName = "satp-wrapper-contract";
    const satpContractRelPath =
      "../../../../test/typescript/fabric/contracts/satp-contract/chaincode-typescript";
    const wrapperSatpContractRelPath =
      "../../../../main/typescript/cross-chain-mechanisms/satp-bridge/fabric-contracts/satp-wrapper/chaincode-typescript";
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

    const res = await apiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles: satpSourceFiles,
      ccName: satpContractName,
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
    expect(packageIds).toBeArray();

    expect(approveForMyOrgList).toBeTruthy();
    expect(approveForMyOrgList).toBeArray();

    expect(installList).toBeTruthy();
    expect(installList).toBeArray();
    expect(queryInstalledList).toBeTruthy();
    expect(queryInstalledList).toBeArray();

    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();
    log.info("SATP Contract deployed");

    const res2 = await apiClient.deployContractV1({
      channelId,
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
    expect(packageIds2).toBeArray();

    expect(approveForMyOrgList2).toBeTruthy();
    expect(approveForMyOrgList2).toBeArray();

    expect(installList2).toBeTruthy();
    expect(installList2).toBeArray();
    expect(queryInstalledList2).toBeTruthy();
    expect(queryInstalledList2).toBeArray();

    expect(commit2).toBeTruthy();
    expect(packaging2).toBeTruthy();
    expect(queryCommitted2).toBeTruthy();

    log.info("SATP Wrapper Contract deployed");

    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    bridgeFabricSigningCredential = {
      keychainId: keychainIdBridge,
      keychainRef: keychainEntryKeyBridge,
    };

    const mspId: string = userIdentity.mspId;

    const initializeResponse = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [mspId, FABRIC_ASSET_ID],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(initializeResponse).not.toBeUndefined();
    expect(initializeResponse.status).toBeGreaterThan(199);
    expect(initializeResponse.status).toBeLessThan(300);

    log.info(
      `SATPContract.InitToken(): ${JSON.stringify(initializeResponse.data)}`,
    );

    const initializeResponse2 = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: [mspId],
      methodName: "Initialize",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(initializeResponse2).not.toBeUndefined();
    expect(initializeResponse2.status).toBeGreaterThan(199);
    expect(initializeResponse2.status).toBeLessThan(300);

    log.info(
      `SATPWrapper.Initialize(): ${JSON.stringify(initializeResponse2.data)}`,
    );

    const setBridgeResponse = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: ["Org2MSP"],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    const setBridgeResponse2 = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: ["Org2MSP", BRIDGE_ID],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(setBridgeResponse2).not.toBeUndefined();
    expect(setBridgeResponse2.status).toBeGreaterThan(199);
    expect(setBridgeResponse2.status).toBeLessThan(300);

    log.info(
      `SATPWrapper.setBridge(): ${JSON.stringify(setBridgeResponse.data)}`,
    );

    const responseClientId = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: [],
      methodName: "ClientAccountID",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    clientId = responseClientId.data.functionOutput.toString();

    pluginBungeeFabricOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    const pluginOptionsFabricBridge: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: pluginRegistryBridge,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      sshConfig,
      logLevel: "DEBUG",
      connectionProfile: bridgeProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    fabricConfig = {
      network: {
        id: FabricTestEnvironment.FABRIC_NETWORK_ID,
        ledgerType: LedgerType.Fabric2,
      },
      signingCredential: bridgeFabricSigningCredential,
      channelName: fabricChannelName,
      contractName: satpWrapperContractName,
      options: pluginOptionsFabricBridge,
      bungeeOptions: pluginBungeeFabricOptions,
      claimFormat: ClaimFormat.DEFAULT,
    } as FabricConfig;

    // networkDetails = {
    //   connectorApiPath: fabricPath,
    //   signingCredential: fabricSigningCredential,
    //   channelName: fabricChannelName,
    //   contractName: satpContractName,
    //   participant: "Org1MSP",
    // };
  }
});

describe("Fabric Bridge Test", () => {
  it("Should Initialize the bridge", async () => {
    fabricBridge = new FabricBridge(fabricConfig, logLevel);
    expect(fabricBridge).not.toBeUndefined();

    bridgeId = await fabricBridge.getClientId();
    expect(bridgeId).not.toBeUndefined();
    log.debug(`Bridge ID: ${bridgeId}`);
  });

  it("Wrap asset", async () => {
    const response = await fabricBridge.wrapAsset({
      tokenId: FABRIC_ASSET_ID,
      tokenType: TokenType.NONSTANDARD,
      owner: clientId,
      mspId: "Org1MSP",
      channelName: fabricChannelName,
      contractName: satpContractName,
      amount: 0,
      ontology: JSON.stringify(SATPInteraction),
    });

    expect(response).not.toBeUndefined();
    expect(response.transactionId).not.toBeUndefined();
    expect(response.output).not.toBeUndefined();

    log.info(`Wrap asset response: ${JSON.stringify(response)}`);

    const response2 = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    log.info(`GetAsset response: ${JSON.stringify(response2)}`);

    expect(response2).not.toBeUndefined();
    expect(response2.amount).toBe(0);
    expect(response2.owner).toBe(clientId);
    expect(response2.mspId).toBe("Org1MSP");
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response2.contractName).toBe(satpContractName);
    expect(response2.channelName).toBe(fabricChannelName);
  });

  it("lock asset", async () => {
    const responseMint = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: ["2"],
      methodName: "Mint",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(responseMint).not.toBeUndefined();
    expect(responseMint.status).toBeGreaterThan(199);
    expect(responseMint.status).toBeLessThan(300);
    expect(responseMint.data).not.toBeUndefined();

    log.info(
      `Mint 2 amount asset by the owner response: ${JSON.stringify(responseMint.data)}`,
    );

    const responseApprove = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId, "2"],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseApprove).not.toBeUndefined();
    expect(responseApprove.status).toBeGreaterThan(199);
    expect(responseApprove.status).toBeLessThan(300);
    expect(responseApprove.data).not.toBeUndefined();

    log.info(
      `Approve 2 amount asset by the owner response: ${JSON.stringify(responseApprove.data)}`,
    );

    const responseLock = await fabricBridge.lockAsset(FABRIC_ASSET_ID, 2);

    expect(responseLock).not.toBeUndefined();
    expect(responseLock.transactionId).not.toBeUndefined();
    expect(responseLock.output).not.toBeUndefined();

    log.info(`Lock asset response: ${JSON.stringify(responseLock)}`);

    const response2 = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    expect(response2).not.toBeUndefined();
    expect(response2.amount).toBe(2);
    expect(response2.owner).toBe(clientId);
    expect(response2.mspId).toBe("Org1MSP");
    expect(response2.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response2.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response2.contractName).toBe(satpContractName);
    expect(response2.channelName).toBe(fabricChannelName);

    log.info(`GetAsset response: ${JSON.stringify(response2)}`);

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("2");
    log.info("Amount was transfer correctly to the Bridge account");

    const responseBalance2 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");
  });

  it("unlock asset", async () => {
    const responseUnlock = await fabricBridge.unlockAsset(FABRIC_ASSET_ID, 2);

    expect(responseUnlock).not.toBeUndefined();
    expect(responseUnlock.transactionId).not.toBeUndefined();
    expect(responseUnlock.output).not.toBeUndefined();

    log.info(`Unlock asset response: ${JSON.stringify(responseUnlock)}`);

    const response = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    expect(response).not.toBeUndefined();
    expect(response.amount).toBe(0);
    expect(response.owner).toBe(clientId);
    expect(response.mspId).toBe("Org1MSP");
    expect(response.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response.contractName).toBe(satpContractName);
    expect(response.channelName).toBe(fabricChannelName);

    log.info(`GetAsset response: ${JSON.stringify(response)}`);

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("2");
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("Should Burn a token", async () => {
    const responseApprove = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId, "2"],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseApprove).not.toBeUndefined();
    expect(responseApprove.status).toBeGreaterThan(199);
    expect(responseApprove.status).toBeLessThan(300);
    expect(responseApprove.data).not.toBeUndefined();

    log.info(
      `Approve 2 amount asset by the owner response: ${JSON.stringify(responseApprove.data)}`,
    );
    const responseLock = await fabricBridge.lockAsset(FABRIC_ASSET_ID, 2);

    expect(responseLock).not.toBeUndefined();
    expect(responseLock.transactionId).not.toBeUndefined();
    expect(responseLock.output).not.toBeUndefined();

    log.info(`Lock asset response: ${JSON.stringify(responseLock)}`);

    const responseBurn = await fabricBridge.burnAsset(FABRIC_ASSET_ID, 2);

    expect(responseBurn).not.toBeUndefined();
    expect(responseBurn.transactionId).not.toBeUndefined();
    expect(responseBurn.output).not.toBeUndefined();

    log.info(
      `Burn 2 amount asset by the owner response: ${JSON.stringify(responseBurn)}`,
    );

    const response = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    expect(response).not.toBeUndefined();
    expect(response.amount).toBe(0);
    expect(response.owner).toBe(clientId);
    expect(response.mspId).toBe("Org1MSP");
    expect(response.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response.contractName).toBe(satpContractName);
    expect(response.channelName).toBe(fabricChannelName);

    log.info(`GetAsset response: ${JSON.stringify(response)}`);

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("0");
    log.info("Amount was burned correctly from the Bridge account");

    const responseBalance2 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("0");
    log.info("Amount was burned correctly from the Owner account");
  });

  it("Should Mint a token", async () => {
    const responseMint = await fabricBridge.mintAsset(FABRIC_ASSET_ID, 2);
    expect(responseMint).not.toBeUndefined();
    expect(responseMint.transactionId).not.toBeUndefined();
    expect(responseMint.output).not.toBeUndefined();

    log.info(`Mint asset response: ${JSON.stringify(responseMint)}`);

    const response = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    expect(response).not.toBeUndefined();
    expect(response.amount).toBe(2);
    expect(response.owner).toBe(clientId);
    expect(response.mspId).toBe("Org1MSP");
    expect(response.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response.contractName).toBe(satpContractName);
    expect(response.channelName).toBe(fabricChannelName);

    log.info(`GetAsset response: ${JSON.stringify(response)}`);

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("2");
    log.info("Amount was minted correctly to the Bridge account");
  });

  it("Should Assign a token", async () => {
    const responseAssign = await fabricBridge.assignAsset(
      FABRIC_ASSET_ID,
      clientId,
      2,
    );
    expect(responseAssign).not.toBeUndefined();
    expect(responseAssign.transactionId).not.toBeUndefined();
    expect(responseAssign.output).not.toBeUndefined();

    log.info(`Assign asset response: ${JSON.stringify(responseAssign)}`);

    const response = await fabricBridge.getAsset(FABRIC_ASSET_ID);

    expect(response).not.toBeUndefined();
    expect(response.amount).toBe(0);
    expect(response.owner).toBe(clientId);
    expect(response.mspId).toBe("Org1MSP");
    expect(response.tokenType).toBe(TokenType.NONSTANDARD.toString());
    expect(response.tokenId).toBe(FABRIC_ASSET_ID);
    expect(response.contractName).toBe(satpContractName);
    expect(response.channelName).toBe(fabricChannelName);

    log.info(`GetAsset response: ${JSON.stringify(response)}`);

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("2");
    log.info("Amount was assigned correctly from the Bridge account");

    const responseBalance2 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [bridgeId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("0");
    log.info("Amount was assigned correctly to the Owner account");
  });

  it("Should Unwrap a token", async () => {
    const responseUnwrap = await fabricBridge.unwrapAsset(FABRIC_ASSET_ID);
    expect(responseUnwrap).not.toBeUndefined();
    expect(responseUnwrap.transactionId).not.toBeUndefined();
    expect(responseUnwrap.output).not.toBeUndefined();

    log.info(`Unwrap asset response: ${JSON.stringify(responseUnwrap)}`);

    expect(
      async () => await fabricBridge.getAsset(FABRIC_ASSET_ID),
    ).rejects.toThrow();
  });
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(fabricServer);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
