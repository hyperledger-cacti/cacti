import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import {
  PluginLedgerConnectorCorda,
  CordaVersion,
} from "../../../main/typescript/public-api";
import { CordaV5TestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";
/*import {
  FlowInvocationType,
  RpcStartFlowRequest,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";*/
import express from "express";
import bodyParser from "body-parser";
import http from "http";

test("can get past logs of an account", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const cordaV5TestLedger = new CordaV5TestLedger();
  await cordaV5TestLedger.start();

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
  });

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  test.onFinish(async () => await Servers.shutdown(server));

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);
  t.end();
});
