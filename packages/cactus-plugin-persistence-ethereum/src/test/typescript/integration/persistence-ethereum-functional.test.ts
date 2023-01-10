/**
 * Functional test of basic operations on ethereum persistence plugin (packages/cactus-plugin-persistence-ethereum).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup
const testTimeout = 1000 * 60 * 3; // 3 minutes timeout for some async tests

// Ledger settings
const imageName = "openethereum/openethereum";
const imageVersion = "v3.3.5";

// Token details (read from contract)
const erc20TokenName = "TestERC20";
const erc20TokenSymbol = "T20";
const erc20TokenSupply = 1000;
const erc721TokenName = "TestErc721Token";
const erc721TokenSymbol = "T721";

// ApiClient settings
const syncReqTimeout = 1000 * 5; // 5 seconds

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import {
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
  SelfSignedPkiGenerator,
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
} from "@hyperledger/cactus-test-tooling";
import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import DatabaseClient from "../../../main/typescript/db-client/db-client";
jest.mock("../../../main/typescript/db-client/db-client");
const DatabaseClientMock = (DatabaseClient as unknown) as jest.Mock;
import { PluginPersistenceEthereum } from "../../../main/typescript";
import TestERC20ContractJson from "../../solidity/TestERC20.json";
import TestERC721ContractJson from "../../solidity/TestERC721.json";

import "jest-extended";
import Web3 from "web3";
import express from "express";
import { Server as HttpsServer } from "https";
import { Account, TransactionReceipt } from "web3-core";
import { AbiItem } from "web3-utils";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-ethereum-functional.test",
  level: testLogLevel,
});

describe("Ethereum persistence plugin tests", () => {
  let ledger: OpenEthereumTestLedger;
  let web3: Web3;
  let connectorCertValue: string;
  let connectorPrivKeyValue: string;
  let connectorServer: HttpsServer;
  let constTestAcc: Account;
  const constTestAccBalance = 5 * 1000000;
  let instanceId: string;
  let persistence: PluginPersistenceEthereum;
  let dbClientInstance: any;
  let defaultAccountAddress: string;
  let apiClient: SocketIOApiClient;
  let connectorModule: any;
  let erc20ContractCreationReceipt: Required<TransactionReceipt>;
  let erc721ContractCreationReceipt: Required<TransactionReceipt>;

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  async function deploySmartContract(
    abi: AbiItem | AbiItem[],
    bytecode: string,
    args?: unknown[],
  ): Promise<Required<TransactionReceipt>> {
    const txReceipt = await ledger.deployContract(abi, "0x" + bytecode, args);
    expect(txReceipt.contractAddress).toBeTruthy();
    expect(txReceipt.status).toBeTrue();
    expect(txReceipt.blockHash).toBeTruthy();
    expect(txReceipt.blockNumber).toBeGreaterThan(0);
    log.debug(
      "Deployed test smart contract, TX on block number",
      txReceipt.blockNumber,
    );
    // Force response without optional fields
    return txReceipt as Required<TransactionReceipt>;
  }

  async function mintErc721Token(
    targetAddress: string,
    tokenId: number,
  ): Promise<unknown> {
    log.info(`Mint ERC721 token ID ${tokenId} for address ${targetAddress}`);

    const tokenContract = new web3.eth.Contract(
      TestERC721ContractJson.abi as AbiItem[],
      erc721ContractCreationReceipt.contractAddress,
    );

    const mintResponse = await tokenContract.methods
      .safeMint(targetAddress, tokenId)
      .send({
        from: defaultAccountAddress,
        gas: 8000000,
      });
    log.debug("mintResponse:", mintResponse);
    expect(mintResponse).toBeTruthy();
    expect(mintResponse.status).toBeTrue();

    return mintResponse;
  }

  async function transferErc721Token(
    sourceAddress: string,
    targetAddress: string,
    tokenId: number,
  ): Promise<unknown> {
    log.info(
      `Transfer ERC721 with ID ${tokenId} from ${sourceAddress} to ${targetAddress}`,
    );

    const tokenContract = new web3.eth.Contract(
      TestERC721ContractJson.abi as AbiItem[],
      erc721ContractCreationReceipt.contractAddress,
    );

    const transferResponse = await tokenContract.methods
      .transferFrom(sourceAddress, targetAddress, tokenId)
      .send({
        from: sourceAddress,
        gas: 8000000,
      });
    log.debug("transferResponse:", transferResponse);
    expect(transferResponse).toBeTruthy();
    expect(transferResponse.status).toBeTrue();

    return transferResponse;
  }

  /**
   * Setup mocked response from the database to retrieve token metadata.
   * Should be called in each test that rely on this data.
   */
  function mockTokenMetadataResponse() {
    (dbClientInstance.getTokenMetadataERC20 as jest.Mock).mockReturnValue([
      {
        address: erc20ContractCreationReceipt.contractAddress,
        name: erc20TokenName,
        symbol: erc20TokenSymbol,
        total_supply: erc20TokenSupply,
        created_at: "2022-1-1T12:00:01Z",
      },
    ]);
    (dbClientInstance.getTokenMetadataERC721 as jest.Mock).mockReturnValue([
      {
        address: erc721ContractCreationReceipt.contractAddress,
        name: erc721TokenName,
        symbol: erc721TokenSymbol,
        created_at: "2022-1-1T12:00:01Z",
      },
    ]);
  }

  /**
   * Remove all mocks setup on the test DB Client instance.
   */
  function clearMockTokenMetadata() {
    for (const mockMethodName in dbClientInstance) {
      const mockMethod = dbClientInstance[mockMethodName];
      if ("mockClear" in mockMethod) {
        mockMethod.mockClear();
      }
    }
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Create test ledger
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

    // Create Web3 provider for testing
    web3 = new Web3();
    web3.setProvider(new Web3.providers.WebsocketProvider(ledgerRpcUrl));
    const account = web3.eth.accounts.privateKeyToAccount(
      "0x" + K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
    );
    web3.eth.accounts.wallet.add(account);
    web3.eth.accounts.wallet.add(constTestAcc);
    defaultAccountAddress = account.address;
    web3.eth.defaultAccount = defaultAccountAddress;

    // Generate connector private key and certificate
    const pkiGenerator = new SelfSignedPkiGenerator();
    const pki = pkiGenerator.create("localhost");
    connectorPrivKeyValue = pki.privateKeyPem;
    connectorCertValue = pki.certificatePem;
    const jwtAlgo = "RS512";

    // Load go-ethereum connector
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
    connectorModule = await import(
      "@hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio"
    );

    // Run the connector
    connectorServer = await connectorModule.startGoEthereumSocketIOConnector();
    expect(connectorServer).toBeTruthy();
    const connectorAddress = connectorServer.address();
    if (!connectorAddress || typeof connectorAddress === "string") {
      throw new Error("Unexpected go-ethereum connector AddressInfo type");
    }
    const connectorFullAddress = `${connectorAddress.address}:${connectorAddress.port}`;
    log.info(
      "Go-Ethereum-SocketIO Connector started on:",
      connectorFullAddress,
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

    // Create Ethereum persistence plugin
    instanceId = "functional-test";
    DatabaseClientMock.mockClear();
    persistence = new PluginPersistenceEthereum({
      apiClient,
      logLevel: testLogLevel,
      instanceId,
      connectionString: "db-is-mocked",
    });
    expect(DatabaseClientMock).toHaveBeenCalledTimes(1);
    dbClientInstance = DatabaseClientMock.mock.instances[0];
    expect(dbClientInstance).toBeTruthy();

    const expressApp = express();
    expressApp.use(express.json({ limit: "250mb" }));

    await persistence.registerWebServices(expressApp);
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (persistence) {
      await persistence.shutdown();
    }

    if (connectorModule) {
      connectorModule.shutdown();
    }

    if (connectorServer) {
      log.info("Stop the ethereum connector...");
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
    await new Promise((resolve) => setTimeout(resolve, syncReqTimeout * 2));

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  beforeEach(() => {
    clearMockTokenMetadata();
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
    expect(balance.valueOf()).toEqual(constTestAccBalance.toString());
  });

  test("Basic methods test", async () => {
    // getInstanceId()
    expect(persistence.getInstanceId()).toEqual(instanceId);

    // getPackageName()
    expect(persistence.getPackageName()).toEqual(
      "@hyperledger/cactus-plugin-persistence-ethereum",
    );

    // getOpenApiSpec()
    expect(persistence.getOpenApiSpec()).toBeTruthy();
  });

  //////////////////////////////////
  // Basic Method Tests
  //////////////////////////////////

  describe("Basic plugin method tests", () => {
    beforeAll(async () => {
      // Deploy smart contracts
      const erc20Abi = TestERC20ContractJson.abi as AbiItem[];
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        erc20Abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Abi = TestERC721ContractJson.abi as AbiItem[];
      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        erc721Abi,
        erc721Bytecode,
      );
      log.info(
        "ERC721 deployed contract address:",
        erc721ContractCreationReceipt.contractAddress,
      );
    });

    test("onPluginInit creates DB schema and fetches the monitored tokens", async () => {
      mockTokenMetadataResponse();
      await persistence.onPluginInit();

      // DB Schema initialized
      const initDBCalls = dbClientInstance.initializePlugin.mock.calls;
      expect(initDBCalls.length).toBe(1);

      // Tokens refreshed
      expect(persistence.monitoredTokens).toBeTruthy();
      expect(persistence.monitoredTokens.size).toEqual(2);
    });

    test("Initial plugin status is correct", async () => {
      mockTokenMetadataResponse();
      await persistence.onPluginInit();

      const status = persistence.getStatus();
      expect(status).toBeTruthy();
      expect(status.instanceId).toEqual(instanceId);
      expect(status.connected).toBeTrue();
      expect(status.webServicesRegistered).toBeTrue();
      expect(status.monitoredTokensCount).toEqual(2);
      expect(status.lastSeenBlock).toEqual(0);
    });

    test("Adding ERC20 tokens to the GUI test", async () => {
      await persistence.addTokenERC20(
        erc20ContractCreationReceipt.contractAddress,
      );

      // Check if DBClient was called
      const insertCalls = dbClientInstance.insertTokenMetadataERC20.mock.calls;
      expect(insertCalls.length).toBe(1);
      const insertCallArgs = insertCalls[0];

      // Check inserted token data
      const token = insertCallArgs[0];
      expect(token).toBeTruthy();
      expect(token.address.toLowerCase()).toEqual(
        erc20ContractCreationReceipt.contractAddress.toLowerCase(),
      );
      expect(web3.utils.checkAddressChecksum(token.address)).toBeTrue();
      expect(token.name).toEqual(erc20TokenName);
      expect(token.symbol).toEqual(erc20TokenSymbol);
      expect(token.total_supply).toEqual(erc20TokenSupply);
    });

    test("Adding token with invalid data throws RuntimeError", async () => {
      // Empty address
      await expect(persistence.addTokenERC20("")).toReject();

      // Invalid address
      await expect(persistence.addTokenERC20("abc")).toReject();

      // Wrong checksum address
      await expect(
        persistence.addTokenERC20("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe0"),
      ).toReject();

      // Non existing address
      await expect(
        persistence.addTokenERC20("0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5"),
      ).toReject();
    });

    test("Adding ERC721 tokens to the GUI test", async () => {
      await persistence.addTokenERC721(
        erc721ContractCreationReceipt.contractAddress,
      );

      // Check if DBClient was called
      const insertCalls = dbClientInstance.insertTokenMetadataERC721.mock.calls;
      expect(insertCalls.length).toBe(1);
      const insertCallArgs = insertCalls[0];

      // Check inserted token data
      const token = insertCallArgs[0];
      expect(token).toBeTruthy();
      expect(token.address.toLowerCase()).toEqual(
        erc721ContractCreationReceipt.contractAddress.toLowerCase(),
      );
      expect(web3.utils.checkAddressChecksum(token.address)).toBeTrue();
      expect(token.name).toEqual(erc721TokenName);
      expect(token.symbol).toEqual(erc721TokenSymbol);
    });

    test("Refresh tokens updates internal state", async () => {
      const tokens = await persistence.refreshMonitoredTokens();

      expect(tokens).toBeTruthy();
      expect(tokens.size).toEqual(2);
      const tokenAddresses = Array.from(tokens.keys());
      expect(tokenAddresses).toContain(
        web3.utils.toChecksumAddress(
          erc20ContractCreationReceipt.contractAddress,
        ),
      );
      expect(tokenAddresses).toContain(
        web3.utils.toChecksumAddress(
          erc721ContractCreationReceipt.contractAddress,
        ),
      );
      expect(tokens).toEqual(persistence.monitoredTokens);
    });
  });

  //////////////////////////////////
  // Data Synchronization Tests
  //////////////////////////////////

  describe("Data synchronization tests", () => {
    beforeEach(async () => {
      // Deploy smart contracts
      const erc20Abi = TestERC20ContractJson.abi as AbiItem[];
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        erc20Abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Abi = TestERC721ContractJson.abi as AbiItem[];
      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        erc721Abi,
        erc721Bytecode,
      );
      log.info(
        "ERC721 deployed contract address:",
        erc721ContractCreationReceipt.contractAddress,
      );

      mockTokenMetadataResponse();
    });

    test("Synchronization of ERC721 finds all issued tokens", async () => {
      expect(erc721ContractCreationReceipt.contractAddress).toBeTruthy();

      await persistence.refreshMonitoredTokens();
      // Issue three test tokens
      await mintErc721Token(constTestAcc.address, 1);
      await mintErc721Token(constTestAcc.address, 2);
      await mintErc721Token(constTestAcc.address, 3);
      log.debug("Minting test ERC721 tokens done.");

      await persistence.syncERC721Tokens();

      const upsertCalls = dbClientInstance.upsertTokenERC721.mock.calls;
      expect(upsertCalls.length).toBe(3);
      upsertCalls.forEach((callArgs: any[]) => {
        const token = callArgs[0];
        expect([1, 2, 3]).toInclude(token.token_id);
        expect(token.account_address).toBeTruthy();
        expect(token.uri).toBeTruthy();
      });
    });
  });

  //////////////////////////////////
  // Block Parsing Tests
  //////////////////////////////////

  describe("Block parsing and monitoring tests", () => {
    beforeEach(async () => {
      // Deploy smart contracts
      const erc20Abi = TestERC20ContractJson.abi as AbiItem[];
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        erc20Abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Abi = TestERC721ContractJson.abi as AbiItem[];
      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        erc721Abi,
        erc721Bytecode,
      );
      log.info(
        "ERC721 deployed contract address:",
        erc721ContractCreationReceipt.contractAddress,
      );

      mockTokenMetadataResponse();
    });

    test("Parse block with transaction of minting new token", async () => {
      await persistence.refreshMonitoredTokens();

      // Mint token to create a new block
      const targetTokenAddress = constTestAcc.address;
      const tokenId = 1;
      const mintResponse: any = await mintErc721Token(
        targetTokenAddress,
        tokenId,
      );
      expect(mintResponse.blockNumber).toBeTruthy();
      const mintTxBlock = await web3.eth.getBlock(
        mintResponse.blockNumber,
        true,
      );

      // Parse block data
      await persistence.parseAndStoreBlockData(mintTxBlock);

      // Check if DBClient was called
      const insertCalls = dbClientInstance.insertBlockData.mock.calls;
      expect(insertCalls.length).toBe(1);
      const insertCallArgs = insertCalls[0];

      // Check inserted block data
      const insertBlockData = insertCallArgs[0];
      const blockData = insertBlockData.block;
      expect(blockData).toBeTruthy();
      expect(blockData.number).toBeGreaterThan(0);
      expect(blockData.created_at).toBeTruthy();
      expect(blockData.hash).toBeTruthy();
      expect(blockData.number_of_tx).toBeGreaterThan(0);
      const blockTransactions = insertBlockData.transactions;
      expect(blockTransactions).toBeTruthy();

      // Find mint transaction by it's method signature
      const mintTransaction = blockTransactions.find(
        (tx: any) => tx.method_signature === "0xa1448194",
      );
      expect(mintTransaction).toBeTruthy();
      expect(mintTransaction.from).toBeTruthy();
      expect(mintTransaction.to).toBeTruthy();
      expect(mintTransaction.token_transfers.length).toEqual(1);
      const mintTransactionTransfer = mintTransaction.token_transfers[0];
      expect(mintTransactionTransfer).toBeTruthy();

      // Check token transfer
      expect(mintTransactionTransfer.sender.toLowerCase()).toEqual(
        "0x0000000000000000000000000000000000000000",
      );
      expect(mintTransactionTransfer.recipient.toLowerCase()).toEqual(
        targetTokenAddress.toLowerCase(),
      );
      expect(mintTransactionTransfer.value).toEqual(tokenId.toString());
    });

    test("Parse block with transaction of token transfer", async () => {
      await persistence.refreshMonitoredTokens();

      // Mint and transfer token to create a new block
      await mintErc721Token(constTestAcc.address, 1);
      const sourceAccount = constTestAcc.address;
      const targetAccount = defaultAccountAddress;
      const tokenId = 1;
      const tranferResponse: any = await transferErc721Token(
        sourceAccount,
        targetAccount,
        tokenId,
      );
      expect(tranferResponse.blockNumber).toBeTruthy();
      const transferTxBlock = await web3.eth.getBlock(
        tranferResponse.blockNumber,
        true,
      );

      // Parse block data
      await persistence.parseAndStoreBlockData(transferTxBlock);

      // Check if DBClient was called
      const insertCalls = dbClientInstance.insertBlockData.mock.calls;
      expect(insertCalls.length).toBe(1);
      const insertCallArgs = insertCalls[0];

      // Check inserted block data
      const insertBlockData = insertCallArgs[0];

      // Find transfer transaction by it's method signature
      const transferTransaction = insertBlockData.transactions.find(
        (tx: any) => tx.method_signature === "0x23b872dd",
      );
      expect(transferTransaction).toBeTruthy();
      expect(transferTransaction.method_name).toEqual("transferFrom");
      expect(transferTransaction.token_transfers.length).toEqual(1);
      const txTransfer = transferTransaction.token_transfers[0];

      // Check token transfer
      expect(txTransfer.sender.toLowerCase()).toEqual(
        sourceAccount.toLowerCase(),
      );
      expect(txTransfer.recipient.toLowerCase()).toEqual(
        targetAccount.toLowerCase(),
      );
      expect(txTransfer.value).toEqual(tokenId.toString());
    });

    test(
      "Calling syncAll adds new tracked operation that is reported in plugin status",
      async () => {
        // Freeze on getMissingBlocksInRange method until status is checked
        let isStatusChecked = false;
        (dbClientInstance.getMissingBlocksInRange as jest.Mock).mockImplementation(
          async () => {
            while (!isStatusChecked) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            return [];
          },
        );

        const syncAllPromise = persistence.syncAll();

        try {
          // Wait for method to be called
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Check if syncAll operation is present
          const status = persistence.getStatus();
          expect(status).toBeTruthy();
          expect(status.operationsRunning.length).toEqual(1);
          const trackedOperation = status.operationsRunning[0];
          expect(trackedOperation.startAt).toBeTruthy();
          expect(trackedOperation.operation).toEqual("syncAll");
        } finally {
          // Always finish the syncAll call
          isStatusChecked = true;
          await syncAllPromise;
        }

        const statusAfterFinish = persistence.getStatus();
        expect(statusAfterFinish).toBeTruthy();
        expect(statusAfterFinish.operationsRunning.length).toEqual(0);
      },
      testTimeout,
    );

    test(
      "Block monitoring detects new changes correctly.",
      async () => {
        await persistence.refreshMonitoredTokens();

        const insertBlockPromise = new Promise<any>((resolve, reject) => {
          (dbClientInstance.getMissingBlocksInRange as jest.Mock).mockReturnValue(
            [],
          );

          (dbClientInstance.insertBlockData as jest.Mock).mockImplementation(
            (blockData) => resolve(blockData),
          );

          persistence.startMonitor((err) => {
            reject(err);
          });
          log.debug("Persistence plugin block monitoring started.");
        });

        // Wait for monitor to get started
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Trigger new block
        await mintErc721Token(constTestAcc.address, 1);
        log.debug("New token has been minted to trigger tx");

        const blockData = await insertBlockPromise;
        log.debug("blockData was inserted:", blockData);
        expect(blockData.block).toBeTruthy();

        // Check if status reports that monitor is running
        const status = persistence.getStatus();
        expect(status).toBeTruthy();
        expect(status.monitorRunning).toBeTrue();

        // Check if status reports monitor is not running after stopMonitor is called
        persistence.stopMonitor();
        const statusAfterStop = persistence.getStatus();
        expect(statusAfterStop).toBeTruthy();
        expect(statusAfterStop.monitorRunning).toBeFalse();
      },
      testTimeout,
    );
  });
});
