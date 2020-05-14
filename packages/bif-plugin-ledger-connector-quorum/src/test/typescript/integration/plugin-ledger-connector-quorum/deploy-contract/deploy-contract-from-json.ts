// tslint:disable-next-line: no-var-requires
const tap = require('tap');
import { PluginLedgerConnectorQuorum, PluginFactoryLedgerConnector } from '../../../../../main/typescript/public-api';
import { QuorumTestLedger } from '@hyperledger-labs/bif-test-tooling';
import HelloWorldContractJson from '../../../../solidity/hello-world-contract/HelloWorld.json';

tap.test('deploys contract via .json file', async (assert: any) => {
  assert.plan(1);

  const quorumTestLedger = new QuorumTestLedger();
  await quorumTestLedger.start();

  assert.tearDown(async () => {
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();
  });

  const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorQuorum = await factory.create({ rpcApiHttpHost });

  const options = {
    contractJsonArtifact: HelloWorldContractJson,
  };

  const out = await connector.deployContract(options);
  assert.ok(out);

  assert.end();
});
