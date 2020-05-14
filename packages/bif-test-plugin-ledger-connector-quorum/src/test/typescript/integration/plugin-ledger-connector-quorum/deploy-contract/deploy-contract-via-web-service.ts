// tslint:disable-next-line: no-var-requires
const tap = require('tap');
import { QuorumTestLedger, IQuorumGenesisOptions, IAccount } from '@hyperledger-labs/bif-test-tooling';
import HelloWorldContractJson from '../../../../solidity/hello-world-contract/HelloWorld.json';
import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';
import { Web3EthContract, IQuorumDeployContractOptions, PluginLedgerConnectorQuorum, PluginFactoryLedgerConnector } from '@hyperledger-labs/bif-plugin-ledger-connector-quorum';
import { ApiServer, ConfigService, IBifApiServerOptions } from '@hyperledger-labs/bif-cmd-api-server';
import { ICactusPlugin } from '@hyperledger-labs/bif-core-api';
import { PluginKVStorageMemory } from '@hyperledger-labs/bif-plugin-kv-storage-memory';
import { DefaultApi, Configuration } from '@hyperledger-labs/bif-sdk';

const log: Logger = LoggerProvider.getOrCreate({ label: 'test-deploy-contract-via-web-service', level: 'trace' })

tap.test('pulls up API server and deploys contract via REST API', async (assert: any) => {

  const configService = new ConfigService();
  const bifApiServerOptions: IBifApiServerOptions = configService.newExampleConfig();
  bifApiServerOptions.configFile = '';
  bifApiServerOptions.apiCorsDomainCsv = '*';
  bifApiServerOptions.apiPort = 0;
  const config = configService.newExampleConfigConvict(bifApiServerOptions);
  const plugins: ICactusPlugin[] = [];
  const kvStoragePlugin = new PluginKVStorageMemory({ backend: new Map() });
  plugins.push(kvStoragePlugin)
  const apiServer = new ApiServer({ config, plugins });
  const out = await apiServer.start();
  log.debug(`ApiServer.started OK:`, out);

  const quorumTestLedger = new QuorumTestLedger({ containerImageVersion: '1.0.0' });
  await quorumTestLedger.start();

  assert.tearDown(async () => {
    log.debug(`Starting teardown...`);
    await quorumTestLedger.stop();
    log.debug(`Stopped container OK.`);
    await quorumTestLedger.destroy();
    log.debug(`Destroyed container OK.`);
    await apiServer.shutdown();
    log.debug(`ApiServer shut down OK.`);
  });

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

  const options: IQuorumDeployContractOptions = {
    ethAccountUnlockPassword: '',
    fromAddress: firstHighNetWorthAccount,
    contractJsonArtifact: HelloWorldContractJson,
  };

  const contract: Web3EthContract = await connector.deployContract(options);
  assert.ok(contract);

  const contractMethod = contract.methods.sayHello();
  assert.ok(contractMethod);

  const callResponse = await contractMethod.call({ from: firstHighNetWorthAccount });
  log.debug(`Got message from smart contract method:`, { callResponse });
  assert.ok(callResponse);

  const httpServer = apiServer.getHttpServerApi();
  // AddressInfo={ address: string, family: string, port: number };
  const addressInfo: any  = httpServer?.address();
  log.debug(`AddressInfo: `, addressInfo);
  const BIF_API_HOST = `http://${addressInfo.address}:${addressInfo.port}`;
  const configuration = new Configuration({ basePath: BIF_API_HOST, });
  const api = new DefaultApi(configuration);
  const response = await api.apiV1ConsortiumPost({
    configurationEndpoint: 'domain-and-an-http-endpoint',
    id: 'asdf',
    name: 'asdf',
    bifNodes: [
      {
        host: 'BIF-NODE-HOST-1', publicKey: 'FAKE-PUBLIC-KEY'
      }
    ]
  });
  assert.ok(response);
  assert.ok(response.status > 199 && response.status < 300);

  assert.end();
  log.debug('Assertion ended OK.');
});
