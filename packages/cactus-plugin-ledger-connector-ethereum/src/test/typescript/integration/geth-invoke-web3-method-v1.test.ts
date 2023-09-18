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
import { PluginLedgerConnectorEthereum } from "../../../main/typescript/index";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import Web3 from "web3";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-invoke-web3-method-v1.test",
  level: testLogLevel,
});
log.info("Test started");

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

describe("invokeRawWeb3EthMethod Tests", () => {
  let ethereumTestLedger: GethTestLedger;
  let connector: PluginLedgerConnectorEthereum;
  let web3: Web3;

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

    log.info("Create PluginLedgerConnectorEthereum...");
    connector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost: rpcApiHttpHost,
      logLevel: sutLogLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
    });

    web3 = new Web3(rpcApiHttpHost);
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

  test("invokeRawWeb3EthMethod with 0-argument method works (getGasPrice)", async () => {
    const connectorResponse = await connector.invokeRawWeb3EthMethod({
      methodName: "getGasPrice",
    });
    expect(connectorResponse).toBeTruthy();
    expect(Number(connectorResponse)).toBeGreaterThan(0);
  });

  test("invokeRawWeb3EthMethod with 1-argument method works (getBlock)", async () => {
    const connectorResponse = await connector.invokeRawWeb3EthMethod({
      methodName: "getBlock",
      params: ["earliest"],
    });
    expect(connectorResponse).toBeTruthy();
    expect(connectorResponse.hash.length).toBeGreaterThan(5);

    // Compare with direct web3 response
    const web3Response = await web3.eth.getBlock("earliest");
    expect(web3Response).toBeTruthy();
    expect(web3Response).toEqual(connectorResponse);
  });

  test("invokeRawWeb3EthMethod with 2-argument method works (getStorageAt)", async () => {
    log.debug("WHALE_ACCOUNT_ADDRESS:", WHALE_ACCOUNT_ADDRESS);

    const connectorResponse = await connector.invokeRawWeb3EthMethod({
      methodName: "getStorageAt",
      params: [WHALE_ACCOUNT_ADDRESS, 0],
    });
    expect(connectorResponse).toBeTruthy();

    // Compare with direct web3 response
    const web3Response = await web3.eth.getStorageAt(WHALE_ACCOUNT_ADDRESS, 0);
    expect(web3Response).toBeTruthy();
    expect(web3Response).toEqual(connectorResponse);
  });

  test("invokeRawWeb3EthMethod with missing arg throws error (getBlock)", async () => {
    try {
      const connectorResponse = connector.invokeRawWeb3EthMethod({
        methodName: "getBlock",
      });

      await connectorResponse;
      fail("Calling getBlock with missing argument should throw an error");
    } catch (err) {
      expect(err).toBeTruthy();
    }
  });

  test("invokeRawWeb3EthMethod with invalid arg throws error (getBlock)", async () => {
    try {
      const connectorResponse = connector.invokeRawWeb3EthMethod({
        methodName: "getBlock",
        params: ["foo"],
      });

      await connectorResponse;
      fail("Calling getBlock with argument should throw an error");
    } catch (err) {
      expect(err).toBeTruthy();
    }
  });

  test("invokeRawWeb3EthMethod with non existing method throws error", async () => {
    try {
      const connectorResponse = connector.invokeRawWeb3EthMethod({
        methodName: "foo",
        params: ["foo"],
      });

      await connectorResponse;
      fail("Calling non existing method should throw an error");
    } catch (err) {
      expect(err).toBeTruthy();
    }
  });
});
