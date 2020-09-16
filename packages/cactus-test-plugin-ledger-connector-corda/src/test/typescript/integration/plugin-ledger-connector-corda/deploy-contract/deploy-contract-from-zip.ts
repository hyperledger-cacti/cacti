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
  log.info(__filename);
  const cordaTestLedger = new CordaTestLedger({
    containerImageVersion: "latest",
  });
  await cordaTestLedger.start();

  const sshPort = await cordaTestLedger.getSSHPublicPort();
  const partyASSH = await cordaTestLedger.getPartyASSHPublicPort();
  const rpcApiHttpHost = await cordaTestLedger.getRpcAPublicPort();

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorCorda = await factory.create({
    host: "localhost",
    port: partyASSH,
    username: "user1",
    password: "test",
  });
  const fileBuffer = fs.readFileSync(
    path.join(__dirname, "../../../../kotlin/upload.zip")
  );
  const key = path.join(
    __dirname,
    "../../../../../../../../tools/all-in-one/corda/corda_image"
  );
  const options: ICordaDeployContractOptions = {
    host: "localhost",
    username: "root",
    port: sshPort,
    privateKey: key,
    contractZip: fileBuffer,
  };
  log.info("PARTYA: <" + partyASSH + ">");
  await new Promise((r) => setTimeout(r, 10000));
  await connector.deployContract(options);
  log.info("Deployment Completed");
  await new Promise((r) => setTimeout(r, 200000));
  const flows = await connector.getFlowList(partyASSH);
  await new Promise((r) => setTimeout(r, 500));
  log.info("FLOWS: " + flows);

  cordaTestLedger.stop();
  // log.info("FLOW LIST IS: " + flows)
  // const flow = "CashIssueFlow"
  // class CordaState {
  //   public amount: string = "";
  //   public issuerBankPartyRef: string = "";

  //   constructor(amount: string, issuerBankPartyRef: string){
  //     this.amount = amount
  //     this.issuerBankPartyRef = issuerBankPartyRef
  //   }
  // }

  // assert.tearDown(async () => {
  //   log.debug(`Starting teardown...`);
  //   await cordaTestLedger.stop();
  //   log.debug(`Stopped container OK.`);
  //   await cordaTestLedger.destroy();
  //   log.debug(`Destroyed container OK.`);
});
