/**
 * Main logic of persistence plugin for fabric data.
 */

import type { Express } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Subscription } from "rxjs";
import { Mutex } from "async-mutex";

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
  CactiBlockFullEventV1,
  FabricApiClient,
  GatewayOptions,
  GetBlockResponseTypeV1,
  GetChainInfoResponseV1,
  WatchBlocksListenerTypeV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import OAS from "../json/openapi.json";
import { StatusEndpointV1 } from "./web-services/status-endpoint-v1";
import PostgresDatabaseClient from "./db-client/db-client";
import {
  StatusResponseV1,
  TrackedOperationV1,
} from "./generated/openapi/typescript-axios";

/**
 * Constructor parameter for Fabric persistence plugin.
 */
export interface IPluginPersistenceFabricOptions extends ICactusPluginOptions {
  apiClient: FabricApiClient;
  connectionString: string;
  logLevel: LogLevelDesc;
  channelName: string;
  gatewayOptions: GatewayOptions;
}

/**
 * Cacti persistence plugin for fabric ledgers.
 * Remember to call `onPluginInit()` before using any of the plugin method, and `shutdown()` when closing the app.
 */
export class PluginPersistenceFabric
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "PluginPersistenceFabric";

  private readonly instanceId: string;
  private log: Logger;
  private apiClient: FabricApiClient;
  private channelName: string;
  private gatewayOptions: GatewayOptions;
  private watchBlocksSubscription: Subscription | undefined;
  private dbClient: PostgresDatabaseClient;
  private isConnected = false;
  private pushBlockMutex = new Mutex();
  private syncBlocksMutex = new Mutex();
  private isWebServicesRegistered = false;
  private lastSeenBlock = 0;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private trackedOperations = new Map<string, TrackedOperationV1>();
  private failedBlocks = new Set<number>();

  constructor(public readonly options: IPluginPersistenceFabricOptions) {
    const fnTag = `${PluginPersistenceFabric.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.apiClient, `${fnTag} options.apiClient`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.connectionString,
      `${fnTag} options.connectionString`,
    );
    Checks.truthy(options.channelName, `${fnTag} options.channelName`);
    Checks.truthy(options.gatewayOptions, `${fnTag} options.gatewayOptions`);

    const level = this.options.logLevel || "INFO";
    const label = PluginPersistenceFabric.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.apiClient = options.apiClient;
    this.channelName = options.channelName;
    this.gatewayOptions = options.gatewayOptions;

    this.dbClient = new PostgresDatabaseClient({
      connectionString: options.connectionString,
      logLevel: level,
    });
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
   * Get block data from the ledger using the cacti connector.
   *
   * @returns Full block data including transactions (`CactiBlockFullEventV1`)
   */
  private async getBlockFromLedger(
    blockNumber: number,
  ): Promise<CactiBlockFullEventV1> {
    const response = await this.apiClient.getBlockV1({
      channelName: this.channelName,
      gatewayOptions: this.gatewayOptions,
      query: {
        blockNumber: blockNumber.toString(),
      },
      responseType: GetBlockResponseTypeV1.CactiFullBlock,
    });

    if (
      response &&
      response.status === 200 &&
      "cactiFullEvents" in response.data
    ) {
      return response.data.cactiFullEvents;
    } else {
      throw new Error(
        `Could not get block with number ${blockNumber} from the ledger`,
      );
    }
  }

  /**
   * Get chain info from the ledger using the cacti connector.
   *
   * @returns chain information (including current height and block hash)
   */
  private async getChainInfoFromLedger(): Promise<GetChainInfoResponseV1> {
    const response = await this.apiClient.getChainInfoV1({
      channelName: this.channelName,
      gatewayOptions: this.gatewayOptions,
    });

    if (response && response.status === 200) {
      return response.data;
    } else {
      throw new Error("Could not get chain information from the ledger");
    }
  }

  /**
   * Parse and push a new block received from the connector.
   * Gap between last seen block and current one is checked and missing blocks are filled when necessary.
   *
   * @param block Full fabric block summary (`CactiBlockFullEventV1`)
   */
  private async pushNewBlock(block: CactiBlockFullEventV1): Promise<void> {
    if (block.blockNumber <= this.lastSeenBlock) {
      this.log.debug(
        `Block ${block.blockNumber} already added (last seen: ${this.lastSeenBlock})`,
      );
      return;
    }

    // Push one block at a time, in case previous block is still being processed
    // (example: filling the gap takes longer than expected)
    await this.pushBlockMutex.runExclusive(async () => {
      const previousBlockNumber = this.lastSeenBlock;

      try {
        this.lastSeenBlock = block.blockNumber;
        await this.dbClient.insertBlockData(block);
      } catch (error: unknown) {
        this.log.warn(
          `Could not add new block #${block.blockNumber}, error:`,
          error,
        );
        this.addFailedBlock(block.blockNumber);
      }

      const isGap = block.blockNumber - previousBlockNumber > 1;
      if (isGap) {
        const gapFrom = previousBlockNumber + 1;
        const gapTo = block.blockNumber - 1;
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
      if (block.number !== blockNumber.toString()) {
        throw new Error("Invalid response from the DB");
      }
      this.log.debug(
        `Block #${blockNumber} already present in DB - remove from the failed pool.`,
      );
      this.failedBlocks.delete(blockNumber);
    } catch (error: unknown) {
      this.log.info(
        `Block #${blockNumber} not found in the DB - add to the failed blocks pool.`,
      );
      this.log.debug("getBlock() error message:", error);
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
          const block = await this.getBlockFromLedger(n);
          await this.dbClient.insertBlockData(block);
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
    return `@hyperledger/cactus-plugin-persistence-fabric`;
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
      PluginPersistenceFabric.CLASS_NAME,
      this.instanceId,
    );

    this.isConnected = true;
  }

  /**
   * Close the connection to the DB, cleanup any allocated resources.
   */
  public async shutdown(): Promise<void> {
    this.stopMonitor();
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
   *
   * @returns Status report object
   */
  public getStatus(): StatusResponseV1 {
    return {
      instanceId: this.instanceId,
      connected: this.isConnected,
      webServicesRegistered: this.isWebServicesRegistered,
      operationsRunning: Array.from(this.trackedOperations.values()),
      monitorRunning: this.watchBlocksSubscription !== undefined,
      lastSeenBlock: this.lastSeenBlock,
    };
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
      channelName: this.channelName,
      gatewayOptions: this.gatewayOptions,
      type: WatchBlocksListenerTypeV1.CactiFullBlock,
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

          if (!event || !("cactiFullEvents" in event)) {
            this.log.warn("Received invalid block ledger event:", event);
            return;
          }

          await this.pushNewBlock(event.cactiFullEvents);
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
   * Walk through all the blocks that could not be synchronized with the DB for some reasons and try pushing them again.
   * Blocks will remain on "failed blocks" list until it's successfully pushed to the database.
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
          const block = await this.getBlockFromLedger(n);
          await this.dbClient.insertBlockData(block);
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
   *
   * @warn This operation can take a long time to finish!
   *
   * @returns latest synchronized block number.
   */
  public async syncAll(): Promise<number> {
    const operationId = uuidv4();
    this.addTrackedOperation(operationId, "syncAll");

    try {
      this.log.info("syncAll() started...");

      await this.syncFailedBlocks();

      const { height } = await this.getChainInfoFromLedger();
      const latestBlock = height - 1; // Height points to next block, not the latest

      await this.syncBlocks(1, latestBlock);

      return latestBlock;
    } finally {
      this.removeTrackedOperation(operationId);
    }
  }
}
