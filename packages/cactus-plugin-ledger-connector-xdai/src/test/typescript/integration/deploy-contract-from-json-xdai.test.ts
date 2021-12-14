import { v4 as uuidv4 } from "uuid";
import { Account } from "web3-core";
import { PluginRegistry } from "@hyperledger/cactus-core";
import "jest-extended";

import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
  DefaultApi as XdaiApi,
} from "../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
  K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { Configuration, PluginImportType } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { K_CACTUS_XDAI_TOTAL_TX_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

const testCase = "deploys contract via .json file";
describe(testCase, () => {
  const logLevel: LogLevelDesc = "TRACE";
  const ledger = new OpenEthereumTestLedger({ logLevel });
  const contractName = "HelloWorld";
  const expressApp = express();
  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  let addressInfo,
    contractAddress: string,
    rpcApiHttpHost: string,
    connector: PluginLedgerConnectorXdai,
    address: string,
    port: number,
    apiHost: string,
    web3: Web3,
    factory: PluginFactoryLedgerConnector,
    testEthAccount: Account,
    keychainEntryKey: string,
    keychainEntryValue: string,
    keychainPlugin: PluginKeychainMemory,
    config,
    apiClient: XdaiApi;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });

  afterAll(async () => await Servers.shutdown(server));

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });
  beforeAll(async () => {
    await ledger.start();
    factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
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
    connector = (await factory.create({
      rpcApiHttpHost,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    })) as PluginLedgerConnectorXdai;
    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    config = new Configuration({ basePath: apiHost });
    apiClient = new XdaiApi(config);
  });
  test(testCase, async () => {
    // TO-DO: Find a way to log container diagnostics
    // and test failure within Jest.
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp);

    await connector.transact({
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: whalePubKey,
        to: testEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
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
      // contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt);
    expect(deployOut.transactionReceipt.contractAddress);

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(typeof contractAddress === "string").toBeTruthy();

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
    expect(typeof helloMsg === "string").toBeTruthy();
  });

  test("invoke Web3SigningCredentialType.None", async () => {
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
      transactionConfig: {
        rawTransaction,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    expect(balance2).toBeTruthy();
    expect(parseInt(balance2, 10)).toEqual(10e6);
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
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
      fail("It should not reach here");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
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

  test("invoke Web3SigningCredentialType.CACTUSKEYCHAINREF", async () => {
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
      fail("It should not reach here");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
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

    const { callOutput } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [1],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(callOutput).toEqual(newName);
  });

  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      '"} 9';
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });
});
