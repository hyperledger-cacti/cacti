/**
 * Tests of Geth helper typescript setup class.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

import { GethTestLedger } from "../../../main/typescript/index";
import contractData from "../../solidity/hello-world-contract/HelloWorld.json";

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
  let web3Instance: Web3;

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
    expect(ledger).toBeTruthy();
    log.debug("Geth image:", ledger.fullContainerImageName);

    await ledger.start();
    web3Instance = new Web3(await ledger.getRpcApiHttpHost());
    expect(web3Instance).toBeTruthy;
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

  test("Class name is correct", async () => {
    const className = ledger.className;
    expect(className).toEqual("GethTestLedger");
  });

  test("Method createEthTestAccount works", async () => {
    const testEthAcc = await ledger.createEthTestAccount();

    expect(testEthAcc).toBeTruthy();
    expect(testEthAcc.address).toHaveLength(42);
    expect(testEthAcc.address).toStartWith("0x");
  });

  test("Method newEthPersonalAccount works", async () => {
    const testEthAccount = await ledger.newEthPersonalAccount();

    expect(testEthAccount).toBeTruthy();
    expect(testEthAccount).toHaveLength(42);
    expect(testEthAccount).toStartWith("0x");
  });

  test("Method transferAssetFromCoinbase works", async () => {
    const testEthAcc = await ledger.createEthTestAccount();

    const txReceipt = await ledger.transferAssetFromCoinbase(
      testEthAcc.address,
      1000,
    );

    expect(txReceipt).toBeTruthy();
    expect(web3Instance.utils.toChecksumAddress(txReceipt.to)).toEqual(
      testEthAcc.address,
    );
    expect(await web3Instance.eth.getBalance(testEthAcc.address)).toEqual(
      BigInt("10000000000000001000"),
    );
  });

  test("Method deployContract works and returns contract address", async () => {
    const deployedData = await ledger.deployContract(
      contractData.abi,
      contractData.bytecode,
      [],
    );
    expect(deployedData).toBeTruthy();
    expect(deployedData.contractAddress).toStartWith("0x");
    expect(deployedData.contractAddress).toHaveLength(42);

    const contract = new web3Instance.eth.Contract(
      contractData.abi,
      deployedData.contractAddress,
    );
    expect(contract).toBeTruthy();

    const contractCallResult = await contract.methods.sayHello().call();
    expect(contractCallResult).toEqual("Hello World!");
  });

  test("Method getRpcApiHttpHost returns valid URL", async () => {
    const httpHostAddress = await ledger.getRpcApiHttpHost();
    const httpPort = await ledger.getHostPortHttp();
    expect(httpHostAddress).toBeTruthy();
    expect(httpHostAddress).toStartWith("http://");
    expect(httpHostAddress).toContain(`${httpPort}`);
  });

  test("Method getRpcApiWebSocketHost returns valid URL", async () => {
    const wsHostAddress = await ledger.getRpcApiWebSocketHost();
    const wsPort = await ledger.getHostPortWs();
    expect(wsHostAddress).toBeTruthy();
    expect(wsHostAddress).toStartWith("ws://");
    expect(wsHostAddress).toContain(`${wsPort}`);
  });
});
