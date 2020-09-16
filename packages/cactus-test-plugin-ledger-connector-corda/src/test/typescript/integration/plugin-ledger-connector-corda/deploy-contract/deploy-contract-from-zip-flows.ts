// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import {
  PluginLedgerConnectorCorda,
  PluginFactoryLedgerConnector,
  ICordaDeployContractOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-corda";
import { CordaTestLedger } from "@hyperledger/cactus-test-tooling";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import * as fs from "fs";
import * as path from "path";
import { NodeSSH } from "node-ssh";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-deploy-contract-from-zip-flows",
  level: "trace",
});

tap.test("List Flows on node", async (assert: any) => {
  log.info(__filename);
  const ssh = new NodeSSH();
  ssh
    .connect({
      host: "localhost",
      username: "user1",
      port: 32920,
      password: "test",
    })
    .then(() => {
      ssh.execCommand("flow list").then((result) => {
        log.info("STDOUT: " + result.stdout);
      });
    });
});
