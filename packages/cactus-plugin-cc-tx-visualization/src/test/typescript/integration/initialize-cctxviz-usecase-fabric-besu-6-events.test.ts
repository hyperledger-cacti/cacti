import test, { Test } from "tape-promise/tape";
import {
  IListenOptions,
  LoggerProvider,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  Containers,
  FabricTestLedgerV1,
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
import { DiscoveryOptions } from "fabric-network";
import { Configuration } from "@hyperledger/cactus-core-api";
import fs from "fs-extra";
import LockAssetContractJson from "../../solidity/LockAsset.json";
import { PluginImportType } from "@hyperledger/cactus-core-api";

import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import path from "path";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { AddressInfo } from "net";
import Web3 from "web3";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

const testCase = "Instantiate plugin with fabric, send 2 transactions";
const logLevel: LogLevelDesc = "TRACE";

// By default that's the Fabric connector queue
const queueName = "cc-tx-viz-queue";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-fabtest",
});
//const fixturesPath =
("../../../../../cactus-plugin-ledger-connector-fabric/src/test/typescript/fixtures");
const alternativeFixturesPath = "../fixtures";

let cctxViz: CcTxVisualization;
let options: IRabbitMQTestServerOptions;
let channelOptions: IChannelOptions;
let testServer: RabbitMQTestServer;
let cctxvizOptions: IPluginCcTxVisualizationOptions;
let ledger: FabricTestLedgerV1;
let besuTestLedger: BesuTestLedger;
const expressAppBesu = express();
expressAppBesu.use(bodyParser.json({ limit: "250mb" }));

const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);

test(testCase, async (t: Test) => {
  const setupInfraTime = new Date();
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

  ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    logLevel,
  });
  await ledger.start();

  besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();
  const tearDown = async () => {
    await cctxViz.closeConnection();
    await testServer.stop();
    await ledger.stop();
    await ledger.destroy();
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
    log.debug("executing exit");
    process.exit(0);
  };

  test.onFinish(tearDown);
  t.ok(testServer);
  const channelId = "mychannel";
  const channelName = channelId;

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
  const keychainEntryValue = JSON.stringify(userIdentity);

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

  const discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };

  // This is the directory structure of the Fabirc 2.x CLI container (fabric-tools image)
  // const orgCfgDir = "/fabric-samples/test-network/organizations/";
  const orgCfgDir =
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";

  // these below mirror how the fabric-samples sets up the configuration
  const org1Env = {
    CORE_LOGGING_LEVEL: "debug",
    FABRIC_LOGGING_SPEC: "debug",
    CORE_PEER_LOCALMSPID: "Org1MSP",

    ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

    FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
    CORE_PEER_TLS_ENABLED: "true",
    CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
    CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
    CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
    ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
  };

  // these below mirror how the fabric-samples sets up the configuration
  const org2Env = {
    CORE_LOGGING_LEVEL: "debug",
    FABRIC_LOGGING_SPEC: "debug",
    CORE_PEER_LOCALMSPID: "Org2MSP",

    FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
    CORE_PEER_TLS_ENABLED: "true",
    ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

    CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
    CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp`,
    CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`,
    ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    collectTransactionReceipts: true,
    instanceId: uuidv4(),
    dockerBinary: "/usr/local/bin/docker",
    peerBinary: "/fabric-samples/bin/peer",
    goBinary: "/usr/local/go/bin/go",
    pluginRegistry,
    cliContainerEnv: org1Env,
    sshConfig,
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      commitTimeout: 300,
    },
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { port } = addressInfo;

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);
  const apiUrl = `http://localhost:${port}`;

  const config = new Configuration({ basePath: apiUrl });

  const apiClient = new FabricApi(config);

  // Setup: contract name
  const contractName = "basic-asset-transfer-2";

  // Setup: contract directory
  const contractRelPath = "go/basic-asset-transfer/chaincode-typescript";
  const contractDir = path.join(
    __dirname,
    alternativeFixturesPath,
    contractRelPath,
  );
  const sourceFiles: FileBase64[] = [];
  // Setup: push files
  {
    const filename = "./tslint.json";
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
  // Setup: Deploy smart contract
  const res = await apiClient.deployContractV1({
    channelId,
    ccVersion: "1.0.0",
    // constructorArgs: { Args: ["john", "99"] },
    sourceFiles,
    ccName: contractName,
    targetOrganizations: [org1Env, org2Env],
    caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    ccLabel: "basic-asset-transfer-2",
    ccLang: ChainCodeProgrammingLanguage.Typescript,
    ccSequence: 1,
    orderer: "orderer.example.com:7050",
    ordererTLSHostnameOverride: "orderer.example.com",
    connTimeout: 60,
  });

  const { success } = res.data;
  t.assert(success);
  t.assert(res.status === 200);

  const contractNameBesu = "LockAsset";

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

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKeyBesu = uuidv4();
  const keychainEntryValueBesu = testEthAccount.privateKey;
  const keychainPluginBesu = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKeyBesu, keychainEntryValueBesu]]),
    logLevel,
  });
  keychainPluginBesu.set(
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
    pluginRegistry: new PluginRegistry({ plugins: [keychainPluginBesu] }),
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance);

  const deployOut = await connector.deployContract({
    keychainId: keychainPluginBesu.getKeychainId(),
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
  t.ok(deployOut);
  t.ok(deployOut.transactionReceipt);

  const setupInfraTimeEnd = new Date();
  log.debug(
    `EVAL-testFile-SETUP-INFRA:${
      setupInfraTimeEnd.getTime() - setupInfraTime.getTime()
    }`,
  );

  const timeStartSendMessages = new Date();

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
  const { success: createRes } = await connector.invokeContract({
    caseID: "FABRIC_BESU",
    contractName: contractNameBesu,
    keychainId: keychainPluginBesu.getKeychainId(),
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
  t.ok(createRes);
  t.assert(createRes === true);
  log.warn("create ok");
  const { success: lockRes } = await connector.invokeContract({
    caseID: "FABRIC_BESU",
    contractName: contractNameBesu,
    keychainId: keychainPluginBesu.getKeychainId(),
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
  t.ok(lockRes);
  const assetId = "asset1";
  const assetOwner = "owner1";

  const createResFabric = await apiClient.runTransactionV1({
    caseID: "FABRIC_BESU",
    contractName,
    channelName,
    params: [assetId, "Green", "19", assetOwner, "9999"],
    methodName: "MintAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  t.ok(createResFabric);

  // READS are not considered transactions, but are relevant to our use case
  /*
  const getRes = await apiClient.runTransactionV1({
    caseID: "FABRIC_BESU",
    contractName,
    channelName,
    params: [assetId],
    methodName: "ReadAsset",
    invocationType: FabricContractInvocationType.Call,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  expect(getRes).toBeDefined();
  */

  // Setup: transact
  const transferAssetRes = await apiClient.runTransactionV1({
    caseID: "FABRIC_BESU",
    contractName,
    channelName,
    params: [assetId, "owner2"],
    methodName: "TransferAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  t.ok(transferAssetRes);
  // Setup: transact
  const transferAssetBackRes = await apiClient.runTransactionV1({
    caseID: "FABRIC_BESU",
    contractName,
    channelName,
    params: [assetId, "owner1"],
    methodName: "TransferAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  t.ok(transferAssetBackRes);
  // Setup: transact
  const burnAssetRes = await apiClient.runTransactionV1({
    caseID: "FABRIC_BESU",
    contractName,
    channelName,
    params: [assetId],
    methodName: "BurnAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  t.ok(burnAssetRes);

  // Initialize our plugin
  t.ok(cctxViz);
  log.info("cctxviz plugin is ok");
  const endTimeSendMessages = new Date();
  log.debug(
    `EVAL-testFile-SEND-MESSAGES:${
      endTimeSendMessages.getTime() - timeStartSendMessages.getTime()
    }`,
  );
  const timeStartPollReceipts = new Date();
  await cctxViz.pollTxReceipts();
  await cctxViz.hasProcessedXMessages(6, 4);

  const endTimePollReceipts = new Date();
  const totalTimePoll =
    endTimePollReceipts.getTime() - timeStartPollReceipts.getTime();
  log.debug(`EVAL-testFile-POLL:${totalTimePoll}`);

  // Number of messages on queue: 0
  t.assert(cctxViz.numberUnprocessedReceipts > 1);
  t.assert(cctxViz.numberEventsLog === 0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  // Number of messages on queue: 0
  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog > 1);

  await cctxViz.persistCrossChainLogCsv("use-case-besu-fabric-6-events");

  const startTimeAggregate = new Date();
  await cctxViz.aggregateCcTx();
  const endTimeAggregate = new Date();
  log.debug(
    `EVAL-testFile-AGGREGATE-CCTX:${
      endTimeAggregate.getTime() - startTimeAggregate.getTime()
    }`,
  );
});
