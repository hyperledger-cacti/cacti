/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel = "info";
const sutLogLevel = "info";

const containerImageVersion = "2021-05-03-quorum-v21.4.1";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationWeb3Method,
  InvokeRawWeb3EthContractV1Request,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "../../../../../main/typescript/index";
import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { AbiItem } from "web3-utils";

import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "v21.4.1-invoke-web3-contract-v1.test",
  level: testLogLevel,
});
log.info("Test started");

describe("invokeRawWeb3EthContract Tests", () => {
  let quorumTestLedger: QuorumTestLedger;
  let connector: PluginLedgerConnectorQuorum;
  let firstHighNetWorthAccount: string;
  let contractAbi: AbiItem[];
  let contractAddress: string;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start QuorumTestLedger...");
    log.debug("Quorum version:", containerImageVersion);
    quorumTestLedger = new QuorumTestLedger({
      containerImageVersion,
    });
    await quorumTestLedger.start();

    log.info("Get highNetWorthAccounts...");
    const quorumGenesisOptions: IQuorumGenesisOptions = await quorumTestLedger.getGenesisJsObject();
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

    const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();
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

    log.info("Create PluginLedgerConnectorQuorum...");
    connector = new PluginLedgerConnectorQuorum({
      rpcApiHttpHost: rpcApiHttpHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    log.info("Deploy contract to interact with...");
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
    expect(deployOut.transactionReceipt.status).toBeTrue();

    contractAbi = HelloWorldContractJson.abi as AbiItem[];
    contractAddress = deployOut.transactionReceipt.contractAddress as string;
  });

  afterAll(async () => {
    log.info("Shutdown connector");
    await connector.shutdown();

    log.info("Stop and destroy the test ledger...");
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  test("invokeRawWeb3EthContract send and call to valid contract works correctly", async () => {
    const newName = "QuorumCactus";

    // 1. Set new value (send)
    const sendInvocationArgs = {
      from: firstHighNetWorthAccount,
    };

    const sendInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: EthContractInvocationWeb3Method.Send,
      invocationParams: sendInvocationArgs,
      contractMethod: "setName",
      contractMethodArgs: [newName],
    };

    const resultsSend = await connector.invokeRawWeb3EthContract(
      sendInvokeArgs,
    );
    expect(resultsSend).toBeTruthy();
    expect(resultsSend.status).toBeTrue();

    // // 2. Get new, updated value (call)
    const callInvokeArgs: InvokeRawWeb3EthContractV1Request = {
      abi: contractAbi,
      address: contractAddress,
      invocationType: EthContractInvocationWeb3Method.Call,
      contractMethod: "getName",
    };

    const resultsCall = await connector.invokeRawWeb3EthContract(
      callInvokeArgs,
    );
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
