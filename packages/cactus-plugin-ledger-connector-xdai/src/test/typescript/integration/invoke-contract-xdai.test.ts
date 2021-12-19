import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import { Account } from "web3-core";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
} from "../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
  K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
  OpenEthereumTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "TRACE";
let xdaiTestLedger: OpenEthereumTestLedger;
const testCase = "Xdai Ledger Connector Plugin";
describe(testCase, () => {
  let contractAddress: string;
  const contractName = "HelloWorld";
  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;
  let keychainPlugin: PluginKeychainMemory;
  let connector: PluginLedgerConnectorXdai;
  let web3: Web3;
  let testEthAccount: Account;
  let keychainEntryKey: string;
  let keychainEntryValue: string, rpcApiHttpHost: string;

  beforeAll(async () => {
    xdaiTestLedger = new OpenEthereumTestLedger({});
  });

  afterAll(async () => {
    await xdaiTestLedger.stop();
    await xdaiTestLedger.destroy();
  });
  beforeAll(async () => {
    await xdaiTestLedger.start();
    rpcApiHttpHost = await xdaiTestLedger.getRpcApiHttpHost();
    expect(rpcApiHttpHost).toBeString();

    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidv4());

    keychainEntryKey = uuidv4();
    keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
  });

  it("setup", async () => {
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    connector = await factory.create({
      logLevel,
      rpcApiHttpHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    await connector.transact({
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: whalePubKey,
        to: testEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toEqual(10e9);
  });

  it("deploys contract via .json file", async () => {
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: HelloWorldContractJson.contractName,
      // contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      // bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(contractAddress).toBeString();

    const { callOutput: helloMsg } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(helloMsg).toBeTruthy();
    expect(helloMsg).toBeString();
  });

  it("invoke Web3SigningCredentialType.NONE", async () => {
    const testEthAccount2 = web3.eth.accounts.create(uuidv4());

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
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    expect(balance2).toBeTruthy();
    expect(parseInt(balance2, 10)).toEqual(10e6);
  });

  it("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
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
      await connector.invokeContract({
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
      fail("invalid nonce should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("Transaction nonce is too low.");
    }
    const { callOutput: getNameOut } = await connector.invokeContract({
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

    const getNameOut2 = await connector.invokeContract({
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

    const response = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      value: 10,
    });
    expect(response).toBeTruthy();

    const { callOutput } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [0],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(callOutput).toEqual(newName);
  });

  it("invoke Web3SigningCredentialType.CACTUSKEYCHAINREF", async () => {
    const newName = `DrCactus${uuidv4()}`;
    const web3SigningCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      web3SigningCredential,
      nonce: 4,
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        web3SigningCredential,
        nonce: 4,
      });
      fail("invalid nonce should have thrown");
    } catch (error: any) {
      expect(error.message).toContain(
        "Transaction with the same hash was already imported",
      );
    }
    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut).toEqual(newName);

    const getNameOut2 = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut2).toBeTruthy();

    const response = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      web3SigningCredential,
      value: 10,
    });
    expect(response).toBeTruthy();

    const { callOutput: callOut } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [1],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(callOut).toEqual(newName);
  });
});
