/**
 * Functional test of basic operations on go-ethereum validator (packages/cactus-plugin-ledger-connector-go-ethereum-socketio).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const testTimeout = 1000 * 60; // 1 minute timeout for some tests
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

// Ledger settings
const imageName = "openethereum/openethereum";
const imageVersion = "v3.3.5";

// ApiClient settings
const syncReqTimeout = 1000 * 10; // 10 seconds

import {
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
  SelfSignedPkiGenerator,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";

import "jest-extended";
import { Server as HttpsServer } from "https";
import { Account } from "web3-core";

import Web3 from "web3";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "go-ethereum-socketio-connector.test",
  level: testLogLevel,
});

describe("Go-Ethereum-SocketIO connector tests", () => {
  let ledger: OpenEthereumTestLedger;
  let web3: Web3;
  let contractAddress: string;
  let connectorCertValue: string;
  let connectorPrivKeyValue: string;
  let connectorServer: HttpsServer;
  let apiClient: SocketIOApiClient;
  let constTestAcc: Account;
  let connectorModule: any;
  const constTestAccBalance = 5 * 1000000;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  async function deploySmartContract(): Promise<{
    contractAddress: string;
    blockNumber: number;
  }> {
    const txReceipt = await ledger.deployContract(
      HelloWorldContractJson.abi as any,
      "0x" + HelloWorldContractJson.bytecode,
    );
    expect(txReceipt.contractAddress).toBeTruthy();
    expect(txReceipt.status).toBeTrue();
    expect(txReceipt.blockHash).toBeTruthy();
    expect(txReceipt.blockNumber).toBeGreaterThan(1);
    log.debug(
      "Deployed test smart contract, TX on block number",
      txReceipt.blockNumber,
    );

    return {
      contractAddress: txReceipt.contractAddress ?? "",
      blockNumber: txReceipt.blockNumber,
    };
  }

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info(`Start Ledger ${imageName}:${imageVersion}...`);
    ledger = new OpenEthereumTestLedger({
      imageName,
      imageVersion,
      emitContainerLogs: true,
      logLevel: sutLogLevel,
    });
    await ledger.start();
    const ledgerRpcUrl = await ledger.getRpcApiWebSocketHost();
    log.info(`Ledger started, RPC: ${ledgerRpcUrl}`);

    // Create Test Account
    constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

    // Create separate Web3 provider
    web3 = new Web3(ledgerRpcUrl);

    // Deploy test smart contract
    const deployOutput = await deploySmartContract();
    contractAddress = deployOutput.contractAddress;

    // Generate connector private key and certificate
    const pkiGenerator = new SelfSignedPkiGenerator();
    const pki = pkiGenerator.create("localhost");
    connectorPrivKeyValue = pki.privateKeyPem;
    connectorCertValue = pki.certificatePem;
    const jwtAlgo = "RS512";

    const connectorConfig: any = {
      sslParam: {
        port: 0, // random port
        keyValue: connectorPrivKeyValue,
        certValue: connectorCertValue,
        jwtAlgo: jwtAlgo,
      },
      logLevel: sutLogLevel,
      ledgerUrl: ledgerRpcUrl,
    };
    const configJson = JSON.stringify(connectorConfig);
    log.debug("Connector Config:", configJson);

    log.info("Export connector config before loading the module...");
    process.env["NODE_CONFIG"] = configJson;

    // Load connector module
    connectorModule = await import("../../../main/typescript/index");

    // Run the connector
    connectorServer = await connectorModule.startGoEthereumSocketIOConnector();
    expect(connectorServer).toBeTruthy();
    const connectorAddress = connectorServer.address();
    if (!connectorAddress || typeof connectorAddress === "string") {
      throw new Error("Unexpected go-ethereum connector AddressInfo type");
    }
    log.info(
      "Go-Ethereum-SocketIO Connector started on:",
      `${connectorAddress.address}:${connectorAddress.port}`,
    );

    // Create ApiClient instance
    const apiConfigOptions = {
      validatorID: "go-eth-socketio-test",
      validatorURL: `https://localhost:${connectorAddress.port}`,
      validatorKeyValue: connectorCertValue,
      logLevel: sutLogLevel,
      maxCounterRequestID: 1000,
      syncFunctionTimeoutMillisecond: syncReqTimeout,
      socketOptions: {
        rejectUnauthorized: false,
        reconnection: false,
        timeout: syncReqTimeout * 2,
      },
    };
    log.debug("ApiClient config:", apiConfigOptions);
    apiClient = new SocketIOApiClient(apiConfigOptions);
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (connectorModule) {
      connectorModule.shutdown();
    }

    if (apiClient) {
      log.info("Close ApiClient connection...");
      apiClient.close();
    }

    if (connectorServer) {
      log.info("Stop the fabric connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    if (ledger) {
      log.info("Stop the ethereum ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    // SocketIOApiClient has timeout running for each request which is not cancellable at the moment.
    // Wait timeout amount of seconds to make sure all handles are closed.
    await new Promise((resolve) => setTimeout(resolve, syncReqTimeout));

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Simple test to see if test ethereum ledger is running correctly.
   * Doesn't use apiClient or validator.
   */
  test("Sanity check ledger connection", async () => {
    const balance = await web3.eth.getBalance(constTestAcc.address);
    expect(balance).toBeTruthy();
    expect(balance).toEqual(constTestAccBalance.toString());
  });

  test("getBlock returns valid block data for different methods", async () => {
    const getBlock = async (param: string | number) => {
      const method = { type: "function", command: "getBlock" };
      const args = { args: [param] };
      const response = await apiClient.sendSyncRequest({}, method, args);
      expect(response).toBeTruthy();
      return response;
    };

    const latestBlock = await getBlock("latest");
    expect(latestBlock.status).toEqual(200);
    const { data: blockDataByHash } = await getBlock(
      latestBlock.data.blockData.hash,
    );
    expect(blockDataByHash.blockData.hash).toEqual(
      latestBlock.data.blockData.hash,
    );
    const { data: blockDataByNumber } = await getBlock(
      latestBlock.data.blockData.number,
    );
    expect(blockDataByNumber.blockData.hash).toEqual(
      blockDataByHash.blockData.hash,
    );

    // Assert transaction data is not returned
    const { blockNumber } = await deploySmartContract();
    const blockWithTx = await getBlock(blockNumber);
    const firstTx = blockWithTx.data.blockData.transactions[0];
    expect(firstTx).toBeTruthy();
    // Only string hashes are returned when flag is false
    expect(typeof firstTx).toEqual("string");
  });

  test("getBlock returns transaction data when requested", async () => {
    const method = { type: "function", command: "getBlock" };
    const { blockNumber } = await deploySmartContract();
    const args = { args: [blockNumber, true] };

    const response = await apiClient.sendSyncRequest({}, method, args);

    // Assert correct response
    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);

    // Assert valid block data
    const block = response.data.blockData;
    expect(block).toBeTruthy();
    expect(block.hash).toBeTruthy();

    // Assert transaction data was returned as requested
    expect(block.transactions.length).toBeGreaterThan(0);
    const firstTx = block.transactions[0];
    expect(firstTx).toBeTruthy();
    expect(firstTx.hash).toBeTruthy();
  });

  test("Function getTransactionReceipt returns transaction receipt of given transaction", async () => {
    async function getTransactionHash() {
      const fromAccInitBalance = 1500;
      const toAccInitBalance = 1500;
      const transferAmount = 500;
      //creating two accounts to perform transaction on them
      const fromAddress = await ledger.createEthTestAccount(fromAccInitBalance);
      const toAcc = await ledger.createEthTestAccount(toAccInitBalance);
      // adding account using a private key to the wallet
      web3.eth.accounts.wallet.add(fromAddress.privateKey);

      const signedTx = await fromAddress.signTransaction({
        from: fromAddress.address,
        to: toAcc.address,
        value: transferAmount,
        gas: 1000000,
      });
      const method = { type: "function", command: "sendRawTransaction" };
      const args = { args: [{ serializedTx: signedTx.rawTransaction }] };
      // transfering funds to trigger transaction
      const response = await apiClient.sendSyncRequest({}, method, args);
      // returning only transaction hash
      return response.data.txid;
    }

    const transactionHash = await getTransactionHash();
    const method = { type: "function", command: "getTransactionReceipt" };
    const args = { args: [transactionHash] };

    const response = await apiClient.sendSyncRequest({}, method, args);
    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data.txReceipt.transactionHash).toEqual(transactionHash);
  });

  /**
   * Test ServerPlugin getNumericBalance function.
   */
  test("Function getNumericBalance returns const account balance", async () => {
    const method = { type: "function", command: "getNumericBalance" };
    const argsParam = {
      args: [constTestAcc.address],
    };

    const response = await apiClient.sendSyncRequest({}, method, argsParam);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.amount).toEqual(constTestAccBalance);
  });

  /**
   * Test ServerPlugin transferNumericAsset function.
   * @deprecated - Not usable, can't unlock account remotely at the moment.
   */
  test.skip("Function transferNumericAsset transfers asset between two accounts", async () => {
    // Setup Accounts
    const fromAccInitBalance = 1000;
    const toAccInitBalance = 1000;
    const transferAmount = 500;
    const fromAcc = await ledger.createEthTestAccount(fromAccInitBalance);
    const toAcc = await ledger.createEthTestAccount(toAccInitBalance);

    const method = { type: "function", command: "transferNumericAsset" };
    const argsParam = {
      args: [
        {
          fromAddress: fromAcc.address,
          toAddress: toAcc.address,
          amount: transferAmount,
        },
      ],
    };

    const response = await apiClient.sendSyncRequest({}, method, argsParam);

    expect(response).toBeTruthy();
  });

  /**
   * Test ServerPlugin getNonce function.
   */
  test("Function getNonce returns const account nonce which should be 0", async () => {
    const method = { type: "function", command: "getNonce" };
    const args = { args: { args: [constTestAcc.address] } };

    const response = await apiClient.sendSyncRequest({}, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data.nonce).toEqual(0);
    expect(response.data.nonceHex).toEqual("0x0");
  });

  /**
   * Test ServerPlugin toHex function.
   */
  test("Function toHex returns converted value", async () => {
    const value = 7365235;
    const method = { type: "function", command: "toHex" };
    const args = { args: { args: [value] } };

    const response = await apiClient.sendSyncRequest({}, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data.hexStr).toEqual("0x" + value.toString(16));
  });

  /**
   * Test ServerPlugin sendRawTransaction function.
   */
  test("Function sendRawTransaction registers new transfer transaction", async () => {
    // Setup Accounts
    const fromAccInitBalance = 1000;
    const toAccInitBalance = 1000;
    const transferAmount = 500;
    const fromAcc = await ledger.createEthTestAccount(fromAccInitBalance);
    const toAcc = await ledger.createEthTestAccount(toAccInitBalance);

    const signedTx = await fromAcc.signTransaction({
      from: fromAcc.address,
      to: toAcc.address,
      value: transferAmount,
      gas: 1000000,
    });
    expect(signedTx).toBeTruthy();

    const method = { type: "function", command: "sendRawTransaction" };
    const args = { args: [{ serializedTx: signedTx.rawTransaction }] };

    const response = await apiClient.sendSyncRequest({}, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data.txid.length).toBeGreaterThan(0);
    expect(response.data.txid).toStartWith("0x");
  });

  /**
   * Test ServerPlugin web3Eth function.
   */
  test("Function web3Eth returns results of web3.eth.getBalance", async () => {
    const method = { type: "web3Eth", command: "getBalance" };
    const args = { args: [constTestAcc.address] };

    const response = await apiClient.sendSyncRequest({}, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data).toEqual(constTestAccBalance.toString());
  });

  /**
   * Test ServerPlugin web3Eth method checking.
   */
  test("Function web3Eth returns error for non existant function", async () => {
    const method = { type: "web3Eth", command: "foo" };
    const args = {};

    const response = await apiClient.sendSyncRequest({}, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(504);
    expect(response.errorDetail).toBeTruthy();
  });

  /**
   * Test ServerPlugin contract function.
   */
  test("Calling pure smart contract method works", async () => {
    const contract = {
      abi: HelloWorldContractJson.abi,
      address: contractAddress,
    };
    const method = { type: "contract", command: "sayHello", function: "call" };
    const args = { args: [] };

    const response = await apiClient.sendSyncRequest(contract, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data).toEqual("Hello World!");
  });

  /**
   * Test ServerPlugin contract method checking.
   */
  test("Calling contract returns error for non existant contract method", async () => {
    const contract = {
      abi: HelloWorldContractJson.abi,
      address: contractAddress,
    };
    const method = { type: "contract", command: "foo", function: "call" };
    const args = { args: [] };

    const response = await apiClient.sendSyncRequest(contract, method, args);

    expect(response).toBeTruthy();
    expect(response.status).toEqual(504);
    expect(response.errorDetail).toBeTruthy();
  });

  /**
   * Test ServerMonitorPlugin startMonitor/stopMonitor functions.
   */
  test(
    "Monitoring returns new block",
    async () => {
      // Create monitoring promise and subscription
      let monitorSub: any;
      const newBlockPromise = new Promise<any>((resolve, reject) => {
        monitorSub = apiClient.watchBlocksV1().subscribe({
          next: (block) => resolve(block),
          error: (err) => reject(err),
          complete: () =>
            reject("Unexpected watchBlocksV1 completion - reject."),
        });
      });

      try {
        // Repeat deploySmartContract until block was received
        while (true) {
          const deployPromise = deploySmartContract();
          const resolvedValue = await Promise.race([
            newBlockPromise,
            deployPromise,
          ]);
          log.debug("Monitor: resolvedValue", resolvedValue);
          if (resolvedValue && resolvedValue.blockData) {
            log.info("Resolved watchBlock promise");
            expect(resolvedValue.status).toEqual(200);
            expect(resolvedValue.blockData.number).toBeGreaterThan(1);
            expect(resolvedValue.blockData.transactions.length).toBeGreaterThan(
              0,
            );
            break;
          }
          // Sleep 1 second and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        throw error;
      } finally {
        if (monitorSub) {
          monitorSub.unsubscribe();
        } else {
          log.warn("monitorSub was not valid, could not unsubscribe");
        }
      }
    },
    testTimeout,
  );
});
