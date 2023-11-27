/**
 * Tests of Geth helper typescript setup class.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
// const containerImageName = "ghcr.io/hyperledger/cactus-geth-all-in-one";
// const containerImageVersion = "2022-10-18-06770b6c";
// const useRunningLedger = false;

// Log settings
const testLogLevel: LogLevelDesc = "info";

import { GethTestLedger } from "../../../main/typescript/index";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

import "jest-extended";
import { Web3 } from "web3";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-test-ledger.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Geth Test Ledger checks", () => {
  let ledger: GethTestLedger;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Start GethTestLedger...");
    ledger = new GethTestLedger({
      emitContainerLogs: true,
      logLevel: testLogLevel,
    });
    log.debug("Geth image:", ledger.fullContainerImageName);
    expect(ledger).toBeTruthy();

    await ledger.start();
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Check if started container is still healthy.
   */
  test("Started container is healthy", async () => {
    const status = await ledger.getContainerStatus();
    expect(status).toEndWith("(healthy)");
  });

  test("web3 can be attached through HTTP endpoint", async () => {
    const httpRpcHost = await ledger.getRpcApiHttpHost();
    const httpWeb3 = new Web3(httpRpcHost);
    const blockNumber = await httpWeb3.eth.getBlockNumber();
    expect(blockNumber.toString()).toBeTruthy();
  });

  test("web3 can be attached through WS endpoint", async () => {
    const wsRpcHost = await ledger.getRpcApiWebSocketHost();
    const wsWeb3 = new Web3(wsRpcHost);
    try {
      const blockNumber = await wsWeb3.eth.getBlockNumber();
      expect(blockNumber.toString()).toBeTruthy();
    } finally {
      wsWeb3.provider?.disconnect();
    }
  });
});
