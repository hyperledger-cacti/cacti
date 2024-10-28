import "jest-extended";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";

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
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import http, { Server } from "http";
import fs from "fs-extra";

import {
  pruneDockerAllIfGithubAction,
  Containers,
  FabricTestLedgerV1,
  BesuTestLedger,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
} from "@hyperledger/cactus-test-tooling";
import bodyParser from "body-parser";
import express from "express";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { AddressInfo } from "net";
import path from "path";
import {
  BesuConfig,
  FabricConfig,
} from "../../../main/typescript/types/blockchain-interaction";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { Account } from "web3-core";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import Web3 from "web3";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  Asset,
  TransactRequest,
} from "../../../main/typescript";
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import { createClient } from "../test-utils";
import { bufArray2HexStr } from "../../../main/typescript/gateway-utils";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});
let fabricServer: Server;

let besuLedger: BesuTestLedger;

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
let pluginBungeeFabricOptions: IPluginBungeeHermesOptions;

let erc20TokenContract: string;
let contractNameWrapper: string;

let rpcApiHttpHost: string;
let rpcApiWsHost: string;
let web3: Web3;
let firstHighNetWorthAccount: string;
let testing_connector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let bridgeEthAccount: Account;
let assigneeEthAccount: Account;
const BESU_ASSET_ID = uuidv4();
let assetContractAddress: string;
let wrapperContractAddress: string;
let satpContractName: string;

let pluginBungeeBesuOptions: IPluginBungeeHermesOptions;

let besuConfig: BesuConfig;
let besuOptions: IPluginLedgerConnectorBesuOptions;

let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;
let fabricUser: X509Identity;

let apiClient: FabricApi;

afterAll(async () => {
  await besuLedger.stop();
  await besuLedger.destroy();
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
  {
    besuLedger = new BesuTestLedger({
      logLevel,
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });
    await besuLedger.start();

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

    log.info("Both Ledgers started successfully");
  }

  {
    // setup fabric ledger
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
    //setup besu ledger
    rpcApiHttpHost = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3 = new Web3(rpcApiHttpHost);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    bridgeEthAccount = await besuLedger.createEthTestAccount();

    assigneeEthAccount = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    const keychainEntryValue = besuKeyPair.privateKey;
    const keychainEntryKey = uuidv4();
    keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    besuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    testing_connector = new PluginLedgerConnectorBesu(besuOptions);
    pluginRegistry.add(testing_connector);

    await testing_connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: bridgeEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(bridgeEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);
    log.info("Connector initialized");

    const deployOutSATPContract = await testing_connector.deployContract({
      keychainId: keychainPlugin1.getKeychainId(),
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      constructorArgs: [firstHighNetWorthAccount, BESU_ASSET_ID],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPContract.bytecode.object,
      gas: 999999999999999,
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
      keychainId: keychainPlugin2.getKeychainId(),
      contractName: contractNameWrapper,
      contractAbi: SATPWrapperContract.abi,
      constructorArgs: [bridgeEthAccount.address],
      web3SigningCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPWrapperContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutWrapperContract).toBeTruthy();
    expect(deployOutWrapperContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutWrapperContract.transactionReceipt.contractAddress,
    ).toBeTruthy();
    log.info("SATPWrapperContract Deployed successfully");

    wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress ?? "";

    pluginBungeeBesuOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    besuConfig = {
      network: SupportedChain.BESU,
      keychainId: keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractName: contractNameWrapper,
      contractAddress: wrapperContractAddress,
      options: besuOptions,
      bungeeOptions: pluginBungeeBesuOptions,
      gas: 999999999999999,
      claimFormat: ClaimFormat.DEFAULT,
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }

  const responseMint = await testing_connector.invokeContract({
    contractName: erc20TokenContract,
    keychainId: keychainPlugin1.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "mint",
    params: [firstHighNetWorthAccount, "100"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 999999999,
  });
  expect(responseMint).toBeTruthy();
  expect(responseMint.success).toBeTruthy();
  log.info("Minted 100 tokens to firstHighNetWorthAccount");

  const responseApprove = await testing_connector.invokeContract({
    contractName: erc20TokenContract,
    keychainId: keychainPlugin1.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [wrapperContractAddress, "100"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 999999999,
  });
  expect(responseApprove).toBeTruthy();
  expect(responseApprove.success).toBeTruthy();
  log.info("Approved 100 tokens to SATPWrapperContract");
});
describe("2 SATPGateway sending a token from Besu to Fabric using openApi to request transact method", () => {
  it("should realize a transfer", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const options1: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [
        // this need to be like this because the shared memory was being altered
        {
          id: "mockID-2",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
          version: [
            {
              Core: "v02",
              Architecture: "v02",
              Crash: "v02",
            },
          ],
          supportedDLTs: [SupportedChain.FABRIC],
          proofID: "mockProofID11",
          address: "http://localhost" as Address,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
        },
      ],
      bridgesConfig: [besuConfig],
      keyPair: gateway1KeyPair,
    };

    const options2: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [
        {
          id: "mockID-1",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
          version: [
            {
              Core: "v02",
              Architecture: "v02",
              Crash: "v02",
            },
          ],
          supportedDLTs: [SupportedChain.BESU],
          proofID: "mockProofID10",
          address: "http://localhost" as Address,
        },
      ],
      bridgesConfig: [fabricConfig],
      keyPair: gateway2KeyPair,
    };
    const gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    // default servers
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.gatewayOpenAPIPort).toBe(4010);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity2 = gateway2.Identity;
    // default servers
    expect(identity2.gatewayServerPort).toBe(3110);
    expect(identity2.gatewayClientPort).toBe(3111);
    expect(identity2.gatewayOpenAPIPort).toBe(4110);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher = gateway1.getBLODispatcher();

    expect(dispatcher).toBeTruthy();
    const sourceAsset: Asset = {
      owner: firstHighNetWorthAccount,
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
    const req = {
      contextID: "mockContext",
      fromDLTNetworkID: SupportedChain.BESU,
      toDLTNetworkID: SupportedChain.FABRIC,
      fromAmount: "100",
      toAmount: "1",
      originatorPubkey: assigneeEthAccount.address,
      beneficiaryPubkey: fabricUser.credentials.certificate,
      sourceAsset,
      receiverAsset,
    };

    const address = options1.gid!.address!;
    const port = options1.gid!.gatewayOpenAPIPort!;

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req as TransactRequest);
    log.info(res?.data.statusResponse);

    const sessions = await adminApi.getSessionIds({});
    expect(sessions.data).toBeTruthy();
    expect(sessions.data.length).toBe(1);
    expect(sessions.data[0]).toBe(res.data.sessionID);

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
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

    await gateway1.shutdown();
    await gateway2.shutdown();
  });
});
