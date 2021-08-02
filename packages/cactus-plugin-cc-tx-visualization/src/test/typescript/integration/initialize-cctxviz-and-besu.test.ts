import "jest-extended";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  //Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { PluginImportType } from "@hyperledger/cactus-core-api";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript";
import {
  CcTxVisualization,
  IChannelOptions,
} from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import { IRabbitMQTestServerOptions } from "@hyperledger/cactus-test-tooling/dist/lib/main/typescript/rabbitmq-test-server/rabbit-mq-test-server";
import { v4 as uuidv4 } from "uuid";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import Web3 from "web3";

import express from "express";
import bodyParser from "body-parser";

const testCase = "Instantiate plugin with besu, send 2 transactions";
const logLevel: LogLevelDesc = "TRACE";

// By default that's the Fabric connector queue
const queueName = "cc-tx-viz-queue";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-fabtest",
});
import LockAssetContractJson from "../../solidity/LockAsset.json";

let cctxViz: CcTxVisualization;
let options: IRabbitMQTestServerOptions;
let channelOptions: IChannelOptions;
let testServer: RabbitMQTestServer;
let cctxvizOptions: IPluginCcTxVisualizationOptions;
let besuTestLedger: BesuTestLedger;
const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
//const server = http.createServer(expressApp);

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  options = {
    publishAllPorts: true,
    port: 5672,
    logLevel: logLevel,
    imageName: "rabbitmq",
    imageTag: "3.9-management",
    emitContainerLogs: true,
    envVars: new Map([["AnyNecessaryEnvVar", "Can be set here"]]),
  };
  channelOptions = {
    queueId: queueName,
    dltTechnology: null,
    persistMessages: false,
  };

  cctxvizOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    eventProvider: "amqp://localhost",
    channelOptions: channelOptions,
  };
  testServer = new RabbitMQTestServer(options);

  await testServer.start();
  cctxViz = new CcTxVisualization(cctxvizOptions);

  besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();
});

test(testCase, async () => {
  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
  const besuKeyPair = {
    privateKey: besuTestLedger.getGenesisAccountPrivKey(),
  };
  const contractName = "LockAsset";

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKey = uuidv4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });
  keychainPlugin.set(
    LockAssetContractJson.contractName,
    JSON.stringify(LockAssetContractJson),
  );
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    collectTransactionReceipts: true,
    rpcApiHttpHost,
    rpcApiWsHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  await connector.transact({
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
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  expect(balance).toBeDefined();

  const deployOut = await connector.deployContract({
    keychainId: keychainPlugin.getKeychainId(),
    contractName: LockAssetContractJson.contractName,
    contractAbi: LockAssetContractJson.abi,
    constructorArgs: [],
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    bytecode: LockAssetContractJson.bytecode,
    gas: 1000000,
  });
  expect(deployOut).toBeDefined();
  expect(deployOut.transactionReceipt).toBeDefined();

  const { success: createRes } = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset1", 5],
    signingCredential: {
      ethAccount: testEthAccount.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(createRes).toBeDefined();
  expect(createRes).toBe(true);
  log.warn("create ok");
  const { success: lockRes } = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["asset1"],
    signingCredential: {
      ethAccount: testEthAccount.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  log.warn("checking lock res");
  expect(lockRes).toBeDefined();
  expect(lockRes).toBeTrue();
  const { success: unLockRes } = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "unLockAsset",
    params: ["asset1"],
    signingCredential: {
      ethAccount: testEthAccount.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(unLockRes).toBeDefined();
  expect(unLockRes).toBeTrue();
  const { success: lockRes2 } = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["asset1"],
    signingCredential: {
      ethAccount: testEthAccount.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockRes2).toBeDefined();
  expect(lockRes2).toBeTrue();
  log.warn("asset is locked again");
  const { success: deleteRes } = await connector.invokeContract({
    contractName,
    keychainId: keychainPlugin.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "deleteAsset",
    params: ["asset1"],
    signingCredential: {
      ethAccount: testEthAccount.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 1000000,
  });
  console.log(deleteRes);
  expect(deleteRes).toBeDefined();
  expect(deleteRes).toBeTrue();

  // Initialize our plugin
  expect(cctxViz).toBeDefined();
  log.info("cctxviz plugin is ok");

  // Number of messages on queue: 1
  expect(cctxViz.numberUnprocessedReceipts).toBe(0);
  expect(cctxViz.numberEventsLog).toBe(0);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await cctxViz.pollTxReceipts();

  // Number of messages on queue: 0
  // Depending on the latency, we might have 4 or 5 receipts received
  expect(cctxViz.numberUnprocessedReceipts).toBeGreaterThanOrEqual(4);
  expect(cctxViz.numberEventsLog).toBeLessThanOrEqual(1);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  // Number of messages on queue: 0
  expect(cctxViz.numberUnprocessedReceipts).toBeLessThanOrEqual(1);
  expect(cctxViz.numberEventsLog).toBeGreaterThanOrEqual(4);

  await cctxViz.persistCrossChainLogCsv("besu");
});
afterAll(async () => {
  await cctxViz.closeConnection();
  await testServer.stop();
  await besuTestLedger.stop();
  await besuTestLedger.destroy();
  await pruneDockerAllIfGithubAction({ logLevel });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  process.exit(0);
});
