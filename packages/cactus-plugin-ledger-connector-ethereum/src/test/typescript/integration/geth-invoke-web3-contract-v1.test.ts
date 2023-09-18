/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "info";
const sutLogLevel = "info";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationWeb3Method,
  InvokeRawWeb3EthContractV1Request,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "../../../main/typescript/index";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { ContractAbi } from "web3";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-invoke-web3-contract-v1.test",
  level: testLogLevel,
});
log.info("Test started");

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("invokeRawWeb3EthContract Tests", () => {
  let ethereumTestLedger: GethTestLedger;
  let connector: PluginLedgerConnectorEthereum;
  let contractAbi: ContractAbi;
  let contractAddress: string;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start GethTestLedger...");
    // log.debug("Ethereum version:", containerImageVersion);
    ethereumTestLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ethereumTestLedger.start();

    const rpcApiHttpHost = await ethereumTestLedger.getRpcApiHttpHost();
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);

    log.info("Create PluginKeychainMemory...");
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: sutLogLevel,
    });
    keychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );

    log.info("Create PluginLedgerConnectorEthereum...");
    connector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost: rpcApiHttpHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    log.info("Deploy contract to interact with...");
    const deployOut = await connector.deployContract({
      contract: {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    expect(deployOut.transactionReceipt.status).toBeTrue();

    contractAbi = HelloWorldContractJson.abi;
    contractAddress = deployOut.transactionReceipt.contractAddress as string;
  });

  afterAll(async () => {
    log.info("Shutdown connector");
    await connector.shutdown();

    log.info("Stop and destroy the test ledger...");
    await ethereumTestLedger.stop();
    await ethereumTestLedger.destroy();

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  test("invokeRawWeb3EthContract send and call to valid contract works correctly", async () => {
    const newName = "EthereumCactus";

    // 1. Set new value (send)
    const sendInvocationArgs = {
      from: WHALE_ACCOUNT_ADDRESS,
    };

    const sendInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: EthContractInvocationWeb3Method.Send,
      invocationParams: sendInvocationArgs,
      contractMethod: "setName",
      contractMethodArgs: [newName],
    };

    const resultsSend =
      await connector.invokeRawWeb3EthContract(sendInvokeArgs);
    expect(resultsSend).toBeTruthy();
    expect(resultsSend.status.toString()).toEqual("1");

    // // 2. Get new, updated value (call)
    const callInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: EthContractInvocationWeb3Method.Call,
      contractMethod: "getName",
    };

    const resultsCall =
      await connector.invokeRawWeb3EthContract(callInvokeArgs);
    expect(resultsCall).toBeTruthy();
    expect(resultsCall).toEqual(newName);
  });

  test("invokeRawWeb3EthContract throws error when called on wrong contract", async () => {
    const callInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: "0x0321",
      invocationType: EthContractInvocationWeb3Method.Call,
      contractMethod: "getName",
    };

    await expect(connector.invokeRawWeb3EthContract(callInvokeArgs)).toReject();
  });

  test("invokeRawWeb3EthContract throws error when requested wrong invocation method", async () => {
    const callInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: "foo" as EthContractInvocationWeb3Method,
      contractMethod: "getName",
    };

    await expect(connector.invokeRawWeb3EthContract(callInvokeArgs)).toReject();
  });

  test("invokeRawWeb3EthContract throws error when called non existent contract method", async () => {
    const callInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: EthContractInvocationWeb3Method.Call,
      contractMethod: "nonExistingFoo",
    };

    await expect(connector.invokeRawWeb3EthContract(callInvokeArgs)).toReject();
  });
});
