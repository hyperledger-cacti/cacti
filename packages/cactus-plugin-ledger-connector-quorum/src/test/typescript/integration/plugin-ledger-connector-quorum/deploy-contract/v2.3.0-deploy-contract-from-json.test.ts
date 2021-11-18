import Web3 from "web3";
import { Account } from "web3-core";
import { v4 as uuidV4 } from "uuid";
import "jest-extended";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

import { K_CACTUS_QUORUM_TOTAL_TX_COUNT } from "../../../../../main/typescript/prometheus-exporter/metrics";

import {
  EthContractInvocationType,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
} from "../../../../../main/typescript/public-api";

import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { Server as SocketIoServer } from "socket.io";

const testCase = "Quorum Ledger Connector Plugin";

describe(testCase, () => {
  const logLevel: LogLevelDesc = "INFO";
  const contractName = "HelloWorld";
  const keychainEntryKey = uuidV4();
  let firstHighNetWorthAccount: string,
    testEthAccount: Account,
    web3: Web3,
    addressInfo,
    address: string,
    port: number,
    contractAddress: string,
    apiHost,
    apiConfig,
    ledger: QuorumTestLedger,
    apiClient: QuorumApi,
    connector: PluginLedgerConnectorQuorum,
    rpcApiHttpHost: string,
    keychainPlugin: PluginKeychainMemory;
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    const containerImageVersion = "2021-01-08-7a055c3"; // Quorum v2.3.0, Tessera v0.10.0
    const containerImageName = "hyperledger/cactus-quorum-all-in-one";
    const ledgerOptions = { containerImageName, containerImageVersion };
    ledger = new QuorumTestLedger(ledgerOptions);
    await ledger.start();

    const quorumGenesisOptions: IQuorumGenesisOptions = await ledger.getGenesisJsObject();

    expect(quorumGenesisOptions).toBeTruthy();
    expect(quorumGenesisOptions.alloc).toBeTruthy();

    const highNetWorthAccounts: string[] = Object.keys(
      quorumGenesisOptions.alloc,
    ).filter((address: string) => {
      const anAccount: IAccount = quorumGenesisOptions.alloc[address];
      const theBalance = parseInt(anAccount.balance, 10);
      return theBalance > 10e7;
    });
    [firstHighNetWorthAccount] = highNetWorthAccounts;
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

    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new QuorumApi(apiConfig);
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
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    connector = new PluginLedgerConnectorQuorum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  test(testCase, async () => {
    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

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
    expect(parseInt(balance, 10)).toBe(10e9);
  });

  test("deploys contract via .json file", async () => {
    const deployOut = await connector.deployContract({
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
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
    expect(typeof contractAddress).toBe("string");
    const { callOutput: helloMsg } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
    });
    expect(helloMsg).toBeTruthy();
    expect(typeof helloMsg).toBe("string");
  });

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
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
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const getNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
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
        invocationType: EthContractInvocationType.Call,
        methodName: "getName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [],
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      },
    );
    expect(getNameOut2).toBe(newName);
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
    expect(parseInt(balance2, 10)).toBe(10e6);
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
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
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: 1,
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(getNameOut).toBe(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
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
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      gas: 1000000,
      web3SigningCredential,
      nonce: 3,
    });
    expect(setNameOut).toBeTruthy();

    try {
      await connector.getContractInfoKeychain({
        contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 3,
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const { callOutput: getNameOut } = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut).toContain(newName);

    const getNameOut2 = await connector.getContractInfoKeychain({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: 1000000,
      web3SigningCredential,
    });
    expect(getNameOut2).toBeTruthy();
  });

  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      '"} 5';
    expect(res);
    expect(res.data);
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });

  test("deploys contract via .json file with constructorArgs", async () => {
    const deployOut = await connector.deployContract({
      contractName: HelloWorldContractJson.contractName,
      contractJSON: HelloWorldContractJson,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
      constructorArgs: ["Test Arg"],
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    expect(contractAddress).toBeString();
  });
});
