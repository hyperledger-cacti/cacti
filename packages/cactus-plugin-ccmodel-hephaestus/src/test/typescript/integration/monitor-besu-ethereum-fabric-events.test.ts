import "jest-extended";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
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

const logLevel: LogLevelDesc = "INFO";

let fabricServer: Server;
let fabricSigningCredential: FabricSigningCredential;
let fabricLedger: FabricTestLedgerV1;
let fabricContractName: string;
let channelName: string;
let config: ConfigurationFabric;
let fabricApiClient: FabricApi;
let fabricConnector: PluginLedgerConnectorFabric;
const FABRIC_ASSET_ID = uuidv4();

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
const BESU_ASSET_ID = uuidv4();

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

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "monitor-besu-ethereum-fabric-events.test.test",
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
      besuTxObservable: besuConnector.getTxSubjectObservable(),
      ethTxObservable: ethereumConnector.getTxSubjectObservable(),
      fabricTxObservable: fabricConnector.getTxSubjectObservable(),
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  }
});

test("Monitor Besu, Ethereum and Fabric transactions", async () => {
  hephaestus.setCaseId("BESU_ETHEREUM_FABRIC_MONITORING_3_CASES");
  hephaestus.monitorTransactions();

  const numberOfCases = 3;
  const txsPerCase = 9;
  let caseNumber = 1;

  while (numberOfCases >= caseNumber) {
    hephaestus.setCaseId("BESU_ETHEREUM_FABRIC_" + caseNumber);
    {
      const { success: createResBesu } = await besuConnector.invokeContract({
        contractName: besuContractName,
        keychainId: keychainPluginBesu.getKeychainId(),
        invocationType: EthContractInvocationTypeBesu.Send,
        methodName: "createAsset",
        params: [BESU_ASSET_ID, 10],
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: besuKeyPair.privateKey,
          type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
        },
        gas: 1000000,
      });
      expect(createResBesu).toBeTruthy();

      const { success: lockResBesu } = await besuConnector.invokeContract({
        contractName: besuContractName,
        keychainId: keychainPluginBesu.getKeychainId(),
        invocationType: EthContractInvocationTypeBesu.Send,
        methodName: "lockAsset",
        params: [BESU_ASSET_ID],
        signingCredential: {
          ethAccount: testEthAccountBesu.address,
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
        params: [BESU_ASSET_ID],
        signingCredential: {
          ethAccount: testEthAccountBesu.address,
          secret: besuKeyPair.privateKey,
          type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
        },
        gas: 1000000,
      });
      expect(deleteResBesu).toBeTruthy();
    }
    {
      const createResEth = await ethereumApiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPluginEthereum.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        params: ["asset1", 5],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(createResEth).toBeTruthy();
      expect(createResEth.data).toBeTruthy();

      const lockResEth = await ethereumApiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPluginEthereum.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAsset",
        params: ["asset1"],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(lockResEth).toBeTruthy();
      expect(lockResEth.data).toBeTruthy();
      expect(lockResEth.status).toBe(200);

      const deleteResEth = await ethereumApiClient.invokeContractV1({
        contract: {
          contractName: LockAssetContractJson.contractName,
          keychainId: keychainPluginEthereum.getKeychainId(),
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "deleteAsset",
        params: ["asset1", "owner1"],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      expect(deleteResEth).toBeTruthy();
      expect(deleteResEth.data).toBeTruthy();
      expect(deleteResEth.status).toBe(200);
    }
    {
      const createResFabric = await fabricApiClient.runTransactionV1({
        contractName: fabricContractName,
        channelName,
        params: [FABRIC_ASSET_ID, "10", "owner1"],
        methodName: "CreateAsset",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: fabricSigningCredential,
      });
      expect(createResFabric).toBeTruthy();

      const transferResFabric = await fabricApiClient.runTransactionV1({
        contractName: fabricContractName,
        channelName,
        params: [FABRIC_ASSET_ID, "owner2"],
        methodName: "TransferAsset",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: fabricSigningCredential,
      });
      expect(transferResFabric).toBeTruthy();

      const deleteResFabric = await fabricApiClient.runTransactionV1({
        contractName: fabricContractName,
        channelName,
        params: [FABRIC_ASSET_ID],
        methodName: "DeleteAsset",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: fabricSigningCredential,
      });
      expect(deleteResFabric).toBeTruthy();
    }

    caseNumber++;
  }

  const totalTxs = txsPerCase * numberOfCases;
  expect(hephaestus.numberUnprocessedReceipts).toEqual(totalTxs);
  expect(hephaestus.numberEventsLog).toEqual(0);

  await hephaestus.txReceiptToCrossChainEventLogEntry();

  expect(hephaestus.numberUnprocessedReceipts).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(totalTxs);

  await hephaestus.persistCrossChainLogCsv(
    "example-dummy-besu-ethereum-fabric-events",
  );
  await hephaestus.persistCrossChainLogJson(
    "example-dummy-besu-ethereum-fabric-events",
  );
});

afterAll(async () => {
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(fabricServer);

  await besuLedger.stop();
  await besuLedger.destroy();

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
