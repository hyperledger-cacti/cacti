// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import {
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
} from "../../../../../main/typescript/public-api";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

tap.test("deploys contract via .json file", async (assert: any) => {
  assert.plan(1);

  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  assert.tearDown(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();

  const orionKeyPair = await besuTestLedger.getOrionKeyPair();
  const besuKeyPair = await besuTestLedger.getBesuKeyPair();

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
  });

  const options = {
    publicKey: orionKeyPair.publicKey,
    privateKey: besuKeyPair.privateKey,
    contractJsonArtifact: HelloWorldContractJson,
  };

  const out = await connector.deployContract(options);
  assert.ok(out);

  assert.end();
});
