import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  PluginFactoryLedgerConnector,
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

test("deploys contract via .json file", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const xdaiTestLedger = new OpenEthereumTestLedger({});
  await xdaiTestLedger.start();

  test.onFinish(async () => {
    await xdaiTestLedger.stop();
    await xdaiTestLedger.destroy();
  });

  const rpcApiHttpHost = await xdaiTestLedger.getRpcApiHttpHost();

  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;

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
  const connector: PluginLedgerConnectorXdai = await factory.create({
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
  t.ok(balance, "Retrieved balance of test account OK");
  t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");

  let contractAddress: string;

  test("deploys contract via .json file", async (t2: Test) => {
    const deployOut = await connector.deployContractJsonObject({
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
      contractJSON: HelloWorldContractJson,
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

    const { callOutput: helloMsg } = await connector.invokeContractJsonObject({
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractJSON: HelloWorldContractJson,
    });
    t2.ok(helloMsg, "sayHello() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "sayHello() output is type of string",
    );
  });

  test("invoke Web3SigningCredentialType.NONE", async (t2: Test) => {
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
    t2.ok(balance2, "Retrieved balance of test account 2 OK");
    t2.equals(parseInt(balance2, 10), 10e6, "Balance of test account2 is OK");
    t2.end();
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContractJsonObject({
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: 1,
      contractJSON: HelloWorldContractJson,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    try {
      const setNameOutInvalid = await connector.invokeContractJsonObject({
        contractAddress,
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
        contractJSON: HelloWorldContractJson,
      });
      t2.ifError(setNameOutInvalid.transactionReceipt);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }
    const { callOutput: getNameOut } = await connector.invokeContractJsonObject(
      {
        contractAddress,
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        params: [],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        contractJSON: HelloWorldContractJson,
      },
    );
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContractJsonObject({
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractJSON: HelloWorldContractJson,
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    const response = await connector.invokeContractJsonObject({
      contractAddress,
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
      contractJSON: HelloWorldContractJson,
    });
    t2.ok(response, "deposit() payable invocation output is truthy OK");

    const { callOutput } = await connector.invokeContractJsonObject({
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [0],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractJSON: HelloWorldContractJson,
    });
    t2.equal(
      callOutput,
      newName,
      `getNameByIndex() output reflects the update OK`,
    );

    t2.end();
  });

  t.end();
});
