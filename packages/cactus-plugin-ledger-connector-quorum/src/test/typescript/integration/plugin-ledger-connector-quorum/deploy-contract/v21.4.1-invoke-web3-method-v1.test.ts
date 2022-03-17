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
import { PluginLedgerConnectorQuorum } from "../../../../../main/typescript/index";
import {
  QuorumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import Web3 from "web3";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "v21.4.1-invoke-web3-method-v1.test",
  level: testLogLevel,
});
log.info("Test started");

describe("invokeRawWeb3EthMethod Tests", () => {
  let quorumTestLedger: QuorumTestLedger;
  let connector: PluginLedgerConnectorQuorum;
  let web3: Web3;

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

    const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);

    log.info("Create PluginLedgerConnectorQuorum...");
    connector = new PluginLedgerConnectorQuorum({
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
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();

    log.info("Prune docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  test("invokeRawWeb3EthMethod with 0-argument method works (getGasPrice)", async () => {
    const connectorResponse = await connector.invokeRawWeb3EthMethod({
      methodName: "getGasPrice",
    });
    expect(connectorResponse).toBeTruthy();
    expect(connectorResponse).toEqual("0"); // gas is free on quorum
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
    const genesisAccount = await quorumTestLedger.getGenesisAccount();
    log.debug("genesisAccount:", genesisAccount);

    const connectorResponse = await connector.invokeRawWeb3EthMethod({
      methodName: "getStorageAt",
      params: [genesisAccount, 0],
    });
    expect(connectorResponse).toBeTruthy();

    // Compare with direct web3 response
    const web3Response = await web3.eth.getStorageAt(genesisAccount, 0);
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
