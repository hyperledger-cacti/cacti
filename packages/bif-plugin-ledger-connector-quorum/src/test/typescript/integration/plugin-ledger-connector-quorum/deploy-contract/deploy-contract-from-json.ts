// tslint:disable-next-line: no-var-requires
const tap = require('tap');
import { PluginLedgerConnectorQuorum, PluginFactoryLedgerConnector } from '../../../../../main/typescript/public-api';
import { QuorumTestLedger, IQuorumGenesisOptions, IAccount } from '@hyperledger-labs/bif-test-tooling';
import HelloWorldContractJson from '../../../../solidity/hello-world-contract/HelloWorld.json';
import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';

const log: Logger = LoggerProvider.getOrCreate({ label: 'test-deploy-contract-from-json', level: 'trace' })

tap.test('deploys contract via .json file', async (assert: any) => {

  const quorumTestLedger = new QuorumTestLedger({ containerImageVersion: '1.0.0' });
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

  const highNetWorthAccounts: string[] = Object.keys(quorumGenesisOptions.alloc).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const balance: number = parseInt(anAccount.balance, 10);
    return balance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorQuorum = await factory.create({ rpcApiHttpHost });

  const options = {
    from: firstHighNetWorthAccount, // 0xed9d02e382b34818e88b88a309c7fe71e65f419d from the gensis json alloc property
    contractJsonArtifact: HelloWorldContractJson,
    // gas: 100000000000,
    // gasPrice: 0,
  };

  const out = await connector.deployContract(options);
  assert.ok(out);

  assert.end();
  log.debug('Assertion ended OK.');
});
