import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorChia,
  PluginFactoryLedgerConnector,
  ReceiptType,
  Web3SigningCredentialType,
} from "../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { ChiaTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { GetTransactionV1Request } from "../../../../main/typescript/generated/openapi/typescript-axios/api";

test("can get past logs of an account", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const containerImageVersion = "2021-08-24--feat-1244";
  const containerImageName =
    "ghcr.io/hyperledger/cactus-chia-21-1-6-all-in-one";
  const chiaOptions = { containerImageName, containerImageVersion };
  const chiaTestLedger = new ChiaTestLedger(chiaOptions);
  await chiaTestLedger.start();

  test.onFinish(async () => {
    await chiaTestLedger.stop();
    await chiaTestLedger.destroy();
  });

  const rpcApiHttpHost = await chiaTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await chiaTestLedger.getRpcApiWsHost();

  /**
   * Constant defining the standard 'dev' Chia genesis.json contents.
   *
   * @see https://github.com/hyperledger/chia/blob/21.1.6/config/src/main/resources/dev.json
   */

  const firstHighNetWorthAccount = chiaTestLedger.getGenesisAccountPubKey();

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

  const connector: PluginLedgerConnectorChia = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  const privateKey = await chiaTestLedger.getGenesisAccountPrivKey();
  const { transactionReceipt } = await connector.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.LedgerBlockAck,
      timeoutMs: 60000,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  const req: GetTransactionV1Request = {
    transactionHash: transactionReceipt.transactionHash,
  };
  const response = await connector.getTransaction(req);
  t.comment(JSON.stringify(response.transaction));
  t.ok(response.transaction, "getTransaction response is OK :-)");
  t.equal(
    typeof response.transaction,
    "object",
    "getTransaction response type is OK :-)",
  );
  t.end();
});
