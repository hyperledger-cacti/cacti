/*
 * Copyright 2020-2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * For instructions on how to run it see cactus-plugin-ledger-connector-ethereum README
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const ALCHEMY_ENDPOINT =
  "https://eth-sepolia.g.alchemy.com/v2/______API_KEY______";
const ETH_ADDRESS = "______ADDRESS______";
const ETH_PRIVATE_KEY = "______PRIVATE_KEY______";

const testLogLevel = "info";
const sutLogLevel = "info";

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "../../../main/typescript/index";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";

jest.setTimeout(60 * 1000); // 1 minute timeout

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-alchemy-integration-manual-check.test",
  level: testLogLevel,
});
log.info("Test started");

describe("Alchemy integration manual tests", () => {
  let connector: PluginLedgerConnectorEthereum;
  let keychainPlugin: PluginKeychainMemory;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.debug("ALCHEMY_ENDPOINT:", ALCHEMY_ENDPOINT);

    log.info("Create PluginKeychainMemory...");
    keychainPlugin = new PluginKeychainMemory({
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
      rpcApiHttpHost: ALCHEMY_ENDPOINT,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
  });

  afterAll(async () => {
    log.info("Shutdown connector");
    await connector.shutdown();
  });

  test("deploy sample contract to testnet", async () => {
    const deployOut = await connector.deployContract({
      contract: {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      web3SigningCredential: {
        ethAccount: ETH_ADDRESS,
        secret: ETH_PRIVATE_KEY,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    log.debug("Deployment receipt:", deployOut.transactionReceipt);
    const { contractAddress, transactionHash } = deployOut.transactionReceipt;
    expect(contractAddress).toBeTruthy();
    expect(transactionHash).toBeTruthy();
    log.info(`Transaction: https://sepolia.etherscan.io/tx/${transactionHash}`);
    log.info(
      `New Contract: https://sepolia.etherscan.io/address/${contractAddress}`,
    );

    expect(typeof contractAddress).toBe("string");
    const invokeOut = await connector.invokeContract({
      contract: {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      web3SigningCredential: {
        ethAccount: ETH_ADDRESS,
        secret: ETH_PRIVATE_KEY,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(invokeOut).toBeTruthy();
    expect(invokeOut.callOutput).toBeTruthy();
    expect(typeof invokeOut.callOutput).toBe("string");
    log.info("Method query OK!");
  });
});
