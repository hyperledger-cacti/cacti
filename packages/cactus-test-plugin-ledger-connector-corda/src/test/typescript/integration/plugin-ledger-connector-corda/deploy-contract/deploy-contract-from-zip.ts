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
  label: "test-deploy-contract-from-json",
  level: "trace",
});

tap.test("deploys contract via .zip file", async (assert: any) => {
  const cordaTestLedger = new CordaTestLedger({
    containerImageVersion: "latest",
  });
  await cordaTestLedger.start();
  await new Promise((r) => setTimeout(r, 20000));

  const sshPort = await cordaTestLedger.getSSHPublicPort();
  const partyASSH = await cordaTestLedger.getPartyASSHPublicPort();
  const rpcApiHttpHost = await cordaTestLedger.getRpcAPublicPort();

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorCorda = await factory.create({
    rpcApiHttpHost,
  });

  const options: ICordaDeployContractOptions = {
    host: "localhost",
    username: "root",
    port: sshPort,
    privateKey:
      "/Users/jacob.weate/Projects/jweate-bif/blockchain-integration-framework/tools/all-in-one/corda/corda_image",
    contractZip:
      "/Users/jacob.weate/Projects/jweate-bif/blockchain-integration-framework/packages/cactus-test-plugin-ledger-connector-corda/src/test/kotlin/upload.zip",
  };

  // connector.deployContract(options).then(() => {
  //   log.info("COMPLETED");
  //   assert.end();
  // });
  const ssh = new NodeSSH();
  log.info("Port: %d | Key: %s", options.port, options.privateKey);
  ssh
    .connect({
      host: "localhost",
      username: "root",
      port: options.port,
      privateKey: options.privateKey,
    })
    .then(function () {
      // Local, Remote
      ssh.putFile(options.contractZip, "/root/smart-contracts/upload.zip").then(
        function () {
          console.log("Smart Contracts uploaded to server");
          ssh
            .execCommand("/bin/ash deploy_contract.sh", {
              cwd: "/opt/corda/builder",
            })
            .then(function (result) {
              console.log("STDERR: " + result.stderr);
            });
        },
        function (error) {
          console.log("Error: Failed to upload smart contract to server");
          console.log(error);
        }
      );
    });

  // assert.tearDown(async () => {
  //   log.debug(`Starting teardown...`);
  //   await cordaTestLedger.stop();
  //   log.debug(`Stopped container OK.`);
  //   await cordaTestLedger.destroy();
  //   log.debug(`Destroyed container OK.`);
});
