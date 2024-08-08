/**
 * Main logic of persistence plugin for ethereum data.
 */

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import {
  EthereumApiClient,
  WatchBlocksV1BlockData,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

import ERC20 from "../json/contract-abi/ERC20.json";
import TokenClientERC20 from "./token-client/token-client-erc20";
import ERC721 from "../json/contract-abi/ERC721.json";
import TokenClientERC721 from "./token-client/token-client-erc721";
import OAS from "../json/openapi.json";
import { getRuntimeErrorCause, normalizeAddress } from "./utils";
import { StatusEndpointV1 } from "./web-services/status-endpoint-v1";
import PostgresDatabaseClient, {
  BlockDataTransferInput,
  BlockDataTransactionInput,
} from "./db-client/db-client";
import {
  MonitoredToken,
  StatusResponseV1,
  TokenTypeV1,
  TrackedOperationV1,
} from "./generated/openapi/typescript-axios";
import { RuntimeError } from "run-time-error-cjs";
import { Interface as EthersInterface } from "@ethersproject/abi";
import { Mutex } from "async-mutex";
import { v4 as uuidv4 } from "uuid";
import type { TransactionInfo, TransactionReceipt } from "web3";
import type { Express } from "express";
import type { Subscription } from "rxjs";

/**
 * Constructor parameter for Ethereum persistence plugin.
 */
export interface IPluginPersistenceEthereumOptions
  extends ICactusPluginOptions {
  apiClient: EthereumApiClient;
  connectionString: string;
  logLevel: LogLevelDesc;
}

/**
 * Cactus persistence plugin for ethereum ledgers.
 * Remember to call `onPluginInit()` before using any of the plugin method, and `shutdown()` when closing the app.
 */
export class PluginPersistenceEthereum
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "PluginPersistenceEthereum";
  public monitoredTokens = new Map<string, MonitoredToken>();

  private readonly instanceId: string;
  private apiClient: EthereumApiClient;
  private watchBlocksSubscription: Subscription | undefined;
  private dbClient: PostgresDatabaseClient;
  private log: Logger;
  private isConnected = false;
  private isWebServicesRegistered = false;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private ethersInterfaceERC721 = new EthersInterface(ERC721.abi);
  private ethersInterfaceERC20 = new EthersInterface(ERC20.abi);
  private pushBlockMutex = new Mutex();
  private syncBlocksMutex = new Mutex();
  private syncTokenBalancesMutex = new Mutex();
  private failedBlocks = new Set<number>();
  private lastSeenBlock = 0;
  private trackedOperations = new Map<string, TrackedOperationV1>();

  constructor(public readonly options: IPluginPersistenceEthereumOptions) {
    const fnTag = `${PluginPersistenceEthereum.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.apiClient, `${fnTag} options.apiClient`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.connectionString,
      `${fnTag} options.connectionString`,
    );

    const level = this.options.logLevel || "INFO";
    const label = PluginPersistenceEthereum.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.apiClient = options.apiClient;

    this.dbClient = new PostgresDatabaseClient({
      connectionString: options.connectionString,
      logLevel: level,
    });
  }

  /**
   * True if all blocks were synchronized successfully, false otherwise.
   */
  private get isLedgerInSync(): boolean {
    return this.failedBlocks.size === 0;
  }

  /**
   * Add new plugin operation that will show up in status report.
   * Remember to remove this operation with `removeTrackedOperation` after it's finished.
   *
   * @param id unique id of the operation (use `uuid`)
   * @param operation operation name to show up in the status report
   */
  private addTrackedOperation(id: string, operation: string): void {
    if (this.trackedOperations.has(id)) {
      this.log.error(`Operation with ID ${id} is already tracked!`);
      return;
    }

    this.trackedOperations.set(id, {
      startAt: Date.now().toString(),
      operation: operation,
    });
  }

  /**
   * Remove operation added with `addTrackedOperation`.
   * If called with non-existent operation - nothing happens.
   *
   * @param id unique id of the operation (use `uuid`)
   */
  private removeTrackedOperation(id: string): void {
    this.trackedOperations.delete(id);
  }

  /**
   * Get `Ethers` instance of `Interface` class for specified token type.
   *
   * @param tokenType type of the token (ERC20, ERC721, etc...)
   * @returns ethers.js `Interface` object
   */
  private getEthersTokenInterface(tokenType: TokenTypeV1): EthersInterface {
    switch (tokenType) {
      case TokenTypeV1.ERC20:
        return this.ethersInterfaceERC20;
      case TokenTypeV1.ERC721:
        return this.ethersInterfaceERC721;
      default:
        const unknownTokenType: never = tokenType;
        throw new Error(
          `getEthersTokenInterface(): Unknown token type: ${unknownTokenType}`,
        );
    }
  }

  /**
   * Get transaction receipt from the ledger using the cactus connector.
   *
   * @param txId hash of the transaction to get.
   * @returns `web3.js` transaction receipt object.
   */
  private async getTransactionReceipt(
    txId: string,
  ): Promise<TransactionReceipt> {
    const response = await this.apiClient.invokeWeb3EthMethodV1({
      methodName: "getTransactionReceipt",
      params: [txId],
    });

    if (response && response.status === 200) {
      return response.data.data;
    } else {
      throw new Error(
        `Could not get transaction receipt for transaction ID ${txId}`,
      );
    }
  }

  /**
   * Get block data from the ledger using the cactus connector.
   *
   * @todo Add json-rpc proxy to connector and use it instead of invokeWeb3EthMethodV1
   *
   * @param blockNumber number, hash or keyword description of a block to read.
   * @param returnTransactionObjects boolean flag to return full transaction object or just the hashes.
   * @returns block data (with transactions if `returnTransactionObjects` was true)
   */
  private async getBlockFromLedger(
    blockNumber: number | string,
    returnTransactionObjects = false,
  ): Promise<WatchBlocksV1BlockData> {
    const response = await this.apiClient.invokeWeb3EthMethodV1({
      methodName: "getBlock",
      params: [
        blockNumber,
        returnTransactionObjects,
        {
          number: "NUMBER_STR",
          bytes: "BYTES_HEX",
        },
      ],
    });

    if (response && response.status === 200) {
      return response.data.data;
    } else {
      throw new Error(
        `Could not get block with number ${blockNumber} from the ledger`,
      );
    }
  }

  /**
   * Check if token with specified ID exist on contract connected to `tokenClient`.
   * If so, insert/update it's entry in the database.
   *
   * @param tokenId numeric ID of the issued token.
   * @param tokenClient client with token contract details.
   * @returns `true` if token ID was valid, `false` otherwise.
   */
  private async syncSingleERC721Token(
    tokenId: number,
    tokenClient: TokenClientERC721,
  ): Promise<boolean> {
    let ownerAddress;
    try {
      ownerAddress = await tokenClient.ownerOf(tokenId);
    } catch (error: unknown) {
      this.log.debug(
        "Calling ownerOf() failed, assuming all tokens are synchronized - stop.",
      );
      return false;
    }

    if (parseInt(ownerAddress, 16) === 0) {
      this.log.debug(`Found token ID ${tokenId} without the owner - stop.`);
      return false;
    }

    try {
      // Add token if not present yet
      const checkedOwnerAddress = normalizeAddress(ownerAddress);
      const tokenUri = await tokenClient.tokenURI(tokenId);

      await this.dbClient.upsertTokenERC721({
        account_address: checkedOwnerAddress,
        token_address: normalizeAddress(tokenClient.address),
        uri: tokenUri,
        token_id: tokenId,
      });
    } catch (err) {
      this.log.error(`Could not store issued ERC721 token: ID ${tokenId}`, err);
      // We return true since failure here means that there might be more tokens to synchronize
    }

    return true;
  }

  /**
   * Synchronize all the issued tokens for specified ERC721 contract.
   * Method assumes the token ID are incrementing (starting from 1).
   *
   * @param contractAddress ERC721 token contract address.
   * @returns number of token synchronized.
   */
  private async syncERC721TokensForContract(
    contractAddress: string,
  ): Promise<number> {
    const tokenClient = new TokenClientERC721(this.apiClient, contractAddress);

    let tokenId = 1;
    while (await this.syncSingleERC721Token(tokenId, tokenClient)) {
      tokenId++;
    }

    return tokenId - 1;
  }

  /**
   * Parse a new block received from the connector, parse it and push to the database.
   * Gap between last seen block and current one is checked and missing blocks are filled when necessary.
   * Token balances are updated in the end (if the database is in sync).
   *
   * @param block `web3.js` block data object.
   */
  private async pushNewBlock(block: WatchBlocksV1BlockData): Promise<void> {
    // Push one block at a time, in case previous block is still being processed
    // (example: filling the gap takes longer than expected)
    await this.pushBlockMutex.runExclusive(async () => {
      const previousBlockNumber = this.lastSeenBlock;
      const blockNumber = parseInt(block.number, 10);
      try {
        this.lastSeenBlock = blockNumber;
        await this.parseAndStoreBlockData(block);
      } catch (error: unknown) {
        this.log.warn(
          `Could not add new block #${block.number}, error:`,
          error,
        );
        this.addFailedBlock(blockNumber);
      }

      const isGap = blockNumber - previousBlockNumber > 1;
      if (isGap) {
        const gapFrom = previousBlockNumber + 1;
        const gapTo = blockNumber - 1;
        try {
          await this.syncBlocks(gapFrom, gapTo);
        } catch (error: unknown) {
          this.log.warn(
            `Could not sync blocks in a gap between #${gapFrom} and #${gapTo}, error:`,
            error,
          );
          for (let i = gapFrom; i < gapTo; i++) {
            this.addFailedBlock(i);
          }
        }
      }

      try {
        await this.syncTokenBalances(previousBlockNumber);
      } catch (error: unknown) {
        this.log.warn(
          `Could not sync token balances after adding block #${block.number}, error:`,
          error,
        );
        return;
      }
    });
  }

  /**
   * Try to decode method name using known token contract definition.
   * If the name could not be decoded, empty string is returned (`""`)
   *
   * @param tx `web.js` transaction object.
   * @param tokenType type of the token we expect (ERC20, ERC721, etc...)
   * @returns name of the method or an empty string
   */
  private decodeTokenMethodName(
    tx: TransactionInfo,
    tokenType: TokenTypeV1,
  ): string {
    try {
      const tokenInterface = this.getEthersTokenInterface(tokenType);
      const decodedTx = tokenInterface.parseTransaction({
        data: tx.input as string,
        value: tx.value,
      });
      return decodedTx.name;
    } catch {
      this.log.debug("Could not decode transaction with token contract");
    }

    return "";
  }

  /**
   * Decode any token transfers that occurred in specified transaction.
   *
   * @param txReceipt `web3.js` receipt of the transaction object.
   * @param tokenType type of the token we expect (ERC20, ERC721, etc...)
   * @returns list of detected token transfers
   */
  private decodeTokenTransfers(
    txReceipt: TransactionReceipt,
    tokenType: TokenTypeV1,
  ): BlockDataTransferInput[] {
    const tokenInterface = this.getEthersTokenInterface(tokenType);

    const transferLogs = txReceipt.logs
      .map((l) =>
        tokenInterface.parseLog({
          data: l.data as string,
          topics: l.topics as string[],
        }),
      )
      .filter((ld) => ld.name === "Transfer");

    return transferLogs.map((t) => {
      switch (tokenType) {
        case TokenTypeV1.ERC20:
          return {
            sender: normalizeAddress(t.args["from"]),
            recipient: normalizeAddress(t.args["to"]),
            value: t.args["value"].toString(),
          };
        case TokenTypeV1.ERC721:
          return {
            sender: normalizeAddress(t.args["from"]),
            recipient: normalizeAddress(t.args["to"]),
            value: t.args["tokenId"].toString(),
          };
        default:
          const unknownTokenType: never = tokenType;
          throw new Error(
            `decodeTokenTransfers(): Unknown token type: ${unknownTokenType}`,
          );
      }
    });
  }

  /**
   * Parse single transaction and possible token transfers from a block.
   *
   * @param tx `web3.js` transaction object.
   * @returns parsed transaction data
   */
  private async parseBlockTransaction(
    tx: TransactionInfo,
  ): Promise<BlockDataTransactionInput> {
    this.log.debug("parseBlockTransaction(): Parsing ", tx.hash);

    const txReceipt = await this.getTransactionReceipt(tx.hash as string);
    let methodName = "";
    let tokenTransfers: BlockDataTransferInput[] = [];

    const targetTokenMetadata = this.monitoredTokens.get(
      normalizeAddress(txReceipt.to),
    );
    if (targetTokenMetadata) {
      methodName = this.decodeTokenMethodName(tx, targetTokenMetadata.type);
      tokenTransfers = this.decodeTokenTransfers(
        txReceipt,
        targetTokenMetadata.type,
      );
    }

    return {
      hash: tx.hash as string,
      index: parseInt(txReceipt.transactionIndex as string, 10),
      from: normalizeAddress(tx.from),
      to: normalizeAddress(tx.to ?? undefined),
      eth_value: parseInt(tx.value as string, 10),
      method_signature: (tx.input as string).slice(0, 10),
      method_name: methodName,
      token_transfers: tokenTransfers,
    };
  }

  /**
   * Update the token balance tables (starting from specified block for performance).
   * Operation will not run if ledger is out of sync (i.e. some blocks failed to be synchronized).
   * Running this method will try to push the failed blocks again first.
   *
   * @param fromBlockNumber block from which to start the token balance update.
   */
  private async syncTokenBalances(fromBlockNumber: number): Promise<void> {
    await this.syncTokenBalancesMutex.runExclusive(async () => {
      const blocksRestored = await this.syncFailedBlocks();
      const oldestBlockRestored = Math.min(...blocksRestored, fromBlockNumber);

      if (this.isLedgerInSync) {
        this.log.debug("Update token balances from block", oldestBlockRestored);
        await this.dbClient.syncTokenBalanceERC20();
        await this.dbClient.syncTokenBalanceERC721(oldestBlockRestored);
      } else {
        this.log.warn(
          "Ledger not in sync (some blocks are missing), token balance not updated!",
        );
      }
    });
  }

  /**
   * Add a block to failed blocks list.
   * This method first ensures that the block is not present in the database.
   * If it's not, new block is added to failed blocks and the plugin is out of sync.
   * Failed blocks can be retried again with `syncFailedBlocks()` method.
   *
   * @param blockNumber block number to be added to failed blocks list.
   */
  private async addFailedBlock(blockNumber: number) {
    try {
      const block = await this.dbClient.getBlock(blockNumber);

      if ((block.number as unknown as string) !== blockNumber.toString()) {
        throw new Error("Invalid response from the DB");
      }

      this.log.debug(
        `Block #${blockNumber} already present in DB - remove from the failed pool.`,
      );
      this.failedBlocks.delete(blockNumber);
    } catch (error: unknown) {
      this.log.info(
        `Block #${blockNumber} not found in the DB - add to the failed blocks pool. Message:`,
        error,
      );
      this.failedBlocks.add(blockNumber);
    }
  }

  /**
   * Synchronize blocks in specified range.
   * Only the blocks not already present in the database from specified range will be pushed.
   *
   * @warn This operation can take a long time to finish if you specify a wide range!
   *
   * @param startBlockNumber starting block number (including)
   * @param endBlockNumber ending block number (including)
   */
  private async syncBlocks(
    startBlockNumber: number,
    endBlockNumber: number,
  ): Promise<void> {
    // Only one block synchronization can run at a time to prevent data race.
    await this.syncBlocksMutex.runExclusive(async () => {
      this.log.info(
        "Synchronize blocks from",
        startBlockNumber,
        "to",
        endBlockNumber,
      );

      const missingBlockNumbers = await this.dbClient.getMissingBlocksInRange(
        startBlockNumber,
        endBlockNumber,
      );

      for (const n of missingBlockNumbers.map((r) => r.block_number)) {
        try {
          const block = await this.getBlockFromLedger(n, true);
          await this.parseAndStoreBlockData(block);
        } catch (error: unknown) {
          this.log.warn(`Could not synchronize block #${n}, error:`, error);
          this.addFailedBlock(n);
        }
      }
    });
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-persistence-ethereum`;
  }

  /**
   * Get OpenAPI definition for this plugin.
   * @returns OpenAPI spec object
   */
  public getOpenApiSpec(): unknown {
    return OAS;
  }

  /**
   * Should be called before using the plugin.
   * Connects to the database and initializes the plugin schema and status entry.
   * Fetches tokens to be monitored and stores them in local memory.
   */
  public async onPluginInit(): Promise<void> {
    await this.dbClient.connect();
    await this.dbClient.initializePlugin(
      PluginPersistenceEthereum.CLASS_NAME,
      this.instanceId,
    );
    await this.refreshMonitoredTokens();
    this.isConnected = true;
  }

  /**
   * Close the connection to the DB, cleanup any allocated resources.
   */
  public async shutdown(): Promise<void> {
    await this.stopMonitor();
    await this.dbClient.shutdown();
    this.isConnected = false;
  }

  /**
   * Register all the plugin endpoints on supplied `Express` server.
   *
   * @param app `Express.js` server.
   * @returns list of registered plugin endpoints.
   */
  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    this.isWebServicesRegistered = true;
    return webServices;
  }

  /**
   * Create plugin endpoints and return them.
   * If method was already called, the set of endpoints created on the first run is used.
   * @returns list of plugin endpoints.
   */
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    log.info(`Creating web services for plugin ${pkgName}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new StatusEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;

    log.info(`Instantiated web services for plugin ${pkgName} OK`, {
      endpoints,
    });
    return endpoints;
  }

  /**
   * Get status report of this instance of persistence plugin.
   * @returns Status report object
   */
  public getStatus(): StatusResponseV1 {
    return {
      instanceId: this.instanceId,
      connected: this.isConnected,
      webServicesRegistered: this.isWebServicesRegistered,
      monitoredTokensCount: this.monitoredTokens.size,
      operationsRunning: Array.from(this.trackedOperations.values()),
      monitorRunning: this.watchBlocksSubscription !== undefined,
      lastSeenBlock: this.lastSeenBlock,
    };
  }

  /**
   * Fetch the metadata of all tokens to be monitored by this persistence plugin.
   * List is saved internally (in the plugin).
   *
   * @returns List of monitored tokens.
   */
  public async refreshMonitoredTokens(): Promise<Map<string, MonitoredToken>> {
    this.log.info("refreshMonitoredTokens() started...");
    const newTokensMap = new Map<string, MonitoredToken>();

    // Fetch ERC20 tokens
    const allERC20Tokens = await this.dbClient.getTokenMetadataERC20();
    this.log.debug("Received ERC20 tokens:", allERC20Tokens);
    allERC20Tokens.forEach((token) => {
      newTokensMap.set(normalizeAddress(token.address), {
        type: TokenTypeV1.ERC20,
        name: token.name,
        symbol: token.symbol,
      });
    });

    // Fetch ERC721 tokens
    const allERC721Tokens = await this.dbClient.getTokenMetadataERC721();
    this.log.debug("Received ERC721 tokens:", allERC721Tokens);
    allERC721Tokens.map((token) => {
      newTokensMap.set(normalizeAddress(token.address), {
        type: TokenTypeV1.ERC721,
        name: token.name,
        symbol: token.symbol,
      });
    });

    // Update tokens
    this.monitoredTokens = newTokensMap;
    this.log.info(
      "refreshMonitoredTokens() finished. New monitored tokens count:",
      this.monitoredTokens.size,
    );
    this.log.debug("monitoredTokens:", this.monitoredTokens);
    return this.monitoredTokens;
  }

  /**
   * Synchronize issued tokens for all ERC721 token contract monitored by this persistence plugin.
   *
   * @warn We assume the token ID increases starting from 1.
   * @todo Support more ways to sync the tokens:
   *  - Parse all `Transfer` events emitted by the contract.
   *  - Support ERC721 Enumerable
   *  - The type of a sync method could be defined in the token definition.
   * @todo Use `Multicall.js` or something similar in the connector to improve performance.
   */
  public async syncERC721Tokens(): Promise<void> {
    const operationId = uuidv4();
    this.addTrackedOperation(operationId, "syncERC721Tokens");

    try {
      const tokenAddresses = [];
      for (const [address, token] of this.monitoredTokens) {
        if (token.type === TokenTypeV1.ERC721) {
          tokenAddresses.push(normalizeAddress(address));
        }
      }
      this.log.info(
        `Sync issued tokens for ${tokenAddresses.length} contracts.`,
      );

      for (const contractAddress of tokenAddresses) {
        try {
          this.log.debug(
            "Synchronize issued ERC721 tokens of contract",
            contractAddress,
          );
          const syncTokenCount =
            await this.syncERC721TokensForContract(contractAddress);
          this.log.info(
            `Synchronized ${syncTokenCount} tokens for contract ${contractAddress}`,
          );
        } catch (error: unknown) {
          this.log.error(
            `Token sync FAILED for contract address: ${contractAddress}, error:`,
            error,
          );
        }
      }
    } catch (error: unknown) {
      this.log.error(`syncERC721Tokens failed with exception:`, error);
    } finally {
      this.removeTrackedOperation(operationId);
    }
  }

  /**
   * Start the block monitoring process. New blocks from the ledger will be parsed and pushed to the database.
   * Use `stopMonitor()` to cancel this operation.
   *
   * @warn
   * Before the monitor starts, the database will be synchronized with current ledger state.
   * This operation can take a while, but will ensure that the ledger archive is complete.
   *
   * @param onError callback method that will be called on error.
   */
  public async startMonitor(onError?: (err: unknown) => void): Promise<void> {
    // Synchronize the current DB state
    this.lastSeenBlock = await this.syncAll();

    const blocksObservable = this.apiClient.watchBlocksV1({
      getBlockData: true,
    });

    if (!blocksObservable) {
      throw new Error(
        "Could not get a valid blocks observable in startMonitor",
      );
    }

    this.watchBlocksSubscription = blocksObservable.subscribe({
      next: async (event) => {
        try {
          this.log.debug("Received new block.");

          if (!event || !event.blockData) {
            this.log.warn("Received invalid block ledger event:", event);
            return;
          }

          await this.pushNewBlock(event.blockData);
        } catch (error: unknown) {
          this.log.error("Unexpected error when pushing new block:", error);
        }
      },
      error: (err) => {
        this.log.error("Error when watching for new blocks, err:", err);

        if (onError) {
          try {
            onError(err);
          } catch (error: unknown) {
            this.log.error(
              "Unexpected error in onError monitor handler:",
              error,
            );
          }
        }
      },
      complete: () => {
        this.log.info("Watch completed");
        if (this.watchBlocksSubscription) {
          this.watchBlocksSubscription.unsubscribe();
        }
        this.watchBlocksSubscription = undefined;
      },
    });
  }

  /**
   * Stop the block monitoring process.
   * If the monitoring wasn't running - nothing happens.
   */
  public stopMonitor(): void {
    if (this.watchBlocksSubscription) {
      this.watchBlocksSubscription.unsubscribe();
      this.watchBlocksSubscription = undefined;
      this.log.info("stopMonitor(): Done.");
    }
  }

  /**
   * Add new ERC20 token to be monitored by this plugin.
   * @param address ERC20 contract address.
   */
  public async addTokenERC20(address: string): Promise<void> {
    const checkedAddress = normalizeAddress(address);
    this.log.info(
      "Add ERC20 token to monitor changes on it. Address:",
      checkedAddress,
    );

    const tokenClient = new TokenClientERC20(this.apiClient, checkedAddress);

    try {
      await this.dbClient.insertTokenMetadataERC20({
        address: checkedAddress,
        name: await tokenClient.name(),
        symbol: await tokenClient.symbol(),
        total_supply: parseInt(await tokenClient.totalSupply(), 10),
      });
    } catch (err: unknown) {
      throw new RuntimeError(
        `Could not store ERC20 token metadata information`,
        getRuntimeErrorCause(err),
      );
    }

    await this.refreshMonitoredTokens();
  }

  /**
   * Add new ERC721 token to be monitored by this plugin.
   * @param address ERC721 contract address.
   */
  public async addTokenERC721(address: string): Promise<void> {
    const checkedAddress = normalizeAddress(address);
    this.log.info(
      "Add ERC721 token to monitor changes on it. Address:",
      checkedAddress,
    );

    const tokenClient = new TokenClientERC721(this.apiClient, checkedAddress);

    try {
      await this.dbClient.insertTokenMetadataERC721({
        address: checkedAddress,
        name: await tokenClient.name(),
        symbol: await tokenClient.symbol(),
      });
    } catch (err: unknown) {
      throw new RuntimeError(
        `Could not store ERC721 token metadata information`,
        getRuntimeErrorCause(err),
      );
    }

    await this.refreshMonitoredTokens();
  }

  /**
   * Parse entire block data, detect possible token transfer operations and store the new block data to the database.
   * Note: token balances are not updated.
   *
   * @param block `web3.js` block object.
   */
  public async parseAndStoreBlockData(
    block: WatchBlocksV1BlockData,
  ): Promise<void> {
    try {
      // Note: Use batching / synchronous loop if there are performance issues for large blocks.
      const transactions = await Promise.all(
        (block.transactions ?? []).map((tx) => this.parseBlockTransaction(tx)),
      );

      if (typeof block.timestamp === "string") {
        block.timestamp = parseInt(block.timestamp, 10);
      }
      const blockTimestamp = new Date(block.timestamp * 1000);
      const blockCreatedAt = blockTimestamp.toUTCString();
      this.log.debug("Block created at:", blockCreatedAt);

      await this.dbClient.insertBlockData({
        block: {
          number: parseInt(block.number, 10),
          created_at: blockCreatedAt,
          hash: block.hash ?? "",
          number_of_tx: transactions.length,
        },
        transactions,
      });
    } catch (error: unknown) {
      const message = `Parsing block #${block.number} failed: ${error}`;
      this.log.error(message);
      throw new RuntimeError(message, getRuntimeErrorCause(error));
    }
  }

  /**
   * Walk through all the blocks that could not be synchronized with the DB for some reasons and try pushing them again.
   * Blocks will remain on "failed blocks" list until it's successfully pushed to the database.
   * We can't calculate token balances until all failed blocks are pushed to the server (plugin will remain out of sync until then).
   *
   * @todo Add automatic tests for this method.
   *
   * @returns list of restored blocks
   */
  public async syncFailedBlocks(): Promise<number[]> {
    const blocksRestored: number[] = [];
    const operationId = uuidv4();
    this.addTrackedOperation(operationId, "syncFailedBlocks");

    try {
      for (const n of this.failedBlocks) {
        try {
          const block = await this.getBlockFromLedger(n, true);
          await this.parseAndStoreBlockData(block);
          this.failedBlocks.delete(n);
          blocksRestored.push(n);
        } catch (error: unknown) {
          this.log.warn(`Could not sync failed block #${n}, error:`, error);
        }
      }

      if (blocksRestored) {
        this.log.info("Restored following failed blocks:", blocksRestored);
      }
    } finally {
      this.removeTrackedOperation(operationId);
    }

    return blocksRestored;
  }

  /**
   * Synchronize entire ledger state with the database.
   * - Synchronize all blocks that failed to synchronize until now.
   * - Detect any other missing blocks between the database and the ledger, push them to the DB.
   * - Update the token balances if the database is in sync.
   *
   * @warn This operation can take a long time to finish!
   * @returns latest synchronized block number.
   */
  public async syncAll(): Promise<number> {
    const operationId = uuidv4();
    this.addTrackedOperation(operationId, "syncAll");

    try {
      this.log.info("syncAll() started...");

      await this.syncFailedBlocks();

      const block = await this.getBlockFromLedger("latest");
      const blockNumber = parseInt(block.number, 10);
      await this.syncBlocks(1, blockNumber);

      await this.syncTokenBalances(1);

      return blockNumber;
    } finally {
      this.removeTrackedOperation(operationId);
    }
  }
}
