import "jest-extended";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Configuration,
  Constants,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { DiscoveryOptions } from "fabric-network";
import bodyParser from "body-parser";
import path from "path";
import http, { Server } from "http";
import fs from "fs-extra";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
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

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";
const keychainEntryKey = uuidv4();
let testEthAccount: Account;
let web3Eth: InstanceType<typeof Web3>;
let addressInfo;
let address: string;
let port: number;
let apiHost: string;
let apiConfig;
let ethereumLedger: GethTestLedger;
let ethereumApiClient: EthereumApi;
let ethereumConnector: PluginLedgerConnectorEthereum;
let rpcApiHttpHostEthereum: string;
let keychainPluginEthereum: PluginKeychainMemory;
const expressAppEthereum = express();
expressAppEthereum.use(bodyParser.json({ limit: "250mb" }));
const ethereumServer = http.createServer(expressAppEthereum);
const wsApi = new SocketIoServer(ethereumServer, {
  path: Constants.SocketIoConnectionPathV1,
});

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;
let modeledTransactions: number;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "ethereum-fabric-asset-transfer.test",
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
    ethereumLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ethereumLedger.start();

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: ethereumServer,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;

    apiConfig = new Configuration({ basePath: apiHost });
    ethereumApiClient = new EthereumApi(apiConfig);
    rpcApiHttpHostEthereum = await ethereumLedger.getRpcApiHttpHost();
    web3Eth = new Web3(rpcApiHttpHostEthereum);
    testEthAccount = web3Eth.eth.accounts.create();

    log.info("Create PluginKeychainMemory...");
    const keychainEntryValue = testEthAccount.privateKey;
    keychainPluginEthereum = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPluginEthereum.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    log.info("Create PluginLedgerConnectorEthereum...");
    ethereumConnector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost: rpcApiHttpHostEthereum,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPluginEthereum] }),
    });

    await ethereumConnector.getOrCreateWebServices();
    await ethereumConnector.registerWebServices(expressAppEthereum, wsApi);

    log.info("Deploy Contract...");
    const deployOut = await ethereumApiClient.deployContract({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();
    log.info("contract deployed successfully");

    const initTransferValue = web3Eth.utils.toWei("5000", "ether");
    await ethereumApiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: initTransferValue,
      },
    });
    const balance = await web3Eth.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toBe(initTransferValue);
  }
  {
    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: logLevel,
      ethTxObservable: ethereumConnector.getTxSubjectObservable(),
      fabricTxObservable: fabricConnector.getTxSubjectObservable(),
      sourceLedger: LedgerType.Ethereum,
      targetLedger: LedgerType.Fabric2,
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  }
  {
    const createResEth1 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset1_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth1).toBeTruthy();

    const createResEth2 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset2_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth2).toBeTruthy();

    const createResEth3 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["tx1_asset_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth3).toBeTruthy();

    const createResEth4 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["tx2_asset_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth4).toBeTruthy();

    const createResEth5 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["tx3_asset_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth5).toBeTruthy();

    const createResEth6 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["tx4_asset_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth6).toBeTruthy();

    const createResFabric = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["tx5_asset_fabric", "10", "owner1"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric).toBeTruthy();
  }
  {
    hephaestus.monitorTransactions(0);

    hephaestus.setCaseId("cctx1");

    const lockResEth1 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset1_eth"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(lockResEth1).toBeTruthy();

    const deleteResEth1 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "deleteAsset",
      params: ["asset1_eth"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deleteResEth1).toBeTruthy();

    const createResFabric1 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset1_fabric", "10", "owner_fabric"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric1).toBeTruthy();
    modeledTransactions = 3;
    expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

    hephaestus.setCaseId("cctx2");

    const lockResEth2 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset2_eth"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(lockResEth2).toBeTruthy();

    const deleteResEth2 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "deleteAsset",
      params: ["asset2_eth"],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deleteResEth2).toBeTruthy();

    const createResFabric2 = await fabricApiClient.runTransactionV1({
      contractName: fabricContractName,
      channelName,
      params: ["asset2_fabric", "10", "owner_fabric"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(createResFabric2).toBeTruthy();

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

  const lockResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["tx1_asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(lockResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const unlockResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "unLockAsset",
    params: ["tx1_asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(unlockResEth).toBeTruthy();
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

  const createResFabric = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx2_asset_fabric", "10", "owner1"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric).toBeTruthy();
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

  const lockResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["tx3_asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(lockResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const createResFabric = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx3_asset_fabric", "10", "owner2"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric).toBeTruthy();
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

  const lockResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["tx4_asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(lockResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const deleteResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "deleteAsset",
    params: ["tx4_asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(deleteResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(2);

  const createResFabric1 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx4_asset_fabric", "10", "owner3"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric1).toBeTruthy();
  modeledTransactions += 3;
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);

  const createResFabric2 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx4_asset_fabric", "10", "owner3"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(createResFabric2).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(1);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Tx5 - Asset transfer from Fabric to Ethereum", async () => {
  hephaestus.setCaseId("unmodeled_cctx5");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const lockResFabric1 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx5_asset_fabric"],
    methodName: "LockAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(lockResFabric1).toBeTruthy();

  const deleteResFabric1 = await fabricApiClient.runTransactionV1({
    contractName: fabricContractName,
    channelName,
    params: ["tx5_asset_fabric"],
    methodName: "DeleteAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });
  expect(deleteResFabric1).toBeTruthy();

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset2_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();

  expect(hephaestus.numberEventsNonConformedLog).toEqual(3);
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(fabricServer);

  await ethereumConnector.shutdown();
  await ethereumLedger.stop();
  await ethereumLedger.destroy();
  await Servers.shutdown(ethereumServer);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
