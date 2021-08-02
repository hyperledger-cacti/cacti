import "jest-extended";
import {
  Checks,
  IListenOptions,
  LoggerProvider,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import {
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

const testCase = "Instantiate plugin with fabric, send 2 transactions";
const logLevel: LogLevelDesc = "TRACE";

// By default that's the Fabric connector queue
const queueName = "cc-tx-viz-queue";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-fabtest",
});
const fixturesPath =
  "../../../../../cactus-plugin-ledger-connector-fabric/src/test/typescript/fixtures";

let cctxViz: CcTxVisualization;
let options: IRabbitMQTestServerOptions;
let channelOptions: IChannelOptions;
let testServer: RabbitMQTestServer;
let cctxvizOptions: IPluginCcTxVisualizationOptions;
let ledger: FabricTestLedgerV1;
const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);
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

  ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    logLevel,
  });
  await ledger.start();
});

test(testCase, async () => {
  expect(testServer).toBeDefined();
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
  const contractDir = path.join(__dirname, fixturesPath, contractRelPath);
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

  const { packageIds, lifecycle, success } = res.data;
  expect(success).toBe(true);
  expect(res.status).toBe(200);
  const {
    approveForMyOrgList,
    installList,
    queryInstalledList,
    commit,
    packaging,
    queryCommitted,
  } = lifecycle;

  Checks.truthy(packageIds, `packageIds truthy OK`);
  Checks.truthy(
    Array.isArray(packageIds),
    `Array.isArray(packageIds) truthy OK`,
  );
  Checks.truthy(approveForMyOrgList, `approveForMyOrgList truthy OK`);
  Checks.truthy(
    Array.isArray(approveForMyOrgList),
    `Array.isArray(approveForMyOrgList) truthy OK`,
  );
  Checks.truthy(installList, `installList truthy OK`);
  Checks.truthy(
    Array.isArray(installList),
    `Array.isArray(installList) truthy OK`,
  );
  Checks.truthy(queryInstalledList, `queryInstalledList truthy OK`);
  Checks.truthy(
    Array.isArray(queryInstalledList),
    `Array.isArray(queryInstalledList) truthy OK`,
  );
  Checks.truthy(commit, `commit truthy OK`);
  Checks.truthy(packaging, `packaging truthy OK`);
  Checks.truthy(queryCommitted, `queryCommitted truthy OK`);

  // FIXME - without this wait it randomly fails with an error claiming that
  // the endorsement was impossible to be obtained. The fabric-samples script
  // does the same thing, it just waits 10 seconds for good measure so there
  // might not be a way for us to avoid doing this, but if there is a way we
  // absolutely should not have timeouts like this, anywhere...
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const assetId = uuidv4();
  const assetOwner = uuidv4();

  // Setup: transact
  const createRes = await apiClient.runTransactionV1({
    caseID: "Fabric-TEST",
    contractName,
    channelName,
    params: [assetId, "Green", "19", assetOwner, "9999"],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  expect(createRes).toBeDefined();

  const getRes = await apiClient.runTransactionV1({
    caseID: "Fabric-TEST",
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

  // Initialize our plugin
  expect(cctxViz).toBeDefined();
  log.info("cctxviz plugin is ok");

  // Number of messages on queue: 1
  expect(cctxViz.numberUnprocessedReceipts).toBe(0);
  expect(cctxViz.numberEventsLog).toBe(0);

  await new Promise((resolve) => setTimeout(resolve, 500));
  await cctxViz.pollTxReceipts();

  // Number of messages on queue: 0
  expect(cctxViz.numberUnprocessedReceipts).toBeGreaterThanOrEqual(1);
  expect(cctxViz.numberEventsLog).toBe(0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  // Number of messages on queue: 0
  expect(cctxViz.numberUnprocessedReceipts).toBe(0);
  expect(cctxViz.numberEventsLog).toBeGreaterThanOrEqual(1);

  await cctxViz.persistCrossChainLogCsv("fabric");
});
afterAll(async () => {
  await cctxViz.closeConnection();
  await testServer.stop();
  await ledger.stop();
  await ledger.destroy();
  await Servers.shutdown(server);
  await pruneDockerAllIfGithubAction({ logLevel });
  process.exit(0);
});
