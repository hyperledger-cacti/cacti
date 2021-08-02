import test, { Test } from "tape-promise/tape";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript";
import {
  CcTxVisualization,
  IChannelOptions,
} from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import * as amqp from "amqp-ts";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";

const testCase = "dummy-baseline-60-events";
const logLevel: LogLevelDesc = "TRACE";
const queueName = "cc-tx-log-entry-test";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-dummy-demo",
});
test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  //initialize rabbitmq
  const setupInfraTime = new Date();
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
    t.comment("shutdown starts");
    await testServer.stop();
    await cctxViz.shutdown();
    await cctxViz.closeConnection();
    log.debug("running process exit");
    process.exit(0);
  };

  test.onFinish(tearDown);
  await testServer.start(true);
  t.ok(testServer);

  // Simulates a Cactus Ledger Connector plugin
  const connection = new amqp.Connection();
  const queue = connection.declareQueue(queueName, { durable: false });

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  const setupInfraTimeEnd = new Date();
  log.debug(
    `EVAL-testFile-SETUP-INFRA:${
      setupInfraTimeEnd.getTime() - setupInfraTime.getTime()
    }`,
  );
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");

  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);

  const currentTime = new Date();
  const timeStartSendMessages = new Date();
  let caseNumber = 10;

  t.comment(`Sending ${caseNumber * 6} messages across ${caseNumber} cases`);
  while (caseNumber > 0) {
    // caseID 1; registar emissions; Fabric blockchain, test message; parameters: asset 1, 100 units
    const testMessage1 = new amqp.Message({
      caseID: caseNumber,
      timestamp: currentTime,
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "initialize asset",
      // Asset 1, 100 units
      parameters: ["1,100"],
      identity: "A",
    });
    queue.send(testMessage1);

    const testMessage2 = new amqp.Message({
      caseID: caseNumber,
      timestamp: new Date(currentTime.getTime() + 2),
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "lock asset",
      // Asset 1, 100 units
      parameters: ["1,100"],
      identity: "A",
    });
    queue.send(testMessage2);

    const testMessage3 = new amqp.Message({
      caseID: caseNumber,
      timestamp: new Date(currentTime.getTime() + 3),
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "mint asset",
      // Asset 1, 100 units
      parameters: ["1,100"],
      identity: "A",
    });
    queue.send(testMessage3);

    const testMessage4 = new amqp.Message({
      caseID: caseNumber,
      timestamp: new Date(currentTime.getTime() + 4),
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "transfer asset",
      // Asset 1, 100 units
      parameters: ["A"],
      identity: "A",
    });
    queue.send(testMessage4);

    const testMessage5 = new amqp.Message({
      caseID: caseNumber,
      timestamp: new Date(currentTime.getTime() + 5),
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "transfer asset",
      // Asset 1, 100 units
      parameters: [""],
      identity: "A",
    });
    queue.send(testMessage5);

    const testMessage6 = new amqp.Message({
      caseID: caseNumber,
      timestamp: new Date(currentTime.getTime() + 6),
      blockchainID: "TEST",
      invocationType: "send",
      methodName: "burn asset",
      // Asset 1, 100 units
      parameters: [""],
      identity: "A",
    });
    queue.send(testMessage6);

    caseNumber--;
  }
  const endTimeSendMessages = new Date();
  t.comment(
    `EVAL-testFile-SEND-MESSAGES:${
      endTimeSendMessages.getTime() - timeStartSendMessages.getTime()
    }`,
  );

  const timeStartPollReceipts = new Date();
  await cctxViz.pollTxReceipts();
  await cctxViz.hasProcessedXMessages(60, 4);

  const endTimePollReceipts = new Date();
  const totalTimePoll =
    endTimePollReceipts.getTime() - timeStartPollReceipts.getTime();
  t.comment(`EVAL-testFile-POLL:${totalTimePoll}`);

  t.assert(cctxViz.numberEventsLog === 0);
  t.assert(cctxViz.numberUnprocessedReceipts === 60);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 60);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  const logName = await cctxViz.persistCrossChainLogCsv(
    "dummy-use-case-60-events",
  );

  const startTimeAggregate = new Date();
  await cctxViz.aggregateCcTx();
  const endTimeAggregate = new Date();
  t.comment(
    `EVAL-testFile-AGGREGATE-CCTX:${
      endTimeAggregate.getTime() - startTimeAggregate.getTime()
    }`,
  );

  const map =
    "{'registerEmission': (node:registerEmission connections:{registerEmission:[0.6666666666666666], getEmissions:[0.6666666666666666]}), 'getEmissions': (node:getEmissions connections:{mintEmissionToken:[0.6666666666666666]}), 'mintEmissionToken': (node:mintEmissionToken connections:{})}";
  // Persist heuristic map that is generated from the script that takes this input
  await cctxViz.saveModel(CrossChainModelType.HeuristicMiner, map);
  const savedModel = await cctxViz.getModel(CrossChainModelType.HeuristicMiner);
  t.assert(map === savedModel);

  console.log(logName);
  t.ok(logName);
  t.end();
});
