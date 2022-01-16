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
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "Quorum Ledger Connector Plugin";

describe(testCase, () => {
  const logLevel: LogLevelDesc = "INFO";
  const contractName = "HelloWorld";

  const containerImageVersion = "2021-05-03-quorum-v21.4.1";
  const ledgerOptions = { containerImageVersion };
  const ledger = new QuorumTestLedger(ledgerOptions);
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  let addressInfo,
    rpcApiHttpHost: string,
    quorumGenesisOptions: IQuorumGenesisOptions,
    connector: PluginLedgerConnectorQuorum,
    contractAddress: string,
    address: string,
    port: number,
    apiHost,
    apiConfig,
    apiClient: QuorumApi,
    web3: Web3,
    testEthAccount: Account,
    keychainEntryKey: string,
    keychainEntryValue: string,
    keychainPlugin: PluginKeychainMemory,
    firstHighNetWorthAccount: string;

  afterAll(async () => await Servers.shutdown(server));
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });
  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    await ledger.start();
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    expect(rpcApiHttpHost).toBeString();

    quorumGenesisOptions = await ledger.getGenesisJsObject();
    expect(quorumGenesisOptions).toBeTruthy();
    expect(quorumGenesisOptions.alloc).toBeTruthy();

    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create(uuidV4());

    keychainEntryKey = uuidV4();
    keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    connector = new PluginLedgerConnectorQuorum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
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
  });
  test("Bootsrap test ETH account with funds from genesis", async () => {
    const highNetWorthAccounts: string[] = Object.keys(
      quorumGenesisOptions.alloc,
    ).filter((address: string) => {
      const anAccount: IAccount = quorumGenesisOptions.alloc[address];
      const theBalance = parseInt(anAccount.balance, 10);
      return theBalance > 10e7;
    });
    [firstHighNetWorthAccount] = highNetWorthAccounts;
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests
    await connector.registerWebServices(expressApp);

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
    });
    expect(helloMsg).toBeTruthy();
    expect(typeof contractAddress).toBe("string");
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
      fail("PluginLedgerConnectorQuorum.invokeContract failed to throw error");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
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
      fail("It should not reach here");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
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
    expect(getNameOut).toEqual(newName);

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
      fail("it should not reach here");
    } catch (error) {
      expect(error).not.toBe("Nonce too low");
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
    expect(getNameOut).toEqual(newName);

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
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });
});
