/**
 * Contains abstract base WatchBlocksV1Endpoint, it specific implementation (with WebSockets and HTTP polling) and some helper methods.
 * In the future we may consider dividing this into separate files, but for now (since codebase is small) it makes more sense to keep
 * everything in one place for simplicity.
 */

import Web3, { BlockHeaderOutput, FMT_BYTES, FMT_NUMBER } from "web3";
import { NewHeadsSubscription, RegisteredSubscription } from "web3-eth";
import type { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import {
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
  WatchBlocksV1,
  Web3Transaction,
} from "../generated/openapi/typescript-axios";
import { ConvertWeb3ReturnToString } from "../types/util-types";

const DEFAULT_HTTP_POLL_INTERVAL = 1000 * 5; // 5 seconds
const LAST_SEEN_LATEST_BLOCK = -1; // must be negative number, will be replaced with latest block in code

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  web3: InstanceType<typeof Web3>;
  options?: WatchBlocksV1Options;
}

/**
 * Returns true if provider of given web3js instance supports subscriptions (e.g. websocket connection)
 *
 * @param web3 web3js instance
 * @returns boolean
 */
function isWeb3SubscriptionSupported(web3: InstanceType<typeof Web3>) {
  const provider = web3.currentProvider;
  if (!provider) {
    throw new Error(
      "Missing Web3 provider, can't monitor new blocks in any way",
    );
  }
  return provider.supportsSubscriptions();
}

/**
 * Factory method for creating either subscription based or HTTP-poll based `WatchBlocksV1Endpoint`
 * (depending on web3js instance capability)
 *
 * @param config `WatchBlocksV1Endpoint` configuration
 * @returns `WatchBlocksV1Endpoint`
 */
export function createWatchBlocksV1Endpoint(
  config: IWatchBlocksV1EndpointConfiguration,
): WatchBlocksV1Endpoint {
  if (isWeb3SubscriptionSupported(config.web3)) {
    return new WatchBlocksV1SubscriptionEndpoint(config);
  } else {
    return new WatchBlocksV1HttpPollEndpoint(config);
  }
}

/**
 * Base abstract class to be extended by specific WatchBlocks strategies.
 * Contains common logic for all monitoring endpoints.
 */
export abstract class WatchBlocksV1Endpoint {
  protected readonly log: Logger;
  protected readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | string) => void>
  >;
  protected readonly web3: InstanceType<typeof Web3>;
  protected readonly isGetBlockData: boolean;
  protected lastSeenBlock: number;
  private _isSubscribed = false;

  /**
   * Note: should be overwritten by the strategy classes.
   */
  public get className(): string {
    return "WatchBlocksV1Endpoint";
  }

  public get isSubscribed(): boolean {
    return !this.socket.disconnected && this._isSubscribed;
  }

  public set isSubscribed(value: boolean) {
    this._isSubscribed = value;
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.web3, `${fnTag} arg options.web3`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);

    this.web3 = config.web3;
    this.socket = config.socket;
    this.isGetBlockData = config.options?.getBlockData === true;
    this.lastSeenBlock =
      config.options?.lastSeenBlock ?? LAST_SEEN_LATEST_BLOCK;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.socket.on("disconnect", async (reason: string) => {
      this.log.info(
        `WebSocket:disconnect => ${this.socket.id} reason: ${reason}`,
      );
      await this.unsubscribe();
    });

    this.socket.on(WatchBlocksV1.Unsubscribe, async () => {
      this.log.info(`${WatchBlocksV1.Unsubscribe} => ${this.socket.id}`);
      await this.unsubscribe();
    });
  }

  /**
   * Get block with specific number from ethereum, parse it and return
   * `WatchBlocksV1Progress` with `blockData`.
   *
   * @param blockNumber
   * @returns `WatchBlocksV1Progress
   */
  protected async getFullBlockProgress(
    blockNumber: number,
  ): Promise<WatchBlocksV1Progress> {
    const web3BlockData = await this.web3.eth.getBlock(blockNumber, true, {
      number: FMT_NUMBER.STR,
      bytes: FMT_BYTES.HEX,
    });

    return {
      blockData: {
        ...web3BlockData,
        // force empty transactions object instead of undefined, also narrow from string[]
        transactions: (web3BlockData.transactions ??
          []) as unknown as Web3Transaction[],
      },
    };
  }

  /**
   * Parse block header data and return `WatchBlocksV1Progress` with `blockHeader`.
   * @param web3BlockData `BlockHeaderOutput`
   * @returns `WatchBlocksV1Progress`
   */
  protected async headerDataToBlockProgress(
    web3BlockData: BlockHeaderOutput,
  ): Promise<WatchBlocksV1Progress> {
    // Force fix type of sha3Uncles
    let sha3Uncles: string = web3BlockData.sha3Uncles as unknown as string;
    if (Array.isArray(web3BlockData.sha3Uncles)) {
      sha3Uncles = web3BlockData.sha3Uncles.toString();
    }

    return {
      blockHeader: {
        ...(web3BlockData as ConvertWeb3ReturnToString<BlockHeaderOutput>),
        sha3Uncles,
      },
    };
  }

  /**
   * Push to the socketio client all missing blocks since `lastSeenBlock`, up to the current latest block.
   * Will not push if subscription was stopped in the meantime.
   * Can throw exceptions.
   */
  protected async emitAllSinceLastSeenBlock(): Promise<void> {
    const { socket, log, web3, isGetBlockData } = this;

    const latestBlockNumber = await web3.eth.getBlockNumber({
      number: FMT_NUMBER.NUMBER,
      bytes: FMT_BYTES.HEX,
    });

    if (this.lastSeenBlock === LAST_SEEN_LATEST_BLOCK) {
      this.lastSeenBlock = latestBlockNumber;
      log.debug(
        "emitAllSinceLastSeenBlock() - Using latest block number as lastSeenBlock:",
        latestBlockNumber,
      );
    }

    while (this.lastSeenBlock < latestBlockNumber) {
      const blockNumber = this.lastSeenBlock + 1;
      log.debug(
        `emitAllSinceLastSeenBlock() - pushing block ${blockNumber} (latest ${latestBlockNumber})`,
      );

      let next: WatchBlocksV1Progress;
      if (isGetBlockData) {
        next = await this.getFullBlockProgress(blockNumber);
      } else {
        const web3BlockData = await web3.eth.getBlock(blockNumber, false, {
          number: FMT_NUMBER.STR,
          bytes: FMT_BYTES.HEX,
        });
        next = await this.headerDataToBlockProgress({
          ...web3BlockData,
          sha3Uncles: web3BlockData.sha3Uncles as any,
          size: undefined,
          totalDifficulty: undefined,
          uncles: undefined,
          transactions: undefined,
        });
      }

      if (!this.isSubscribed) {
        log.info(
          "emitAllSinceLastSeenBlock() - not subscribed anymore, stopping...",
        );
        break;
      }

      socket.emit(WatchBlocksV1.Next, next);

      this.lastSeenBlock = blockNumber;
    }

    log.debug("emitAllSinceLastSeenBlock() - done");
  }

  /**
   * Start monitoring new blocks from the ledger (either full blocks with transaction data or just the headers).
   * Will fetch and push missing blocks since `lastSeenBlock` provided.
   */
  public abstract subscribe(): Promise<WatchBlocksV1Endpoint>;

  /**
   * Stop monitoring new blocks.
   */
  public abstract unsubscribe(): Promise<void>;
}

////////////////////////////////////////////////////////////////////////////////
// WatchBlocksV1HttpPollEndpoint
////////////////////////////////////////////////////////////////////////////////

/**
 * Implementation of `WatchBlocksV1Endpoint` using HTTP polling method.
 * Should be used if ethereum node (i.e. web3js connection) doesn't support
 * async subscriptions.
 */
export class WatchBlocksV1HttpPollEndpoint extends WatchBlocksV1Endpoint {
  private monitoringInterval: NodeJS.Timer | undefined;
  private httpPollInterval: number;

  public get className(): string {
    return "WatchBlocksV1HttpPollEndpoint";
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    super(config);
    this.httpPollInterval =
      config.options?.httpPollInterval ?? DEFAULT_HTTP_POLL_INTERVAL;
  }

  public async subscribe() {
    const { socket, log } = this;
    log.info(`${WatchBlocksV1.Subscribe} [HTTP Polling] => ${socket.id}`);

    if (this.isSubscribed) {
      this.log.error(
        "subscribe() - monitoring has already been started! Restarting it...",
      );
      await this.unsubscribe();
    }
    this.isSubscribed = true;

    socket.on("disconnect", async () => this.unsubscribe());
    socket.on(WatchBlocksV1.Unsubscribe, async () => this.unsubscribe());

    log.debug("Starting new HTTP polling interval...");
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.emitAllSinceLastSeenBlock();
      } catch (error) {
        log.warn(`${this.className} - polling thread exception:`, error);
      }
    }, this.httpPollInterval);

    return this;
  }

  public async unsubscribe(): Promise<void> {
    this.log.debug("Unsubscribing HTTP polling monitor...");
    try {
      clearInterval(this.monitoringInterval);
    } catch (error) {
      this.log.info(
        `Could not clear polling interval id ${this.monitoringInterval}, error:`,
        error,
      );
    }
    this.monitoringInterval = undefined;
    this.isSubscribed = false;
  }
}

////////////////////////////////////////////////////////////////////////////////
// WatchBlocksV1SubscriptionEndpoint
////////////////////////////////////////////////////////////////////////////////

/**
 * Implementation of `WatchBlocksV1Endpoint` using web3js subscription (WebSocket)
 * Should be used if ethereum node (i.e. web3js connection) supports async subscriptions.
 * Throws if wrong web3js provider was used.
 */

export class WatchBlocksV1SubscriptionEndpoint extends WatchBlocksV1Endpoint {
  private newBlocksSubscription: NewHeadsSubscription | undefined;

  public get className(): string {
    return "WatchBlocksV1SubscriptionEndpoint";
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    super(config);
    if (!isWeb3SubscriptionSupported(this.web3)) {
      throw new Error("Provided web3 provider doesn't support subscriptions!");
    }
  }

  public async subscribe() {
    const { socket, log, isGetBlockData } = this;
    log.info(`${WatchBlocksV1.Subscribe} [WS Subscription] => ${socket.id}`);

    if (this.isSubscribed) {
      this.log.error(
        "subscribe() - monitoring has already been started! Restarting it...",
      );
      await this.unsubscribe();
    }
    this.isSubscribed = true;

    log.info("Pushing missing blocks since lastSeenBlock...");
    await this.emitAllSinceLastSeenBlock();

    log.debug("Subscribing to Web3 new block headers event...");
    const options = {
      subscription: "newBlockHeaders" as keyof RegisteredSubscription,
      parameters: {},
    };

    this.newBlocksSubscription = (await this.web3.eth.subscribe(
      options.subscription,
      options.parameters,
    )) as unknown as NewHeadsSubscription;

    this.newBlocksSubscription?.on(
      "data",
      async (blockHeader: BlockHeaderOutput) => {
        try {
          log.debug("newBlockHeaders:", blockHeader);

          if (blockHeader.number === undefined || blockHeader.number === null) {
            throw new Error(
              `Missing block number in received block header (number: ${blockHeader.number}, hash: ${blockHeader.hash})`,
            );
          }
          const blockNumber = Number(blockHeader.number);
          if (blockNumber - this.lastSeenBlock > 2) {
            log.info(
              `Detected missing blocks since latest one (blockNumber: ${blockNumber}, lastSeenBlock: ${this.lastSeenBlock})`,
            );
            await this.emitAllSinceLastSeenBlock();
          }

          let next: WatchBlocksV1Progress;
          if (isGetBlockData) {
            next = await this.getFullBlockProgress(blockNumber);
          } else {
            next = await this.headerDataToBlockProgress(blockHeader);
          }

          socket.emit(WatchBlocksV1.Next, next);

          this.lastSeenBlock = blockNumber;
        } catch (error) {
          log.warn("Error when parsing subscribed block data:", error);
        }
      },
    );

    this.newBlocksSubscription?.on("error", async (error: Error) => {
      log.error("Error when subscribing to new block header: ", error);
      socket.emit(WatchBlocksV1.Error, safeStringifyException(error));
      await this.unsubscribe();
    });

    return this;
  }

  public async unsubscribe(): Promise<void> {
    this.log.debug("Unsubscribing block subscription monitor...");
    if (this.newBlocksSubscription) {
      try {
        await this.newBlocksSubscription.unsubscribe();
      } catch (error) {
        this.log.info(
          "Could not unsubscribe from web3js monitor, error:",
          error,
        );
      }
    }
    this.newBlocksSubscription = undefined;
    this.isSubscribed = false;
  }
}
