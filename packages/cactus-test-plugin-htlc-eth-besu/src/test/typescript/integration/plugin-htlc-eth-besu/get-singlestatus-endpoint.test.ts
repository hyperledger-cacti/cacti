import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { AddressInfo } from "net";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import Web3 from "web3";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  Configuration,
  DefaultApi,
  IPluginHtlcEthBesuOptions,
  PluginHtlcEthBesu,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

test("Test get single status endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  //const rpcApiHttpHost = "http://127.0.0.1:32868";
  t.comment("RPC: " + rpcApiHttpHost);

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKey = uuidv4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });

  const addressInfo = httpServer.address() as AddressInfo;
  t.comment(`HttpServer AddressInfo: ${JSON.stringify(addressInfo)}`);
  const node1Host = `http://${addressInfo.address}:${addressInfo.port}`;
  t.comment(`Cactus Node Host: ${node1Host}`);

  const pluginRegistry = new PluginRegistry({});
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();

  const pluginOptions: IPluginHtlcEthBesuOptions = {
    logLevel,
    instanceId: uuidv4(),
    connector,
  };

  const pluginHtlc = new PluginHtlcEthBesu(pluginOptions);
  pluginRegistry.add(pluginHtlc);
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);
  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });

  await apiServer.start();
  t.comment("Start server");
  t.comment(`AddressInfo: ${JSON.stringify(addressInfo)}`);

  test.onFinish(() => apiServer.shutdown());
  const configuration = new Configuration({
    basePath: node1Host,
  });
  t.comment("Setting configuration");

  const api = new DefaultApi(configuration);
  t.comment("Api generated");

  //Deploy contract
  const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";
  const besuKeyPair = {
    privateKey:
      "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
  };

  const response = await pluginHtlc.initialize(
    firstHighNetWorthAccount,
    besuKeyPair.privateKey,
    Web3SigningCredentialType.PRIVATEKEYHEX,
  );
  t.comment(`RESPONSE: ${JSON.stringify(response)}`);
  t.ok(response, "pluginHtlc.initialize() output is truthy OK");
  /*
  const deployOut = await connector.deployContract({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    },
    bytecode: HashTimeLock.bytecode,
    gas: 10000000,
  });*/
  t.comment("end deploy");
  t.comment(response.transactionReceipt.contractAddress!);

  // Test for 200 valid response test case
  const res = await api.getSingleStatus(
    "0xf2ec7b418ecd834b641159042c133c645142ad99bd91fd12cbe809cf17e6e749",
  );
  t.comment("Getting result");
  t.equal(res.status, 200);

  //test for 500 not found test case
  try {
    await api.getSingleStatus(
      "fake5ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
    );
  } catch (error) {
    t.equal(error.response.status, 500, "HTTP response status are equal");
  }
});
