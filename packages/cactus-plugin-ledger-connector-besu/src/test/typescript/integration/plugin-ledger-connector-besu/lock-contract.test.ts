import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { Account } from "web3-core";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginImportType } from "@hyperledger/cactus-core-api";

import LockAssetContractJson from "../../../solidity/hello-world-contract/LockAsset.json";

import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  ReceiptType,
} from "../../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "INFO";

describe("PluginLedgerConnectorBesu", () => {
  const besuTestLedger = new BesuTestLedger();
  let besuKeyPair: { privateKey: string };
  let firstHighNetWorthAccount: string;
  let keychainPlugin: PluginKeychainMemory;
  let testEthAccount: Account;
  let connector: PluginLedgerConnectorBesu;

  beforeAll(async () => {
    await besuTestLedger.start();

    /**
     * Constant defining the standard 'dev' Besu genesis.json contents.
     *
     * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
     */
    firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
    besuKeyPair = {
      privateKey: besuTestLedger.getGenesisAccountPrivKey(),
    };
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  afterAll(async () => {
    await connector.shutdown();
  });

  it("creates test account from scratch with seed money", async () => {
    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    const web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidv4());

    const keychainEntryKey = uuidv4();
    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
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
    connector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId: uuidv4(),
      logLevel,
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
    expect(balance).toBeTruthy();

    expect(parseInt(balance, 10)).toEqual(10e9);
  });

  it("deploys contract via .json file, verifies lock/unlock ops", async () => {
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
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    const contractAddress = deployOut.transactionReceipt.contractAddress;
    expect(contractAddress).toBeString();
    expect(contractAddress).not.toBeEmpty();

    const { success: createRes } = await connector.invokeContract({
      contractName: LockAssetContractJson.contractName,
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
    expect(createRes).toBeTruthy();
    expect(createRes).toBeTrue();

    const { success: lockRes } = await connector.invokeContract({
      contractName: LockAssetContractJson.contractName,
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

    expect(lockRes).toBeTruthy();
    expect(lockRes).toEqual(true);

    const { success: unLockRes } = await connector.invokeContract({
      contractName: LockAssetContractJson.contractName,
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

    expect(unLockRes).toBeTruthy();
    expect(unLockRes).toBeTrue();

    const { success: lockRes2 } = await connector.invokeContract({
      contractName: LockAssetContractJson.contractName,
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

    expect(lockRes2).toBeTruthy();
    expect(lockRes2).toBeTrue();

    const { success: deleteRes } = await connector.invokeContract({
      contractName: LockAssetContractJson.contractName,
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

    expect(deleteRes).toBeTruthy();
    expect(deleteRes).toBeTrue();
  });
});
