import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
  BesuApiClient,
  WatchBlocksV1Progress,
  Web3BlockHeader,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { K_CACTUS_BESU_TOTAL_TX_COUNT } from "../../../../../main/typescript/prometheus-exporter/metrics";
import { BesuApiClientOptions } from "../../../../../main/typescript/api-client/besu-api-client";
import { Account } from "web3-core";

describe("PluginLedgerConnectorBesu", () => {
  const testCase = "deploys contract via .json file";
  const logLevel: LogLevelDesc = "INFO";
  const containerImageVersion = "2021-08-24--feat-1244";
  const containerImageName =
    "ghcr.io/hyperledger/cactus-besu-21-1-6-all-in-one";
  const besuOptions = { containerImageName, containerImageVersion };
  const besuTestLedger = new BesuTestLedger(besuOptions);
  const besuKeyPair = {
    privateKey: besuTestLedger.getGenesisAccountPrivKey(),
  };
  const keychainEntryKey = uuidv4();

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map(),
    logLevel,
  });

  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);

  const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };

  let rpcApiHttpHost: string;
  let rpcApiWsHost: string;
  let firstHighNetWorthAccount: string;
  let web3: Web3;
  let testEthAccount: Account;
  let keychainEntryValue: string;
  let connector: PluginLedgerConnectorBesu;
  let addressInfo: AddressInfo;
  let apiClient: BesuApiClient;
  let apiHost: string;
  let contractAddress: string;

  beforeAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  beforeAll(async () => {
    await besuTestLedger.start();
    rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();

    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidv4());
    keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin.set(keychainEntryKey, keychainEntryValue);

    addressInfo = await Servers.listen(listenOptions);

    connector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry,
    });

    const { address, port } = addressInfo;
    apiHost = `http://${address}:${port}`;
    const besuApiClientOptions = new BesuApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new BesuApiClient(besuApiClientOptions);

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  });

  afterAll(async () => {
    await Servers.shutdown(server);
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  afterAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test(testCase, async () => {
    await connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
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

    const blocks = await apiClient.watchBlocksV1();

    const aBlockHeader = await new Promise<Web3BlockHeader>(
      (resolve, reject) => {
        let done = false;
        const timerId = setTimeout(() => {
          if (!done) {
            reject("Waiting for block header notification to arrive timed out");
          }
        }, 10000);
        const subscription = blocks.subscribe((res: WatchBlocksV1Progress) => {
          subscription.unsubscribe();
          done = true;
          clearTimeout(timerId);
          resolve(res.blockHeader);
        });
      },
    );
    expect(aBlockHeader).toBeTruthy();
    expect(aBlockHeader).toBeObject();
    expect(aBlockHeader).not.toBeEmptyObject();

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toEqual(10e9);
  });

  test("deploys contract via .json file", async () => {
    const deployOut = await connector.deployContractNoKeychain({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut).toBeObject();

    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeObject();

    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeString();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;

    const { callOutput: helloMsg } = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(helloMsg).toBeTruthy();
    expect(helloMsg).toBeString();
    expect(helloMsg).not.toBeEmpty();
  });

  test("invoke Web3SigningCredentialType.NONE", async () => {
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
    expect(parseInt(balance2, 10)).toEqual(10e6);
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: 1,
    });
    expect(setNameOut).toBeTruthy();

    const setNameOutPromise1 = connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: 1,
    });

    await expect(setNameOutPromise1).rejects.toMatchObject<Partial<Error>>({
      message: expect.stringContaining("Nonce too low"),
    });

    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut).toEqual(newName);

    const getNameOut2 = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut2).toBeTruthy();

    const response = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      value: 10,
    });
    expect(response).toBeTruthy();

    const { callOutput } = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [0],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });

    expect(callOutput).toEqual(newName);
  });

  test("invoke Web3SigningCredentialType.CactusKeychainRef", async () => {
    const newName = `DrCactus${uuidv4()}`;

    const signingCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential,
      nonce: 4,
    });
    expect(setNameOut).toBeTruthy();

    const setNameOutPromise2 = connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential,
      nonce: 4,
    });

    await expect(setNameOutPromise2).rejects.toMatchObject<Partial<Error>>({
      message: expect.stringContaining("Nonce too low"),
    });

    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });
    expect(getNameOut).toEqual(newName);

    const getNameOut2 = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });

    expect(getNameOut2).toBeTruthy();

    const response = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      signingCredential,
      value: 10,
    });

    expect(response).toBeTruthy();

    const { callOutput } = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [1],
      gas: 1000000,
      signingCredential,
    });

    expect(callOutput).toEqual(newName);
  });

  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_BESU_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_BESU_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_BESU_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_BESU_TOTAL_TX_COUNT +
      '"} 9';

    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data.includes(promMetricsOutput)).toBeTrue();
  });
});
