/**
 * Functional test of basic operations on ethereum persistence plugin (packages/cactus-plugin-persistence-ethereum).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60 * 3; // 3 minutes timeout for setup
const testTimeout = 1000 * 60 * 5; // 5 minutes timeout for some async tests

// Token details (read from contract)
const erc20TokenName = "TestERC20";
const erc20TokenSymbol = "T20";
const erc20TokenSupply = 1000;
const erc721TokenName = "TestErc721Token";
const erc721TokenSymbol = "T721";

// Geth environment
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  GethTestLedger,
  WHALE_ACCOUNT_PRIVATE_KEY,
} from "@hyperledger/cactus-test-geth-ledger";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  EthereumApiClient,
  PluginLedgerConnectorEthereum,
  WatchBlocksV1BlockData,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import express from "express";
import bodyParser from "body-parser";
import { Server as SocketIoServer } from "socket.io";
import { v4 as uuidV4 } from "uuid";
import Web3, {
  ContractAbi,
  FMT_BYTES,
  FMT_NUMBER,
  TransactionReceipt,
  Web3BaseWalletAccount,
} from "web3";
import { Web3Account } from "web3-eth-accounts";
import { checkAddressCheckSum } from "web3-validator";

import DatabaseClient from "../../../main/typescript/db-client/db-client";
jest.mock("../../../main/typescript/db-client/db-client");
const DatabaseClientMock = DatabaseClient as unknown as jest.Mock;
import { PluginPersistenceEthereum } from "../../../main/typescript";
import TestERC20ContractJson from "../../solidity/TestERC20.json";
import TestERC721ContractJson from "../../solidity/TestERC721.json";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-ethereum-functional.test",
  level: testLogLevel,
});

describe("Ethereum persistence plugin tests", () => {
  let ledger: GethTestLedger;
  let web3: Web3;
  let constTestAcc: Web3Account;
  const constTestAccBalance = 2 * 10e18;
  let instanceId: string;
  let persistence: PluginPersistenceEthereum;
  let dbClientInstance: any;
  let defaultAccountAddress: string;
  let erc20ContractCreationReceipt: Required<TransactionReceipt>;
  let erc721ContractCreationReceipt: Required<TransactionReceipt>;

  /**
   * Replace bigint to print web3js outputs in test.
   */
  function stringifyBigIntReplacer(
    _key: string,
    value: bigint | unknown,
  ): string | unknown {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }

  const expressAppConnector = express();
  expressAppConnector.use(bodyParser.json({ limit: "250mb" }));
  expressAppConnector.set("json replacer", stringifyBigIntReplacer);
  const connectorServer = http.createServer(expressAppConnector);
  const connectorWsApi = new SocketIoServer(connectorServer, {
    path: Constants.SocketIoConnectionPathV1,
  });
  let connector: PluginLedgerConnectorEthereum;

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  async function deploySmartContract(
    abi: ContractAbi,
    bytecode: string,
    args?: unknown[],
  ): Promise<Required<TransactionReceipt>> {
    try {
      const txReceipt = await ledger.deployContract(abi, "0x" + bytecode, args);
      log.debug("deploySmartContract txReceipt:", txReceipt);
      expect(txReceipt.contractAddress).toBeTruthy();
      expect(Number(txReceipt.status)).toEqual(1);
      expect(txReceipt.blockHash).toBeTruthy();
      log.debug(
        "Deployed test smart contract, TX on block number",
        txReceipt.blockNumber,
      );
      // Force response without optional fields
      return txReceipt as Required<TransactionReceipt>;
    } catch (error) {
      log.error("deploySmartContract ERROR", error);
      throw error;
    }
  }

  async function mintErc721Token(
    targetAddress: string,
    tokenId: number,
  ): Promise<unknown> {
    try {
      log.info(
        `Mint ERC721 token ID ${tokenId} for address ${targetAddress} by ${defaultAccountAddress}`,
      );

      const tokenContract = new web3.eth.Contract(
        TestERC721ContractJson.abi,
        erc721ContractCreationReceipt.contractAddress,
      );

      const mintResponse = await (tokenContract.methods as any)
        .safeMint(targetAddress, tokenId)
        .send({
          from: defaultAccountAddress,
          gas: 8000000,
        });
      log.debug("mintErc721Token mintResponse:", mintResponse);
      expect(mintResponse).toBeTruthy();
      expect(Number(mintResponse.status)).toEqual(1);

      return mintResponse;
    } catch (error) {
      log.error("mintErc721Token ERROR", error);
      throw error;
    }
  }

  /**
   * For some reasons Contract doesn't detect additional (non whale) identities even if they are in web3js wallet.
   * Because of that we sign and send transaction manually.
   */
  async function transferErc721Token(
    sourceAddress: string,
    targetAddress: string,
    tokenId: number,
  ): Promise<unknown> {
    try {
      log.info(
        `Transfer ERC721 with ID ${tokenId} from ${sourceAddress} to ${targetAddress}`,
      );

      const tokenContract = new web3.eth.Contract(
        TestERC721ContractJson.abi,
        erc721ContractCreationReceipt.contractAddress,
      );
      const methodAbi = await (tokenContract.methods as any)
        .transferFrom(sourceAddress, targetAddress, tokenId)
        .encodeABI();

      const srcAccount = web3.eth.accounts.wallet.get(
        sourceAddress,
      ) as Web3BaseWalletAccount;
      const signedTx = await srcAccount.signTransaction({
        from: sourceAddress,
        to: erc721ContractCreationReceipt.contractAddress,
        data: methodAbi,
        gasPrice: await web3.eth.getGasPrice(),
        gasLimit: 8000000,
      });

      if (!signedTx.rawTransaction) {
        throw new Error(`Signing transaction failed, reason unknown.`);
      }

      const transferResponse = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction,
      );
      log.debug("transferErc721Token transferResponse:", transferResponse);
      expect(transferResponse).toBeTruthy();
      expect(Number(transferResponse.status)).toEqual(1);
      return transferResponse;
    } catch (error) {
      log.error("transferErc721Token ERROR", error);
      throw error;
    }
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
    log.info(`Start Ledger ${containerImageName}:${containerImageVersion}...`);
    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ledger.start();
    const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    const rpcApiWsHost = await ledger.getRpcApiWebSocketHost();
    log.info(`Ledger started, RPC: ${rpcApiHttpHost} WS: ${rpcApiWsHost}`);

    // Create Test Account
    constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

    // Create Web3 provider for testing
    web3 = new Web3(rpcApiHttpHost);
    const account = web3.eth.accounts.privateKeyToAccount(
      "0x" + WHALE_ACCOUNT_PRIVATE_KEY,
    );
    web3.eth.accounts.wallet.add(constTestAcc);
    web3.eth.accounts.wallet.add(account);
    defaultAccountAddress = account.address;

    const addressInfo = (await Servers.listen({
      hostname: "127.0.0.1",
      port: 0,
      server: connectorServer,
    })) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      backend: new Map([]),
      logLevel: testLogLevel,
    });
    connector = new PluginLedgerConnectorEthereum({
      instanceId: uuidV4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel: sutLogLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressAppConnector, connectorWsApi);

    const apiConfig = new Configuration({ basePath: apiHost });
    const apiClient = new EthereumApiClient(apiConfig);

    // Create Ethereum persistence plugin
    instanceId = "functional-test";
    DatabaseClientMock.mockClear();
    persistence = new PluginPersistenceEthereum({
      apiClient,
      logLevel: sutLogLevel,
      instanceId,
      connectionString: "db-is-mocked",
    });
    expect(DatabaseClientMock).toHaveBeenCalledTimes(1);
    dbClientInstance = DatabaseClientMock.mock.instances[0];
    expect(dbClientInstance).toBeTruthy();
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (persistence) {
      log.info("Stop persistence plugin...");
      await persistence.shutdown();
    }

    if (connectorServer) {
      log.info("Stop connector http servers...");
      await Servers.shutdown(connectorServer);
    }

    if (connector) {
      log.info("Stop the connector...");
      await connector.shutdown();
    }

    if (ledger) {
      log.info("Stop ethereum ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

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
    expect(balance.toString()).toEqual(constTestAccBalance.toString());
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
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        TestERC20ContractJson.abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        TestERC721ContractJson.abi,
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
      expect(status.webServicesRegistered).toBeFalse();
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
      expect(checkAddressCheckSum(token.address)).toBeTrue();
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
      expect(checkAddressCheckSum(token.address)).toBeTrue();
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
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        TestERC20ContractJson.abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        TestERC721ContractJson.abi,
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
      const erc20Bytecode = TestERC20ContractJson.data.bytecode.object;
      erc20ContractCreationReceipt = await deploySmartContract(
        TestERC20ContractJson.abi,
        erc20Bytecode,
        [erc20TokenSupply],
      );
      log.info(
        "ERC20 deployed contract address:",
        erc20ContractCreationReceipt.contractAddress,
      );

      const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
      erc721ContractCreationReceipt = await deploySmartContract(
        TestERC721ContractJson.abi,
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
        {
          number: FMT_NUMBER.STR,
          bytes: FMT_BYTES.HEX,
        },
      );

      // Parse block data
      await persistence.parseAndStoreBlockData(
        mintTxBlock as WatchBlocksV1BlockData,
      );

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
        {
          number: FMT_NUMBER.STR,
          bytes: FMT_BYTES.HEX,
        },
      );

      // Parse block data
      await persistence.parseAndStoreBlockData(
        transferTxBlock as WatchBlocksV1BlockData,
      );

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
        (
          dbClientInstance.getMissingBlocksInRange as jest.Mock
        ).mockImplementation(async () => {
          while (!isStatusChecked) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          return [];
        });

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
          (
            dbClientInstance.getMissingBlocksInRange as jest.Mock
          ).mockReturnValue([]);

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
