import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript";
import {
  CcTxVisualization,
  IChannelOptions,
} from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import * as amqp from "amqp-ts";
//import { LedgerType } from "@hyperledger/cactus-core-api/src/main/typescript/public-api";

const testCase = "persist logs";
const logLevel: LogLevelDesc = "TRACE";
const queueName = "cc-tx-log-entry-test";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  //initialize rabbitmq
  const options = {
    publishAllPorts: true,
    port: 5672,
    logLevel: logLevel,
    imageName: "rabbitmq",
    imageTag: "3.9-management",
    emitContainerLogs: true,
    envVars: new Map([["AnyNecessaryEnvVar", "Can be set here"]]),
  };
  const channelOptions: IChannelOptions = {
    queueId: queueName,
    dltTechnology: null,
    persistMessages: false,
  };

  const cctxvizOptions: IPluginCcTxVisualizationOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    eventProvider: "amqp://localhost",
    channelOptions: channelOptions,
  };

  const testServer = new RabbitMQTestServer(options);
  const tearDown = async () => {
    // Connections to the RabbitMQ server need to be closed

    await testServer.stop();
    // todo problem connection closing is hanging here and l56
    await connection.close();

    await cctxViz.closeConnection();

    //await testServer.destroy();
    //await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);

  await testServer.start(true);
  t.ok(testServer);

  // Simulates a Cactus Ledger Connector plugin
  const connection = new amqp.Connection();
  const queue = connection.declareQueue(queueName, { durable: false });

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");
  await cctxViz.pollTxReceipts();
  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);

  // already activated by previous test
  //await cctxViz.pollTxReceipts();

  const testMessage = new amqp.Message({
    caseID: "caseID-TEST 1",
    timestamp: new Date(),
    blockchainID: "TEST",
    invocationType: "call",
    methodName: "methodName",
    parameters: ["0", "2"],
    identity: "person 1",
  });
  queue.send(testMessage);

  const testMessage2 = new amqp.Message({
    caseID: "case1",
    cost: 5,
    revenue: 0,
    carbonFootprint: 5,
    timestamp: new Date(),
    blockchainID: "TEST",
    invocationType: "call",
    methodName: "methodName",
    parameters: ["0", "2"],
    identity: "person 1",
  });
  queue.send(testMessage2);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 2);
  // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  const logName = await cctxViz.persistCrossChainLogCsv();
  console.log(logName);
  t.ok(logName);
  t.end();
});
