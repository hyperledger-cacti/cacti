import "jest-extended";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { DiscoveryOptions } from "fabric-network";
import bodyParser from "body-parser";
import path from "path";
import http, { Server } from "http";
import fs from "fs-extra";
import {
  Web3SigningCredentialType as Web3SigningCredentialTypeBesu,
  PluginLedgerConnectorBesu,
  EthContractInvocationType as EthContractInvocationTypeBesu,
  ReceiptType,
  IPluginLedgerConnectorBesuOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  Configuration as ConfigurationFabric,
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
  BesuTestLedger,
  Containers,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import Web3 from "web3";
import { Account } from "web3-core";
import express from "express";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { CcModelHephaestus } from "../../../main/typescript/plugin-ccmodel-hephaestus";
import { IPluginCcModelHephaestusOptions } from "../../../main/typescript";
import LockAssetContractJson from "../../solidity/lock-asset-contract/LockAsset.json";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";

const logLevel: LogLevelDesc = "INFO";

let fabricServer: Server;
let fabricSigningCredential: FabricSigningCredential;
let fabricLedger: FabricTestLedgerV1;
let fabricContractName: string;
let channelName: string;
let config: ConfigurationFabric;
let fabricApiClient: FabricApi;
let fabricConnector: PluginLedgerConnectorFabric;

let besuLedger: BesuTestLedger;
let besuContractName: string;
let rpcApiHttpHostBesu: string;
let rpcApiWsHost: string;
let web3Besu: Web3;
let firstHighNetWorthAccount: string;
let besuConnector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let testEthAccountBesu: Account;
let keychainPluginBesu: PluginKeychainMemory;

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;
let modeledTransactions: number;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "fabric-besu-asset-transfer.test",
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

    const channelId = "mychannel";
    channelName = channelId;

    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();
    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);
    const sshConfig = await fabricLedger.getSshConfig();
    log.info("admin enrolled");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
    const keychainEntryValue = JSON.stringify(userIdentity);

    const keychainPluginFabric = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPluginFabric],
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
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };
    fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

    const expressAppFabric = express();
    expressAppFabric.use(bodyParser.json({ limit: "250mb" }));
    fabricServer = http.createServer(expressAppFabric);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: fabricServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiUrl = `http://${address}:${port}`;

    await fabricConnector.getOrCreateWebServices();
    await fabricConnector.registerWebServices(expressAppFabric);

    config = new ConfigurationFabric({ basePath: apiUrl });

    fabricApiClient = new FabricApi(config);

    // deploy contracts ...
    fabricContractName = "basic-asset-transfer-2";
    const contractRelPath =
      "../fabric-contracts/lock-asset/chaincode-typescript";

    const contractDir = path.join(__dirname, contractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── assetTransfer.ts
    // │   ├── asset.ts
    // │   ├── index.ts
    // │   └── ITraceableContract.ts
    // ├── tsconfig.json
    // --------
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
      const filename = "./asset.ts";
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
      const filename = "./assetTransfer.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    const res = await fabricApiClient.deployContractV1({
      channelId,
      ccVersion: "1.0.0",
      sourceFiles,
      ccName: fabricContractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "basic-asset-transfer-2",
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
    log.info("Contract deployed");

    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
  }
  {
    besuLedger = new BesuTestLedger();
    await besuLedger.start();

    rpcApiHttpHostBesu = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3Besu = new Web3(rpcApiHttpHostBesu);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    testEthAccountBesu = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    besuContractName = "LockAsset";

    const keychainEntryValue = besuKeyPair.privateKey;
    const keychainEntryKey = uuidv4();
    keychainPluginBesu = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPluginBesu.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPluginBesu],
    });

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost: rpcApiHttpHostBesu,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    besuConnector = new PluginLedgerConnectorBesu(options);
    pluginRegistry.add(besuConnector);

    await besuConnector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccountBesu.address,
        value: 10e9,
        gas: 1000000,
      },
    });
    const balance = await web3Besu.eth.getBalance(testEthAccountBesu.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);

    log.info("Connector initialized");

    const deployOut = await besuConnector.deployContract({
      keychainId: keychainPluginBesu.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
      contractAbi: LockAssetContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: LockAssetContractJson.bytecode,
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    log.info("Contract Deployed successfully");
  }
  {
    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: logLevel,
      besuTxObservable: besuConnector.getTxSubjectObservable(),
      fabricTxObservable: fabricConnector.getTxSubjectObservable(),
      sourceLedger: LedgerType.Fabric2,
      targetLedger: LedgerType.Besu2X,
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  }
  {
    const createResFabric1 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset1_fabric", "10", "owner1"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric1).toBeTruthy();

    const createResFabric2 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset2_fabric", "10", "owner2"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric2).toBeTruthy();

    const createResFabric3 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["tx1_asset_fabric", "10", "owner3"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric3).toBeTruthy();

    const createResFabric4 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["tx2_asset_fabric", "10", "owner4"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric4).toBeTruthy();

    const createResFabric5 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["tx3_asset_fabric", "10", "owner5"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric5).toBeTruthy();

    const createResFabric6 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["tx4_asset_fabric", "10", "owner6"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric6).toBeTruthy();

    const { success: createResBesu } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["tx5_asset_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu).toBeTruthy();
  }
  {
    hephaestus.monitorTransactions(0);

    hephaestus.setCaseId("cctx1");

    const lockResFabric1 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset1_fabric"],
      methodName: "LockAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(lockResFabric1).toBeTruthy();

    const deleteResFabric1 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset1_fabric"],
      methodName: "DeleteAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(deleteResFabric1).toBeTruthy();

    const { success: createResBesu } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset1_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu).toBeTruthy();
    modeledTransactions = 3;

    hephaestus.setCaseId("cctx2");

    const lockResFabric2 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset2_fabric"],
      methodName: "LockAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(lockResFabric2).toBeTruthy();

    const deleteResFabric2 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset2_fabric"],
      methodName: "DeleteAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(deleteResFabric2).toBeTruthy();

    const { success: createResBesu2 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset2_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu2).toBeTruthy();

    modeledTransactions = 6;
    expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

    const model = await hephaestus.createModel();
    expect(model).toBeTruthy();
    expect(hephaestus.ccModel.getModel(CrossChainModelType.PetriNet))
      .toBeTruthy;
    hephaestus.setIsModeling(false);
  }
});

test("Tx1 - Unlock after lock", async () => {
  hephaestus.setCaseId("unmodeled_cctx1");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const lockResFabric1 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx1_asset_fabric"],
    methodName: "LockAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(lockResFabric1).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const unlockResFabric1 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx1_asset_fabric"],
    methodName: "UnlockAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(unlockResFabric1).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(2);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Tx2 - Skip escrow", async () => {
  hephaestus.setCaseId("unmodeled_cctx2");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: createResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "createAsset",
    params: ["tx2_asset_besu", 10],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(createResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(1);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Tx3 - Skip burn", async () => {
  hephaestus.setCaseId("unmodeled_cctx3");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const lockResFabric = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx3_asset_fabric"],
    methodName: "LockAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(lockResFabric).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const { success: createResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "createAsset",
    params: ["tx3_asset_besu", 10],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(createResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(2);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Tx4 - Double mint", async () => {
  hephaestus.setCaseId("unmodeled_cctx4");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const lockResFabric2 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx4_asset_fabric"],
    methodName: "LockAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(lockResFabric2).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const deleteResFabric2 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx4_asset_fabric"],
    methodName: "DeleteAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(deleteResFabric2).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(2);

  const { success: createResBesu1 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "createAsset",
    params: ["tx4_asset_besu", 10],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(createResBesu1).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  modeledTransactions += 3;
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: createResBesu2 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "createAsset",
    params: ["tx4_asset_besu", 10],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(createResBesu2).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(1);
});

test("Tx5 - Asset transfer from Besu to Fabric", async () => {
  hephaestus.setCaseId("unmodeled_cctx5");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["tx5_asset_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();

  const { success: deleteResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "deleteAsset",
    params: ["tx5_asset_besu"],
    signingCredential: {
      ethAccount: testEthAccountBesu.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(deleteResBesu).toBeTruthy();

  const createResFabric = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx5_asset_fabric", "10", "fabric_owner"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric).toBeTruthy();

  expect(hephaestus.numberEventsNonConformedLog).toEqual(3);
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(fabricServer);

  await besuLedger.stop();
  await besuLedger.destroy();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
