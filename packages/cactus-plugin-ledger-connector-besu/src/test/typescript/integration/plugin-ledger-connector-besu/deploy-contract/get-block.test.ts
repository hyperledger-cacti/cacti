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
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";

describe("PluginLedgerConnectorBesu", () => {
  const logLevel: LogLevelDesc = "INFO";
  const log = LoggerProvider.getOrCreate({
    label: "besu-get-block-test.ts",
    level: logLevel,
  });
  const besuTestLedger = new BesuTestLedger();
  let connector: PluginLedgerConnectorBesu;

  beforeAll(async () => {
    const omitContainerImagePull = false;
    await besuTestLedger.start(omitContainerImagePull);

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    const web3 = new Web3(rpcApiHttpHost);
    const testEthAccount = web3.eth.accounts.create(uuidv4());

    const keychainEntryKey = uuidv4();
    const keychainEntryValue = testEthAccount.privateKey;
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
    await connector.onPluginInit();
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  it("can get block from blockchain", async () => {
    const request: GetBlockV1Request = { blockHashOrBlockNumber: 0 };
    const currentBlock = await connector.getBlock(request);
    log.debug("Current Block=%o", currentBlock);
    //makes the information in to string
    expect(currentBlock).toBeTruthy();
    expect(currentBlock).toBeObject();
    expect(currentBlock).not.toBeEmptyObject();
  });
});
