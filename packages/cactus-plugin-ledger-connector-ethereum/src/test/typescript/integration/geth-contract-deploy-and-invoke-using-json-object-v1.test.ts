/**
 * Tests for deploying a contract and invoking it's method by directly sending contract JSON.
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
import Web3, { HexString } from "web3";

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
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
  ContractJsonDefinition,
  DeployContractV1Request,
  InvokeContractV1Request,
} from "../../../main/typescript/public-api";

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Ethereum contract deploy and invoke using keychain tests", () => {
  const keychainEntryKey = uuidV4();
  let testEthAccount: {
      address: HexString;
      privateKey: HexString;
    },
    web3: InstanceType<typeof Web3>,
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

    //ledger = new GethTestLedger({ emitContainerLogs: true, testLogLevel });
    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ledger.start();

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
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

  test("deploys contract using json object", async () => {
    const deployOut = await apiClient.deployContract({
      contract: {
        contractJSON: HelloWorldContractJson,
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();

    contractAddress = deployOut.data.transactionReceipt
      .contractAddress as string;
    expect(typeof contractAddress).toBe("string");
    expect(contractAddress).toBeTruthy();

    const invokeOut = await apiClient.invokeContractV1({
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(invokeOut).toBeTruthy();
    expect(invokeOut.data).toBeTruthy();
    expect(invokeOut.data.callOutput).toBeTruthy();
    expect(typeof invokeOut.data.callOutput).toBe("string");
  });

  test("deploys contract using json object with constructorArgs", async () => {
    const deployOut = await apiClient.deployContract({
      contract: {
        contractJSON: HelloWorldWithArgContractJson,
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      constructorArgs: ["Johnny"],
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();
  });

  test("deployContract without contractJSON should fail", async () => {
    try {
      await apiClient.deployContract({
        contract: {} as ContractJsonDefinition,
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      fail("Expected deployContract call to fail but it succeeded.");
    } catch (error) {
      console.log("deployContract failed as expected");
    }
  });

  test("deployContract with additional parameters should fail", async () => {
    try {
      await apiClient.deployContract({
        contract: {
          contractJSON: HelloWorldContractJson,
        },
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        gas: 1000000,
        fake: 4,
      } as DeployContractV1Request);
      fail("Expected deployContract call to fail but it succeeded.");
    } catch (error) {
      console.log("deployContract failed as expected");
    }
  });

  //////////////////////////////////
  // Invoke Tests
  //////////////////////////////////

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async () => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await apiClient.invokeContractV1({
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(setNameOut).toBeTruthy();
    expect(setNameOut.data).toBeTruthy();

    try {
      await apiClient.invokeContractV1({
        contract: {
          contractJSON: HelloWorldContractJson,
          contractAddress,
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "foo",
        params: [newName],
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).toBeTruthy();
    }

    const getNameOut = await apiClient.invokeContractV1({
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
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
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
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

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async () => {
    const priorityFee = web3.utils.toWei(2, "gwei");
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await apiClient.invokeContractV1({
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gasConfig: {
        maxPriorityFeePerGas: priorityFee,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(setNameOut).toBeTruthy();
    expect(setNameOut.data).toBeTruthy();

    try {
      await apiClient.invokeContractV1({
        contract: {
          contractJSON: HelloWorldContractJson,
          contractAddress,
        },
        invocationType: EthContractInvocationType.Send,
        methodName: "foo",
        params: [newName],
        gasConfig: {
          maxPriorityFeePerGas: priorityFee,
        },
        web3SigningCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      });
      fail("Expected getContractInfoKeychain call to fail but it succeeded.");
    } catch (error) {
      expect(error).toBeTruthy();
    }

    const invokeGetNameOut = await apiClient.invokeContractV1({
      contract: {
        contractJSON: HelloWorldContractJson,
        contractAddress,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
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

  test("invokeContractV1 without methodName should fail", async () => {
    try {
      await apiClient.invokeContractV1({
        contract: {
          contractJSON: HelloWorldContractJson,
          contractAddress,
        },
        invocationType: EthContractInvocationType.Send,
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
});
