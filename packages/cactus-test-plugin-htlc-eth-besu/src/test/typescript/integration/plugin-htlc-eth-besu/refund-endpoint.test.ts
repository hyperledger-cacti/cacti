import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { AddressInfo } from "net";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import Web3 from "web3";
import {
  Configuration,
  DefaultApi,
  IPluginHtlcEthBesuOptions,
  PluginHtlcEthBesu,
  NewContractObj,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  EthContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import DemoHelpers from "../../../solidity/hash-time-lock-contract/DemoHelpers.json";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

test("Test refund endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });
  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
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

  const deployOut = await pluginHtlc.initialize(
    firstHighNetWorthAccount,
    besuKeyPair.privateKey,
    Web3SigningCredentialType.PRIVATEKEYHEX,
  );
  t.comment(deployOut.transactionReceipt.contractAddress!);
  t.ok(deployOut, "deployContract is truthy OK");

  //deploy DemoHelpers
  const deployDemoHelper = await connector.deployContract({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    },
    bytecode: DemoHelpers.bytecode,
    gas: 6721975,
  });
  t.comment(deployDemoHelper.transactionReceipt.contractAddress!);
  t.ok(deployDemoHelper, "deployContract DemoHelpers is OK");

  let timestamp: number;
  const { callOutput } = await connector.invokeContract({
    contractAbi: DemoHelpers.abi,
    contractAddress: deployDemoHelper.transactionReceipt
      .contractAddress as string,
    invocationType: EthContractInvocationType.CALL,
    methodName: "getTimestamp",
    params: [],
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
      secret: besuKeyPair.privateKey,
    },
    gas: 6721975,
  });
  t.ok(callOutput, "getTimestamp is truthy OK");
  timestamp = callOutput as number;
  timestamp = +timestamp + +10;

  //newContract
  const bodyObj: NewContractObj = {
    outputAmount: 0x04,
    expiration: timestamp,
    hashLock:
      "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
    receiver: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
    outputNetwork: "BTC",
    outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
  };
  const resp = await api.newContract(bodyObj);
  t.ok(resp, "new contract");

  test("Refund HTLC", async (t2: Test) => {
    const { callOutput } = await connector.invokeContract({
      contractAbi: DemoHelpers.abi,
      contractAddress: deployDemoHelper.transactionReceipt
        .contractAddress as string,
      invocationType: EthContractInvocationType.CALL,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
        100,
        "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
        timestamp,
      ],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
        secret: besuKeyPair.privateKey,
      },
      gas: 6721975,
    });
    t2.ok(callOutput, "result invoke is truthy OK");
    const id = callOutput as string;
    t2.comment(id);

    // Test for 200 valid response test case
    await timeout(20000);
    const res = await api.refund(id);
    t2.comment("Getting result");
    t2.equal(res.status, 200);
  });
});
