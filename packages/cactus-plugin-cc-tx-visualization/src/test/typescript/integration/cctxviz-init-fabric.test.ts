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
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";
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

  // dummy use case based on Fig. 3 paper "[1] “Do You Need a Distributed Ledger Technology Interoperability Solution?,” Feb. 2022, doi: 10.36227/.18786527.v1"
  // consider 2 emission consortia (two different case ids);

  const currentTime = new Date();

  // caseID 1; registar emissions; Fabric blockchain, test message; parameters: asset 1, 100 units
  const testMessageCase1Msg1 = new amqp.Message({
    caseID: "1",
    timestamp: currentTime,
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "registerEmission",
    parameters: ["1,100"],
    identity: "company_A",
  });
  queue.send(testMessageCase1Msg1);

  // caseID 2; registar emissions; Fabric blockchain, test message; parameters: asset 2, 100 units
  const testMessageCase2Msg1 = new amqp.Message({
    caseID: "2",
    timestamp: currentTime,
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "registerEmission",
    parameters: ["2,100"],
    identity: "company_B",
  });
  queue.send(testMessageCase2Msg1);

  const testMessageCase1Msg2 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 100000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "registerEmission",
    parameters: ["2,100"],
    identity: "company_A",
  });
  queue.send(testMessageCase1Msg2);

  // several days after, get emissions from company A, by auditor
  const testMessageCase1Msg3 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 1000000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "getEmissions",
    parameters: ["company_A"],
    identity: "auditor",
  });
  queue.send(testMessageCase1Msg3);

  // soon enough, mint token on Ethereum (test)
  const testMessageCase1Msg4 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 1100000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "mintEmissionToken",
    parameters: ["uuidTokenEmissions"],
    identity: "protocol_administrator",
  });
  queue.send(testMessageCase1Msg4);

  //Company B performs its operations a bit later than company A
  const testMessageCase2Msg2 = new amqp.Message({
    caseID: "2",
    timestamp: new Date(currentTime.getTime() + 110000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "registerEmission",
    parameters: ["2,100"],
    identity: "company_B",
  });
  queue.send(testMessageCase2Msg2);

  // several days after, get emissions from company A, by auditor
  const testMessageCase2Msg3 = new amqp.Message({
    caseID: "2",
    timestamp: new Date(currentTime.getTime() + 1100000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "getEmissions",
    parameters: ["company_B"],
    identity: "auditor",
  });
  queue.send(testMessageCase2Msg3);

  // soon enough, mint token on Ethereum (test)
  const testMessageCase2Msg4 = new amqp.Message({
    caseID: "2",
    timestamp: new Date(currentTime.getTime() + 1200000000),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "mintEmissionToken",
    parameters: ["uuidTokenEmissions"],
    identity: "protocol_administrator",
  });
  queue.send(testMessageCase2Msg4);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 8);
  // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  const logName = await cctxViz.persistCrossChainLogCsv();
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
