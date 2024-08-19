import { randomUUID as uuidv4 } from "node:crypto";
import "jest-extended";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
// import { v4 as internalIpV4 } from "internal-ip";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  ChainCodeProgrammingLanguage,
  Configuration,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  FileBase64,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FabricContractInvocationType,
  ConnectionProfile,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import http, { Server } from "http";
import fs from "fs-extra";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  FabricTestLedgerV1,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import bodyParser from "body-parser";
import express from "express";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { AddressInfo } from "net";
import path from "path";
import {
  EthereumConfig,
  FabricConfig,
} from "../../../main/typescript/types/blockchain-interaction";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { TransactRequest, Asset } from "../../../main/typescript";
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import { createClient } from "../test-utils";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_CORE_VERSION,
  SATP_ARCHITETURE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let fabricServer: Server;

let ethereumLedger: GethTestLedger;

let fabricLedger: FabricTestLedgerV1;
let fabricSigningCredential: FabricSigningCredential;
let bridgeFabricSigningCredential: FabricSigningCredential;
let configFabric: Configuration;
let fabricChannelName: string;

const FABRIC_ASSET_ID = uuidv4();

const BRIDGE_ID =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let clientId: string;
let fabricConfig: FabricConfig;
let pluginOptionsFabricBridge: IPluginLedgerConnectorFabricOptions;
let pluginBungeeFabricOptions: IPluginBungeeHermesOptions;

let erc20TokenContract: string;
let contractNameWrapper: string;

let rpcApiHttpHost: string;

let testing_connector: PluginLedgerConnectorEthereum;
let bridgeEthAccount: string;
const ETH_ASSET_ID = uuidv4();
let assetContractAddress: string;
let wrapperContractAddress: string;
let satpContractName: string;

let pluginBungeeEthOptions: IPluginBungeeHermesOptions;

let ethereumConfig: EthereumConfig;
let ethereumOptions: IPluginLedgerConnectorEthereumOptions;

let keychainPluginBridge: PluginKeychainMemory;
let keychainEntryKeyBridge: string;
let keychainEntryValueBridge: string;

let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;

let ethOptionsKeychainEntryValue: string;
let ethOptionsKeychainEntryKey: string;

let discoveryOptions: DiscoveryOptions;

let fabricUser: X509Identity;

let apiClient: FabricApi;

const SATPContract1 = {
  contractName: "SATPContract",
  abi: SATPContract.abi,
  bytecode: SATPContract.bytecode.object,
};
const SATPWrapperContract1 = {
  contractName: "SATPWrapperContract",
  abi: SATPWrapperContract.abi,
  bytecode: SATPWrapperContract.bytecode.object,
};

let gatewayRunner: SATPGatewayRunner;

afterAll(async () => {
  await gatewayRunner.stop();
  await gatewayRunner.destroy();
  await ethereumLedger.stop();
  await ethereumLedger.destroy();
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

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  // currently not used due to GatewayRunner being in NetworkMode: "host"
  // const lanIp = await internalIpV4();
  // if (!lanIp) {
  //   throw new Error(`LAN IP falsy. internal-ip package failed.`);
  // }

  {
    const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
    const containerImageVersion = "2023-07-27-2a8c48ed6";
    ethereumLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ethereumLedger.start();

    // Fabric ledger connection
    const channelId = "mychannel";
    fabricChannelName = channelId;

    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel: "INFO",
    });

    await fabricLedger.start();

    log.info("Both Ledgers started successfully");
  }

  {
    // setup fabric ledger
    const connectionProfile: ConnectionProfile =
      await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();

    const bridgeProfile: ConnectionProfile =
      await fabricLedger.getConnectionProfileOrgX("org2");
    expect(bridgeProfile).not.toBeUndefined();

    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];

    const enrollAdminBridgeOut = await fabricLedger.enrollAdminV2({
      organization: "org2",
    });
    const bridgeWallet = enrollAdminBridgeOut[1];

    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);
    fabricUser = userIdentity;
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
    keychainEntryKeyBridge = "bridge1";
    keychainEntryValueBridge = JSON.stringify(bridgeIdentity);

    console.log("keychainEntryValueBridge: ", keychainEntryValueBridge);

    keychainPluginBridge = new PluginKeychainMemory({
      instanceId: keychainInstanceIdBridge,
      keychainId: keychainIdBridge,
      logLevel,
      backend: new Map([
        [keychainEntryKeyBridge, keychainEntryValueBridge],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistryBridge = new PluginRegistry({
      plugins: [keychainPluginBridge],
    });

    discoveryOptions = {
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

    const fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

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
    const satpWrapperContractName = "satp-wrapper-contract";
    const satpContractRelPath =
      "../../../test/typescript/fabric/contracts/satp-contract/chaincode-typescript";
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

    const res = await apiClient.deployContractV1({
      channelId: fabricChannelName,
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
      channelId: fabricChannelName,
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

    pluginOptionsFabricBridge = {
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
      network: SupportedChain.FABRIC,
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

  {
    //setup ethereum ledger
    rpcApiHttpHost = await ethereumLedger.getRpcApiHttpHost();

    bridgeEthAccount = await ethereumLedger.newEthPersonalAccount();

    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    ethOptionsKeychainEntryValue = "test";
    ethOptionsKeychainEntryKey = bridgeEthAccount;
    keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([
        [ethOptionsKeychainEntryKey, ethOptionsKeychainEntryValue],
      ]),
      logLevel,
    });

    keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([
        [ethOptionsKeychainEntryKey, ethOptionsKeychainEntryValue],
      ]),
      logLevel,
    });

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract1));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract1),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    ethereumOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      pluginRegistry,
      logLevel,
    };
    testing_connector = new PluginLedgerConnectorEthereum(ethereumOptions);
    pluginRegistry.add(testing_connector);

    const deployOutSATPContract = await testing_connector.deployContract({
      contract: {
        keychainId: keychainPlugin1.getKeychainId(),
        contractName: erc20TokenContract,
      },
      constructorArgs: [WHALE_ACCOUNT_ADDRESS, ETH_ASSET_ID],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOutSATPContract).toBeTruthy();
    expect(deployOutSATPContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutSATPContract.transactionReceipt.contractAddress,
    ).toBeTruthy();

    assetContractAddress =
      deployOutSATPContract.transactionReceipt.contractAddress ?? "";

    log.info("SATPContract Deployed successfully");
    const deployOutWrapperContract = await testing_connector.deployContract({
      contract: {
        keychainId: keychainPlugin2.getKeychainId(),
        contractName: contractNameWrapper,
      },
      constructorArgs: [bridgeEthAccount],
      web3SigningCredential: {
        ethAccount: bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOutWrapperContract).toBeTruthy();
    expect(deployOutWrapperContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutWrapperContract.transactionReceipt.contractAddress,
    ).toBeTruthy();
    log.info("SATPWrapperContract Deployed successfully");

    wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress ?? "";

    pluginBungeeEthOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    ethereumConfig = {
      network: SupportedChain.EVM,
      keychainId: keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: bridgeEthAccount,
        secret: "test",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      contractName: contractNameWrapper,
      contractAddress: wrapperContractAddress,
      options: ethereumOptions,
      bungeeOptions: pluginBungeeEthOptions,
      gas: 5000000,
      claimFormat: ClaimFormat.DEFAULT,
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contract: {
        contractName: erc20TokenContract,
        keychainId: keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }

  const responseMint = await testing_connector.invokeContract({
    contract: {
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "mint",
    params: [WHALE_ACCOUNT_ADDRESS, "100"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(responseMint).toBeTruthy();
  expect(responseMint.success).toBeTruthy();
  log.info("Minted 100 tokens to firstHighNetWorthAccount");

  const responseApprove = await testing_connector.invokeContract({
    contract: {
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [wrapperContractAddress, "100"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(responseApprove).toBeTruthy();
  expect(responseApprove.success).toBeTruthy();
  log.info("Approved 100 tokens to SATPWrapperContract");
});

describe("SATPGateway sending a token from Ethereum to Fabric", () => {
  it("should realize a transfer", async () => {
    const address: Address = `http://localhost`;

    // gateway setup:
    const gatewayIdentity = {
      id: "mockID",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITETURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC, SupportedChain.EVM],
      proofID: "mockProofID10",
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    // ethereumConfig Json object setup:
    const ethPluginRegistryOptionsJSON = {
      plugins: [
        {
          instanceId: keychainPlugin1.getInstanceId(),
          keychainId: keychainPlugin1.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: ethOptionsKeychainEntryKey,
              keychainEntryValue: ethOptionsKeychainEntryValue,
            },
          ],
          contractName: erc20TokenContract,
          contractString: await keychainPlugin1.get(erc20TokenContract),
        },
        {
          instanceId: keychainPlugin2.getInstanceId(),
          keychainId: keychainPlugin2.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: ethOptionsKeychainEntryKey,
              keychainEntryValue: ethOptionsKeychainEntryValue,
            },
          ],
          contractName: contractNameWrapper,
          contractString: await keychainPlugin2.get(contractNameWrapper),
        },
      ],
    };

    const ethereumOptionsJSON = {
      instanceId: ethereumOptions.instanceId,
      rpcApiHttpHost: ethereumOptions.rpcApiHttpHost,
      rpcApiWsHost: ethereumOptions.rpcApiWsHost,
      pluginRegistryOptions: ethPluginRegistryOptionsJSON,
      logLevel: ethereumOptions.logLevel,
    };

    const ethBungeeOptionsJSON = {
      keyPair: {
        privateKey: Buffer.from(
          pluginBungeeEthOptions.keyPair!.privateKey,
        ).toString("hex"),
        publicKey: Buffer.from(
          pluginBungeeEthOptions.keyPair!.publicKey,
        ).toString("hex"),
      },
      instanceId: pluginBungeeEthOptions.instanceId,
      logLevel: pluginBungeeEthOptions.logLevel,
    };

    const ethereumConfigJSON = {
      network: ethereumConfig.network,
      keychainId: ethereumConfig.keychainId,
      signingCredential: ethereumConfig.signingCredential,
      contractName: ethereumConfig.contractName,
      contractAddress: ethereumConfig.contractAddress,
      gas: ethereumConfig.gas,
      options: ethereumOptionsJSON,
      bungeeOptions: ethBungeeOptionsJSON,
      claimFormat: ethereumConfig.claimFormat,
    };

    // fabricConfig Json object setup:
    const fabricPluginRegistryOptionsJSON = {
      plugins: [
        {
          instanceId: keychainPluginBridge.getInstanceId(),
          keychainId: keychainPluginBridge.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: keychainEntryKeyBridge,
              keychainEntryValue: keychainEntryValueBridge,
            },
            {
              keychainEntry: "some-other-entry-key",
              keychainEntryValue: "some-other-entry-value",
            },
          ],
        },
      ],
    };

    const fabricOptionsJSON = {
      instanceId: pluginOptionsFabricBridge.instanceId,
      dockerBinary: pluginOptionsFabricBridge.dockerBinary,
      peerBinary: pluginOptionsFabricBridge.peerBinary,
      goBinary: pluginOptionsFabricBridge.goBinary,
      pluginRegistryOptions: fabricPluginRegistryOptionsJSON,
      cliContainerEnv: pluginOptionsFabricBridge.cliContainerEnv,
      sshConfig: pluginOptionsFabricBridge.sshConfig,
      logLevel: pluginOptionsFabricBridge.logLevel,
      connectionProfile: pluginOptionsFabricBridge.connectionProfile,
      discoveryOptions: pluginOptionsFabricBridge.discoveryOptions,
      eventHandlerOptions: pluginOptionsFabricBridge.eventHandlerOptions,
    };

    const fabricBungeeOptionsJSON = {
      keyPair: {
        privateKey: Buffer.from(
          pluginBungeeFabricOptions.keyPair!.privateKey,
        ).toString("hex"),
        publicKey: Buffer.from(
          pluginBungeeFabricOptions.keyPair!.publicKey,
        ).toString("hex"),
      },
      instanceId: pluginBungeeFabricOptions.instanceId,
      logLevel: pluginBungeeFabricOptions.logLevel,
    };

    const fabricConfigJSON = {
      network: fabricConfig.network,
      signingCredential: fabricConfig.signingCredential,
      channelName: fabricConfig.channelName,
      contractName: fabricConfig.contractName,
      options: fabricOptionsJSON,
      bungeeOptions: fabricBungeeOptionsJSON,
      claimFormat: fabricConfig.claimFormat,
    };

    // gateway configuration setup:
    const jsonObject = {
      gid: gatewayIdentity,
      logLevel: "DEBUG",
      counterPartyGateways: [], //only knows itself
      environment: "development",
      enableOpenAPI: true,
      bridgesConfig: [ethereumConfigJSON, fabricConfigJSON],
    };

    const configDir = path.join(__dirname, "gateway-info/config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const configFile = path.join(configDir, "gateway-config.json");
    fs.writeFileSync(configFile, JSON.stringify(jsonObject, null, 2));

    expect(fs.existsSync(configFile)).toBe(true);

    // gateway outputLogFile and errorLogFile setup:
    const logDir = path.join(__dirname, "gateway-info/logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const outputLogFile = path.join(logDir, "gateway-logs-output.log");
    const errorLogFile = path.join(logDir, "gateway-logs-error.log");

    // Clear any existing logs
    fs.writeFileSync(outputLogFile, "");
    fs.writeFileSync(errorLogFile, "");

    expect(fs.existsSync(outputLogFile)).toBe(true);
    expect(fs.existsSync(errorLogFile)).toBe(true);

    //TODO: when ready, change to official hyperledger image
    // -- for now use your local image (the name might be different)
    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "latest",
      containerImageName: "cactus-plugin-satp-hermes-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile,
      outputLogFile,
      errorLogFile,
    };
    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    console.log("starting gatewayRunner...");
    await gatewayRunner.start(true);
    console.log("gatewayRunner started sucessfully");

    const sourceAsset: Asset = {
      owner: WHALE_ACCOUNT_ADDRESS,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: erc20TokenContract,
      contractAddress: assetContractAddress,
    };
    const receiverAsset: Asset = {
      owner: clientId,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: satpContractName,
      mspId: fabricUser.mspId,
      channelName: fabricChannelName,
    };
    const req: TransactRequest = {
      contextID: "mockContext",
      fromDLTNetworkID: SupportedChain.EVM,
      toDLTNetworkID: SupportedChain.FABRIC,
      fromAmount: "100",
      toAmount: "1",
      originatorPubkey: WHALE_ACCOUNT_ADDRESS,
      beneficiaryPubkey: fabricUser.credentials.certificate,
      sourceAsset,
      receiverAsset,
    };

    const port = await gatewayRunner.getHostPort(DEFAULT_PORT_GATEWAY_API);

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req);
    log.info(res?.data.statusResponse);

    const sessions = await adminApi.getSessionIds({});
    expect(sessions.data).toBeTruthy();
    expect(sessions.data.length).toBe(1);
    expect(sessions.data[0]).toBe(res.data.sessionID);

    const responseBalanceOwner = await testing_connector.invokeContract({
      contract: {
        contractName: erc20TokenContract,
        keychainId: keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [WHALE_ACCOUNT_ADDRESS],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe(BigInt(0));
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contract: {
        contractName: erc20TokenContract,
        keychainId: keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe(BigInt(0));
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [BRIDGE_ID],
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
    expect(responseBalance2.data.functionOutput).toBe("1");
    log.info("Amount was transfer correctly to the Owner account");
  });
});
