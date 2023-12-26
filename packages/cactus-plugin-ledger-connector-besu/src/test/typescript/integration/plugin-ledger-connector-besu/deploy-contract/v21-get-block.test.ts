import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  GetBlockV1Request,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { Account } from "web3-core";

describe("PluginLedgerConnectorBesu", () => {
  const logLevel: LogLevelDesc = "TRACE";
  const containerImageVersion = "2021-08-24--feat-1244";
  const containerImageName =
    "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
  const besuOptions = { containerImageName, containerImageVersion };
  const besuTestLedger = new BesuTestLedger(besuOptions);
  const keychainEntryKey = uuidv4();

  let rpcApiHttpHost: string;
  let rpcApiWsHost: string;
  let web3: Web3;
  let testEthAccount: Account;
  let keychainEntryValue;
  let connector: PluginLedgerConnectorBesu;

  beforeAll(async () => {
    await besuTestLedger.start();
    rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidv4());
    keychainEntryValue = testEthAccount.privateKey;

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    connector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  it("can query the ledger for specific blocks", async () => {
    const request: GetBlockV1Request = { blockHashOrBlockNumber: 0 };
    const response = await connector.getBlock(request);
    expect(response).toBeTruthy();
    expect(response).toBeObject();
    expect(response.block).toBeObject();
    expect(response.block.number).not.toBeNull();
    expect(response.block.number).toBeNumber();
    expect(response.block.number).toBeFinite();
    expect(response.block.nonce).toBeTruthy();
    expect(response.block.nonce).toBeString();
    expect(response.block.nonce).not.toBeEmpty();
    expect(response.block.transactionsRoot).toBeString();
    expect(response.block.transactionsRoot).not.toBeEmpty();
  });
});
