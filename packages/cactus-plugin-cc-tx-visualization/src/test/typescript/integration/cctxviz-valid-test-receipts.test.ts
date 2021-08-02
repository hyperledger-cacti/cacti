import "jest-extended";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
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
import * as amqp from "amqp-ts";
import { IRabbitMQTestServerOptions } from "@hyperledger/cactus-test-tooling/dist/lib/main/typescript/rabbitmq-test-server/rabbit-mq-test-server";
//import { LedgerType } from "@hyperledger/cactus-core-api/src/main/typescript/public-api";

const testCase =
  "Instantiate plugin, send 4 invalid receipts, one test receipt";
const logLevel: LogLevelDesc = "TRACE";
const queueName = "cc-tx-log-entry-test";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-irt",
});

let cctxViz: CcTxVisualization;
let options: IRabbitMQTestServerOptions;
let channelOptions: IChannelOptions;
let testServer: RabbitMQTestServer;
let cctxvizOptions: IPluginCcTxVisualizationOptions;
let connection: amqp.Connection;
let queue: amqp.Queue;

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
  connection = new amqp.Connection();
  queue = connection.declareQueue(queueName, { durable: false });
  await new Promise((resolve) => setTimeout(resolve, 3000));
});

test(testCase, async () => {
  expect(testServer).toBeDefined();

  // Simulates a Cactus Ledger Connector plugin
  const testMessage = new amqp.Message({
    caseID: "caseID-TEST 1",
    timestamp: new Date(),
    blockchainID: "TEST",
    invocationType: "invocationType-TEST",
    methodName: "methodName-TEST",
    parameters: ["TEST"],
    identity: "test",
  });
  queue.send(testMessage);
  log.info("First message sent!");

  // Initialize our plugin
  cctxViz = new CcTxVisualization(cctxvizOptions);
  expect(cctxViz).toBeDefined();
  log.info("cctxviz plugin is ok");

  // Number of messages on queue: 1
  expect(cctxViz.numberUnprocessedReceipts).toBe(0);
  expect(cctxViz.numberEventsLog).toBe(0);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cctxViz.pollTxReceipts();

  // Number of messages on queue: 0
  expect(cctxViz.numberUnprocessedReceipts).toBe(1);
  expect(cctxViz.numberEventsLog).toBe(0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  // Number of messages on queue: 0
  expect(cctxViz.numberUnprocessedReceipts).toBe(0);
  expect(cctxViz.numberEventsLog).toBe(1);
});
afterAll(async () => {
  await cctxViz.closeConnection();
  await testServer.stop();
  await pruneDockerAllIfGithubAction({ logLevel });
});
