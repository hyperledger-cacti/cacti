/**
 * Tests for deploying a contract and invoking it's method using contract JSON stored in keystore plugin.
 *
 * @note all tests must be run in order, don't use `skip()` or `only()`. @todo - fix that
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { v4 as uuidV4 } from "uuid";
import { AddressInfo } from "net";
import { Server as SocketIoServer } from "socket.io";
import Web3 from "web3";
import { Web3Account } from "web3-eth-accounts";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";

import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import HelloWorldWithArgContractJson from "../../solidity/hello-world-with-arg-contract/HelloWorldWithArg.json";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
  DeployContractSolidityBytecodeV1Request,
  RunTransactionRequest,
  InvokeContractV1Request,
} from "../../../main/typescript/public-api";
import { K_CACTUS_ETHEREUM_TOTAL_TX_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Ethereum contract deploy and invoke using keychain tests", () => {
  const keychainEntryKey = uuidV4();
  let testEthAccount: Web3Account,
    web3: Web3,
    addressInfo,
    address: string,
    port: number,
    contractAddress: string,
    apiHost,
    apiConfig,
    ledger: GethTestLedger,
    apiClient: EthereumApi,
    connector: PluginLedgerConnectorEthereum,
    rpcApiHttpHost: string,
    keychainPlugin: PluginKeychainMemory;
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  //////////////////////////////////
  // Setup
  //////////////////////////////////

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();

    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
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
    apiClient = new EthereumApi(apiConfig);
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    web3 = new Web3(rpcApiHttpHost);
    testEthAccount = web3.eth.accounts.create();

    const keychainEntryValue = testEthAccount.privateKey;
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel: testLogLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );
    keychainPlugin.set(
      HelloWorldWithArgContractJson.contractName,
      JSON.stringify(HelloWorldWithArgContractJson),
    );
    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await Servers.shutdown(server);

    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  test("setup ethereum connector", async () => {
    // Instantiate connector with the keychain plugin that already has the
    // private key we want to use for one of our tests
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);

    const initTransferValue = web3.utils.toWei(5000, "ether");
    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: initTransferValue,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toBe(initTransferValue);
  });

  //////////////////////////////////
  // Deployment Tests
  //////////////////////////////////

  test("deploys contract using keychain", async () => {
    const deployOut = await apiClient.deployContractSolBytecodeV1({
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.data.transactionReceipt
      .contractAddress as string;
    expect(typeof contractAddress).toBe("string");
    const invokeOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: "1000000",
    });
    expect(invokeOut).toBeTruthy();
    expect(invokeOut.data).toBeTruthy();
    expect(invokeOut.data.callOutput).toBeTruthy();
    expect(typeof invokeOut.data.callOutput).toBe("string");
  });

  test("deploys contract using keychain with constructorArgs", async () => {
    const deployOut = await apiClient.deployContractSolBytecodeV1({
      contractName: HelloWorldWithArgContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      gas: 1000000,
      constructorArgs: ["Johnny"],
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();
  });

  test("deployContractSolBytecodeV1 without contractName should fail", async () => {
    try {
      await apiClient.deployContractSolBytecodeV1({
        keychainId: keychainPlugin.getKeychainId(),
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        gas: 1000000,
      } as DeployContractSolidityBytecodeV1Request);
      fail(
        "Expected deployContractSolBytecodeV1 call to fail but it succeeded.",
      );
    } catch (error) {
      console.log("deployContractSolBytecodeV1 failed as expected");
    }
  });

  test("deployContractSolBytecodeV1 with additional parameters should fail", async () => {
    try {
      await apiClient.deployContractSolBytecodeV1({
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        gas: 1000000,
        fake: 4,
      } as DeployContractSolidityBytecodeV1Request);
      fail(
        "Expected deployContractSolBytecodeV1 call to fail but it succeeded.",
      );
    } catch (error) {
      console.log("deployContractSolBytecodeV1 failed as expected");
    }
  });

  //////////////////////////////////
  // Invoke Tests
  //////////////////////////////////

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async () => {
    const nonce = await web3.eth.getTransactionCount(WHALE_ACCOUNT_ADDRESS);
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      nonce: nonce.toString(),
    });
    expect(setNameOut).toBeTruthy();
    expect(setNameOut.data).toBeTruthy();

    try {
      await apiClient.invokeContractV1({
        contractName: HelloWorldContractJson.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: nonce.toString(),
      });
      fail("Expected invokeContractV1 call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const getNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(getNameOut).toBeTruthy();
    expect(getNameOut.data).toBeTruthy();
    expect(getNameOut.data.success).toBeTruthy();

    const invokeGetNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(invokeGetNameOut).toBeTruthy();
    expect(invokeGetNameOut.data).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBe(newName);
  });

  test("invoke Web3SigningCredentialType.NONE", async () => {
    const testEthAccount2 = web3.eth.accounts.create();

    const value = 10e6;
    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: testEthAccount.address,
        to: testEthAccount2.address,
        value,
        maxPriorityFeePerGas: 0,
        maxFeePerGas: 0x40000000,
        gasLimit: 21000,
      },
      testEthAccount.privateKey,
    );

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    expect(balance2).toBeTruthy();
    expect(balance2.toString()).toBe(value.toString());
  });

  test("runTransactionV1 without transaction config should fail", async () => {
    try {
      await apiClient.runTransactionV1({
        web3SigningCredential: {
          type: Web3SigningCredentialType.None,
        },
      } as RunTransactionRequest);
      fail(
        "Expected deployContractSolBytecodeV1 call to fail but it succeeded.",
      );
    } catch (error) {
      console.log("deployContractSolBytecodeV1 failed as expected");
    }
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const nonce = await web3.eth.getTransactionCount(testEthAccount.address);
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: nonce.toString(),
    });
    expect(setNameOut).toBeTruthy();
    expect(setNameOut.data).toBeTruthy();

    try {
      await apiClient.invokeContractV1({
        contractName: HelloWorldContractJson.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: nonce.toString(),
      });
      fail("Expected invokeContractV1 call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const invokeGetNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(invokeGetNameOut).toBeTruthy();
    expect(invokeGetNameOut.data).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBe(newName);
  });

  test("invoke Web3SigningCredentialType.CactusKeychainRef", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const nonce = await web3.eth.getTransactionCount(testEthAccount.address);

    const web3SigningCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    // @todo - using too large nonce freezes the test! Fix that
    const setNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [newName],
      gas: "1000000",
      web3SigningCredential,
      nonce: nonce.toString(),
    });
    expect(setNameOut).toBeTruthy();
    expect(setNameOut.data).toBeTruthy();

    try {
      await apiClient.invokeContractV1({
        contractName: HelloWorldContractJson.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        keychainId: keychainPlugin.getKeychainId(),
        params: [newName],
        gas: "1000000",
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: nonce.toString(),
      });
      fail("Expected invokeContractV1 call to fail but it succeeded.");
    } catch (error) {
      expect(error).not.toEqual("Nonce too low");
    }

    const invokeGetNameOut = await apiClient.invokeContractV1({
      contractName: HelloWorldContractJson.contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      keychainId: keychainPlugin.getKeychainId(),
      params: [],
      gas: "1000000",
      web3SigningCredential,
    });
    expect(invokeGetNameOut).toBeTruthy();
    expect(invokeGetNameOut.data).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBeTruthy();
    expect(invokeGetNameOut.data.callOutput).toBe(newName);
  });

  test("invokeContractV1 without methodName should fail", async () => {
    try {
      await apiClient.invokeContractV1({
        contractName: HelloWorldContractJson.contractName,
        invocationType: EthContractInvocationType.Send,
        keychainId: keychainPlugin.getKeychainId(),
        params: [`DrCactus${uuidV4()}`],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      } as InvokeContractV1Request);
      fail(
        "Expected deployContractSolBytecodeV1 call to fail but it succeeded.",
      );
    } catch (error) {
      console.log("deployContractSolBytecodeV1 failed as expected");
    }
  });

  // @todo - move to separate test suite
  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_ETHEREUM_TOTAL_TX_COUNT +
      '"} 3';
    expect(res);
    expect(res.data);
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });
});
