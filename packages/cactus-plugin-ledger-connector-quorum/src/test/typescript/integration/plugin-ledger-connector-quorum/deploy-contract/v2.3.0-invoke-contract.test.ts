import Web3 from "web3";
import "jest-extended";
import { Account } from "web3-core";
import { v4 as uuidV4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

import {
  EthContractInvocationType,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
} from "../../../../../main/typescript/public-api";

import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";

const logLevel: LogLevelDesc = "INFO";
const contractName = "HelloWorld";
const testcase = "";

describe(testcase, () => {
  const containerImageVersion = "2021-01-08-7a055c3"; // Quorum v2.3.0, Tessera v0.10.0

  const ledgerOptions = { containerImageVersion };
  const ledger = new QuorumTestLedger(ledgerOptions);
  const keychainEntryKey = uuidV4();

  let contractAddress: string,
    connector: PluginLedgerConnectorQuorum,
    rpcApiHttpHost: string,
    web3: Web3,
    keychainPlugin: PluginKeychainMemory,
    testEthAccount: Account,
    quorumGenesisOptions: IQuorumGenesisOptions,
    highNetWorthAccounts: string[],
    firstHighNetWorthAccount: string;

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });

  beforeAll(async () => {
    await ledger.start();
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidV4());

    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    quorumGenesisOptions = await ledger.getGenesisJsObject();
    highNetWorthAccounts = Object.keys(quorumGenesisOptions.alloc).filter(
      (address: string) => {
        const anAccount: IAccount = quorumGenesisOptions.alloc[address];
        const theBalance = parseInt(anAccount.balance, 10);
        return theBalance > 10e7;
      },
    );
    [firstHighNetWorthAccount] = highNetWorthAccounts;

    connector = new PluginLedgerConnectorQuorum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  test("Quorum Ledger Connector Plugin", async () => {
    expect(quorumGenesisOptions).toBeTruthy();
    expect(quorumGenesisOptions.alloc).toBeTruthy();

    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests

    await connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccount.address,
        value: 10e9,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toEqual(10e9);
  });

  test("deploys contract via .json file", async () => {
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: HelloWorldContractJson.contractName,
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(typeof contractAddress).toBeString();

    const { callOutput: helloMsg } = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(helloMsg).toBeTruthy();
    expect(typeof helloMsg).toBeString();
  });

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      nonce: 2,
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
      });
      fail("PluginLedgerConnectorQuorum.invokeContract failed to throw error");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
    }

    const getNameOut = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(getNameOut.success).toBeTruthy();

    const { callOutput: getNameOut2 } = await connector.getContractInfoKeychain(
      {
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        params: [],
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      },
    );
    expect(getNameOut2).toEqual(newName);
  });

  test("invoke Web3SigningCredentialType.NONE", async () => {
    const testEthAccount2 = web3.eth.accounts.create(uuidV4());

    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: testEthAccount.address,
        to: testEthAccount2.address,
        value: 10e6,
        gas: 1000000,
      },
      testEthAccount.privateKey,
    );

    await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    expect(balance2).toBeTruthy();
    expect(parseInt(balance2, 10)).toEqual(10e6);
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: 1,
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: 1,
      });
      fail("PluginLedgerConnectorQuorum.invokeContract failed to throw error");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
    }
    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut).toEqual(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut2).toBeTruthy();
  });

  test("invoke Web3SigningCredentialType.CactusKeychainRef", async () => {
    const newName = `DrCactus${uuidV4()}`;

    const web3SigningCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      web3SigningCredential,
      nonce: 3,
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 3,
      });
      fail("PluginLedgerConnectorQuorum.invokeContract failed to throw error");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
    }
    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut).toEqual(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut2).toBeTruthy();
  });
});
