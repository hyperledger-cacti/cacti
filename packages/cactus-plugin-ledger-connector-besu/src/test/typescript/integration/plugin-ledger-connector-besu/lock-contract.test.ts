import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  //Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
} from "../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import LockAssetContractJson from "../../../solidity/hello-world-contract/LockAsset.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";
const level = "INFO";
const label = "lock-contact test";
const log = LoggerProvider.getOrCreate({ level, label });
test("deploys contract via .json file", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
  const besuKeyPair = {
    privateKey: besuTestLedger.getGenesisAccountPrivKey(),
  };
  const contractName = "LockAsset";

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
    LockAssetContractJson.contractName,
    JSON.stringify(LockAssetContractJson),
  );
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  await connector.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance, "Retrieved balance of test account OK");
  t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");

  let contractAddress: string;

  test("deploys contract via .json file", async (t2: Test) => {
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
      contractAbi: LockAssetContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: LockAssetContractJson.bytecode,
      gas: 1000000,
    });
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    t2.ok(
      typeof contractAddress === "string",
      "contractAddress typeof string OK",
    );

    const { success: createRes } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset1", 5],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    t2.ok(createRes, "create Asset() output is truthy");
    t2.equals(createRes, true, "create Asset Ok");
    log.warn("create ok");
    const { success: lockRes } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset1"],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    log.warn("checking lock res");
    t2.ok(lockRes, "lock Asset() output is truthy");
    t2.equals(lockRes, true, "lock Asset Ok");
    const { success: unLockRes } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "unLockAsset",
      params: ["asset1"],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    t2.ok(unLockRes, "unlock Asset() output is truthy");
    t2.equals(unLockRes, true, "unlock Asset Ok");
    const { success: lockRes2 } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset1"],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    t2.ok(lockRes2, "lock Asset() again output is truthy");
    t2.equals(lockRes2, true, "lock Asset again Ok");
    log.warn("asset is locked again");
    const { success: deleteRes } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "deleteAsset",
      params: ["asset1"],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    console.log(deleteRes);
    t2.ok(deleteRes, "delete Asset() output is truthy");
    t2.equals(deleteRes, true, "delete Asset Ok");
  });
  t.end();
});
