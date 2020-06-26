// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { Contract, SendOptions } from "web3-eth-contract/types/index";
import {
  PluginLedgerConnectorQuorum,
  PluginFactoryLedgerConnector,
} from "../../../../../main/typescript/public-api";
import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
} from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { IQuorumDeployContractOptions } from "../../../../../main/typescript/plugin-ledger-connector-quorum";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-deploy-contract-from-json",
  level: "trace",
});

tap.test("deploys contract via .json file", async (assert: any) => {
  const quorumTestLedger = new QuorumTestLedger();
  await quorumTestLedger.start();

  assert.tearDown(async () => {
    log.debug(`Starting teardown...`);
    await quorumTestLedger.stop();
    log.debug(`Stopped container OK.`);
    await quorumTestLedger.destroy();
    log.debug(`Destroyed container OK.`);
  });

  // const rpcApiHttpHost: string = 'http://localhost:22000';
  const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();
  const quorumGenesisOptions: IQuorumGenesisOptions = await quorumTestLedger.getGenesisJsObject();
  assert.ok(quorumGenesisOptions);
  assert.ok(quorumGenesisOptions.alloc);

  const highNetWorthAccounts: string[] = Object.keys(
    quorumGenesisOptions.alloc
  ).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const balance: number = parseInt(anAccount.balance, 10);
    return balance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorQuorum = await factory.create({
    rpcApiHttpHost,
  });

  const options: IQuorumDeployContractOptions = {
    ethAccountUnlockPassword: "",
    fromAddress: firstHighNetWorthAccount,
    contractJsonArtifact: HelloWorldContractJson,
  };

  const contract: Contract = await connector.deployContract(options);
  assert.ok(contract);

  const contractMethod = contract.methods.sayHello();
  assert.ok(contractMethod);

  const callResponse = await contractMethod.call({
    from: firstHighNetWorthAccount,
  });
  log.debug(`Got message from smart contract method:`, { callResponse });
  assert.ok(callResponse);

  assert.end();
  log.debug("Assertion ended OK.");
});
