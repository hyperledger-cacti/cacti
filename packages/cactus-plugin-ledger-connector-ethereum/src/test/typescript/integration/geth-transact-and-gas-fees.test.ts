/**
 * Tests for running transactions with different gas configurations (both legacy and EIP-1559)
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

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";

import {
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
} from "../../../main/typescript/public-api";

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("Running ethereum transactions with different gas configurations", () => {
  let web3: InstanceType<typeof Web3>,
    addressInfo,
    address: string,
    port: number,
    apiHost,
    apiConfig,
    ledger: GethTestLedger,
    apiClient: EthereumApi,
    connector: PluginLedgerConnectorEthereum,
    rpcApiHttpHost: string;
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

    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel: testLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await Servers.shutdown(server);

    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  test("sending transfer without gas config works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with mixed gas config fails", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    const maxFee = await connector.estimateMaxFeePerGas(
      web3.utils.toWei(2, "gwei"),
    );

    try {
      await apiClient.runTransactionV1({
        web3SigningCredential: {
          ethAccount: WHALE_ACCOUNT_ADDRESS,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        transactionConfig: {
          from: WHALE_ACCOUNT_ADDRESS,
          to: testEthAccount.address,
          value: transferValue,
          gasConfig: {
            gas: "300000",
            maxFeePerGas: maxFee,
          },
        },
      });
      fail(
        "Expected runTransactionV1 with mixed config to fail but it succeeded.",
      );
    } catch (error) {
      console.log("runTransactionV1 with mixed config failed as expected");
    }

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance.toString()).toEqual("0");
  });

  test("sending transfer with only legacy gas price works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    const maxFee = await connector.estimateMaxFeePerGas(
      web3.utils.toWei(2, "gwei"),
    );

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          gasPrice: maxFee,
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with only legacy gas (limit) works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          gas: "300000",
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with both legacy gas (limit) and gas price works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    const maxFee = await connector.estimateMaxFeePerGas(
      web3.utils.toWei(2, "gwei"),
    );

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          gas: "300000",
          gasPrice: maxFee,
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with only maxFeePerGas works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    const maxFee = await connector.estimateMaxFeePerGas(
      web3.utils.toWei(2, "gwei"),
    );

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          maxFeePerGas: maxFee,
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with only maxPriorityFeePerGas works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");

    await connector.transact({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          maxPriorityFeePerGas: web3.utils.toWei(2, "gwei"),
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });

  test("sending transfer with only maxPriorityFeePerGas works", async () => {
    const testEthAccount = web3.eth.accounts.create();
    const transferValue = web3.utils.toWei(1, "ether");
    const priorityFee = web3.utils.toWei(2, "gwei");
    const maxFee = await connector.estimateMaxFeePerGas(priorityFee);

    await apiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: transferValue,
        gasConfig: {
          maxFeePerGas: maxFee,
          maxPriorityFeePerGas: priorityFee,
        },
      },
    });

    const balance = await web3.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toEqual(transferValue);
  });
});
