import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core-api";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";

test("deploys contract via .json file", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";
  const besuKeyPair = {
    privateKey:
      "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
  };

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

  const factory = new PluginFactoryLedgerConnector();
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  await connector.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
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
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    });
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK"
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK"
    );

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    t2.ok(
      typeof contractAddress === "string",
      "contractAddress typeof string OK"
    );

    const { callOutput: helloMsg } = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.ok(helloMsg, "sayHello() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "sayHello() output is type of string"
    );
  });

  // FIXME: Stop skipping this test once the 'personal' API is enabled in the
  // Besu Test Ledger image by default.
  test.skip("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "setName",
      params: [newName],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
      },
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    const getNameOut = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "getName",
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
      },
    });
    t2.ok(
      getNameOut.transactionReceipt,
      `getName() SEND invocation produced receipt OK`
    );

    const { callOutput: getNameOut2 } = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "getName",
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
      },
    });
    t2.equal(
      getNameOut2,
      newName,
      "setName() invocation #2 output is truthy OK"
    );

    t2.end();
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
      testEthAccount.privateKey
    );

    await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.NONE,
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

  test("invoke Web3SigningCredentialType.PRIVATEKEYHEX", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    const { callOutput: getNameOut } = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    t2.end();
  });

  test("invoke Web3SigningCredentialType.CACTUSKEYCHAINREF", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;

    const web3SigningCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CACTUSKEYCHAINREF,
    };

    const setNameOut = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      web3SigningCredential,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    const { callOutput: getNameOut } = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.CALL,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContract({
      contractAddress,
      contractAbi: HelloWorldContractJson.abi,
      invocationType: EthContractInvocationType.SEND,
      methodName: "getName",
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    t2.end();
  });

  t.end();
});
