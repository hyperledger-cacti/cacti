// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import {
  PluginLedgerConnectorCorda,
  PluginFactoryLedgerConnector,
} from "../../../../../main/typescript/public-api";
import { CordaTestLedger } from "@hyperledger/cactus-test-tooling";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ICordaDeployContractOptions } from "../../../../../main/typescript/plugin-ledger-connector-corda";
import * as fs from "fs";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-deploy-contract-from-json",
  level: "trace",
});

tap.test("deploys contract via .zip file", async (assert: any) => {
  const cordaTestLedger = new CordaTestLedger({
    containerImageVersion: "latest",
  });
  await cordaTestLedger.start();

  assert.tearDown(async () => {
    log.debug(`Starting teardown...`);
    await cordaTestLedger.stop();
    log.debug(`Stopped container OK.`);
    await cordaTestLedger.destroy();
    log.debug(`Destroyed container OK.`);
  });

  // const rpcApiHttpHost: string = 'http://localhost:22000';
  const rpcApiHttpHost = await cordaTestLedger.getRpcApiHttpHost();
  // const cordaGenesisOptions: ICordaGenesisOptions = await cordaTestLedger.getGenesisJsObject();
  // assert.ok(cordaGenesisOptions);
  // assert.ok(cordaGenesisOptions.alloc);

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorCorda = await factory.create({
    rpcApiHttpHost,
  });

  const options: ICordaDeployContractOptions = {
    host: "localhost",
    username: "root",
    port: 2200,
    privateKey: "string",
    contractZip: "./contract.zip",
  };

  connector.deployContract(options);
  // assert.ok(contract);

  // const contractMethod = contract.methods.sayHello();
  // assert.ok(contractMethod);

  // const callResponse = await contractMethod.call({
  //   from: firstHighNetWorthAccount,
  // });
  // log.debug(`Got message from smart contract method:`, { callResponse });
  // assert.ok(callResponse);

  assert.end();
  log.debug("Assertion ended OK.");
});
