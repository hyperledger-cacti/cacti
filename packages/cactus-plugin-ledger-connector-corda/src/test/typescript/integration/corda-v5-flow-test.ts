import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { AddressInfo } from "net";
import "jest-extended";

import {
  CordaV5TestLedger,
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  Servers,
  Logger,
  LoggerProvider,
  IListenOptions,
} from "@hyperledger/cactus-common";
import {
  IPluginLedgerConnectorCordaOptions,
  PluginLedgerConnectorCorda,
  CordaVersion,
} from "../../../main/typescript/plugin-ledger-connector-corda";
import {
  DefaultApi as CordaApi,
  CPIIDV5,
  CPIV5Response,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "Tests are passing on the JVM side";
const logLevel: LogLevelDesc = "TRACE";

import express from "express";
import bodyParser from "body-parser";
import http from "http";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test("can get past logs of an account", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const logger: Logger = LoggerProvider.getOrCreate({
    label: "test-check-connection-to-ethereum-ledger",
    level: logLevel,
  });

  const cordaV5TestLedger = new CordaV5TestLedger();
  await cordaV5TestLedger.start();
  t.ok(cordaV5TestLedger, "cordaV5TestLedger started OK");

  test.onFinish(async () => {
    await cordaV5TestLedger.stop();
    await cordaV5TestLedger.destroy();
  });
  const sshConfig = await cordaV5TestLedger.getSshConfig();
  const connector: PluginLedgerConnectorCorda = new PluginLedgerConnectorCorda({
    instanceId: uuidv4(),
    sshConfigAdminShell: sshConfig,
    corDappsDir: "",
    logLevel,
    cordaVersion: CordaVersion.CORDA_V5,
    apiUrl: "127.0.0.1:8888/api/v1",
  });
  const apiUrl = "127.0.0.1:8888/api/v1";

  //const expressApp = express();
  //expressApp.use(bodyParser.json({ limit: "250mb" }));
  //const server = http.createServer(expressApp);
  //test.onFinish(async () => await Servers.shutdown(server));

  /*
  const idHash = "0A63C81EDC93";
  const param: StartFlowRequest = {
    parameters: {
      clientRequestId: "create-1",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.CreateNewChatFlow",
      requestBody: {
        chatName: "Chat with Bob",
        otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
        message: "Hello Bob",
      },
    },
  };*/

  await connector.getOrCreateWebServices();
  //await connector.registerWebServices(expressApp);
  /*const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 8888,
    server,
  };
 */
  const config = new Configuration({
    basePath: apiUrl,
    username: "admin",
    password: "admin",
  });
  const apiClient = new CordaApi(config);

  //const response = await connector.startFlow();
  //t.ok(cpi, "ok");
  const container = cordaV5TestLedger.getContainer();
  const cmd = ["./gradlew", "listVNodes"];
  const timeout = 180000; // 3 minutes
  const cwd = "/CSDE-cordapp-template-kotlin";
  const shortHashID = await Containers.exec(
    container,
    cmd,
    timeout,
    logLevel,
    cwd,
  );

  function extractShortHash(name: string) {
    const regex = new RegExp(`MyCorDapp\\s*([A-Z0-9]*)\\s*CN=${name}`);
    const match = shortHashID.match(regex);
    if (match) {
      return match[1];
    } else {
      return "err";
    }
  }
  const shortHashBob = extractShortHash("Bob");
  t.ok(shortHashBob, `Short hash ID for Bob: ${shortHashBob}`);

  const shortHashDave = extractShortHash("Dave");
  t.ok(shortHashDave, `Short hash ID for Dave: ${shortHashDave}`);

  const shortHashCharlie = extractShortHash("Charlie");
  t.ok(shortHashCharlie, `Short hash ID for Charlie: ${shortHashCharlie}`);

  const shortHashAlice = extractShortHash("Alice");
  t.ok(shortHashAlice, `Short hash ID for Alice: ${shortHashAlice}`);

  const request = {
    clientRequestId: "r1",
    flowClassName:
      "com.r3.developers.csdetemplate.flowexample.workflows.MyFirstFlow",
    requestBody: {
      chatName: "Charlie",
      otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
      message: "YourMessage",
    },
  };

  const startflow = await apiClient.startFlowParameters(
    shortHashCharlie,
    request,
  );
  t.ok(startflow.status, "ok!");
  // TO FIX: Address and port checking is still having an issue because of
  // "--network host" parameters set during container creation
  //const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  //const { address, port } = addressInfo;
  //const apiHost = `https://127.0.0.1:8888`;
  //const apiConfig = new Configuration({ basePath: apiHost });
  //const apiClient = new CordaApi(apiConfig);
  //const flowsRes1 = await apiClient.listFlowsV1();
  //t.ok(flowsRes1, "listFlowsV1() out truthy OK");

  //const apiService = new cordaV5TestLedger();

  //const idHash = "yourIdHash";
  //Testing using a created axios instance in plugin-ledger-connector-corda
  //TEST
  /*const request = {
    clientRequestId: "r1",
    flowClassName:
      "com.r3.developers.csdetemplate.flowexample.workflows.MyFirstFlow",
    requestBody: {
      otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
    },
  };*/

  /*
  requestBody: {
    chatName: "YourChatName",
    otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
    message: "YourMessage",
  */
  //const response = await connector.startFlow(shortHashCharlie, request);
  //t.ok(response.status, "ok!");
  //const response = await connector.startFlow(idHash, param);
  //t.ok(response.success, "New Flow Instance Initiated Successfully!");
  //await.connector.
  //await connector.registerWebServices(expressApp);
  t.end();
});
