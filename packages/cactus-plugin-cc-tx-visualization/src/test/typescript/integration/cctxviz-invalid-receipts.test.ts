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
const firstMessage = "[1] Hello Nexus-6";
const anotherMessage = "[2] Would you please take the VK test?";

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
  const message = new amqp.Message(firstMessage);
  queue.send(message);
  log.info("First message sent!");

  // Initialize our plugin
  cctxViz = new CcTxVisualization(cctxvizOptions);
  expect(cctxViz).toBeDefined();
  log.info("cctxviz plugin is ok");

  expect(cctxViz.numberUnprocessedReceipts).toBe(0);

  const message2 = new amqp.Message(anotherMessage);
  queue.send(message2);
  log.info("Second message sent!");

  const message3 = new amqp.Message({
    success: true,
    message: "The VK test was taken",
  });
  queue.send(message3);
  log.info("Third message sent!");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cctxViz.pollTxReceipts();
  expect(cctxViz.numberUnprocessedReceipts).toBe(3);
  await cctxViz.txReceiptToCrossChainEventLogEntry();

  const message4 = new amqp.Message({
    success: true,
    message: "And you passed!",
  });
  queue.send(message4);
  log.info("Fourth message sent!");

  log.info("waiting for RabbitMQ to send last message");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  expect(cctxViz.numberUnprocessedReceipts).toBe(1);

  await cctxViz.txReceiptToCrossChainEventLogEntry();
  expect(cctxViz.numberEventsLog).toBe(1);
});
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testServer.stop();

  await cctxViz.closeConnection();
  await cctxViz.shutdown();
  await pruneDockerAllIfGithubAction({ logLevel });
});
