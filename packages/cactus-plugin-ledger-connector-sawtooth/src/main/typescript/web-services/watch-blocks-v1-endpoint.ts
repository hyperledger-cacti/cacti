import * as cbor from "cbor";
import type { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import {
  WatchBlocksV1Progress,
  WatchBlocksV1,
  WatchBlocksV1ListenerType,
  WatchBlocksV1TransactionFilter,
  WatchBlocksV1Options,
} from "../generated/openapi/typescript-axios";
import { Block, DefaultApi as SawtoothRestApi } from "../sawtooth-api";

const DEFAULT_POLL_TIME = 1000 * 5; // Poll every 5 seconds by default

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  sawtoothApiClient: SawtoothRestApi;
  options?: WatchBlocksV1Options;
  pollTime?: number;
}

export class WatchBlocksV1Endpoint {
  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | string) => void>
  >;
  private currentBlockHeight = 0;
  private monitoringInterval?: NodeJS.Timer;
  private isRoutineRunning = false;

  public get className(): string {
    return "WatchBlocksV1Endpoint";
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);
    Checks.truthy(
      config.sawtoothApiClient,
      `${fnTag} arg options.sawtoothApiClient`,
    );

    this.socket = config.socket;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /**
   * Convert block number (example: 1, 42, etc..) to Sawtooth block number (example: 0x000000000000002a)
   *
   * @param blockNumber decimal block number
   * @returns hexadecimal padded block number
   */
  private toSawtoothBlockNumber(blockNumber: number) {
    return "0x" + blockNumber.toString(16).padStart(16, "0");
  }

  /**
   * Send Sawtooth transaction with custom cacti fields to a client (through socket)
   *
   * @param block sawtooth block
   * @param txFilterBy optional filtering configuration
   */
  private async sendCactiTransactions(
    block: Block,
    txFilterBy?: WatchBlocksV1TransactionFilter,
  ) {
    const cactiTransactionsEvents = block.batches
      .flatMap((block) => block.transactions)
      .filter((tx) => {
        if (txFilterBy && txFilterBy.family_name) {
          return tx.header.family_name === txFilterBy.family_name;
        }
      })
      .map((tx) => {
        return {
          ...tx,
          payload_decoded: cbor.decodeAllSync(
            Buffer.from(tx.payload, "base64"),
          ),
        };
      });

    if (cactiTransactionsEvents.length > 0) {
      this.log.debug(
        `Sending ${cactiTransactionsEvents.length} transactions to the client`,
      );
      this.socket.emit(WatchBlocksV1.Next, {
        cactiTransactionsEvents,
      });
    }
  }

  /**
   * Routine called periodically to monitor for new blocks.
   * Will fetch blocks not seen yet and push them to client (based on supplied type).
   *
   * @param type response type format (full block, transactions, etc...)
   * @param txFilterBy transactions filter (only when returning transactions)
   * @returns void
   */
  private async monitoringRoutine(
    type?: WatchBlocksV1ListenerType,
    txFilterBy?: WatchBlocksV1TransactionFilter,
  ) {
    if (this.isRoutineRunning) {
      this.log.info(
        "Previous monitoring routine didn't finish, ignore this call...",
      );
      return;
    }

    this.isRoutineRunning = true;

    try {
      // Fetch new blocks
      const newBlocksResponse = await this.config.sawtoothApiClient.blocksGet(
        undefined,
        this.toSawtoothBlockNumber(this.currentBlockHeight),
        undefined,
        "",
      );
      const newBlocks = newBlocksResponse.data.data ?? [];
      this.log.debug(
        `monitoringRoutine() - received ${newBlocks.length} blocks since block #${this.currentBlockHeight}`,
      );

      for (const block of newBlocks) {
        const thisBlockNumber = block.header.block_num;
        if (thisBlockNumber === this.currentBlockHeight) {
          continue;
        }

        // Prase block according to supplied type
        switch (type) {
          case WatchBlocksV1ListenerType.CactiTransactions:
            await this.sendCactiTransactions(block, txFilterBy);
            break;
          // Return full block by default
          case WatchBlocksV1ListenerType.Full:
          default:
            this.log.debug(
              `Sending full block #${this.currentBlockHeight} to the client`,
            );
            this.socket.emit(WatchBlocksV1.Next, {
              fullBlock: block,
            });
            break;
        }

        if (this.currentBlockHeight < thisBlockNumber) {
          this.currentBlockHeight = thisBlockNumber;
          this.log.debug("New currentBlockHeight:", this.currentBlockHeight);
        }
      }
    } catch (error) {
      this.log.error("monitoringRoutine error:", safeStringifyException(error));
    } finally {
      this.isRoutineRunning = false;
    }
  }

  /**
   * Subscribe to new blocks from sawtooth
   *
   * @returns void
   */
  public async subscribe(): Promise<void> {
    const { socket, log } = this;
    log.debug(`${WatchBlocksV1.Subscribe} => ${socket.id}`);

    // Get latest block number
    const latestBlockResponse = await this.config.sawtoothApiClient.blocksGet(
      undefined,
      undefined,
      1,
    );
    const latestBlock = latestBlockResponse.data.data;
    if (!latestBlock || latestBlock.length !== 1) {
      throw new Error(
        "Invalid response when fetching latest block from Sawtooth REST API",
      );
    }

    this.currentBlockHeight = latestBlock[0].header?.block_num ?? 0;
    if (this.currentBlockHeight > 0) {
      this.currentBlockHeight--;
    }
    this.log.info(
      this.className,
      "currentBlockHeight:",
      this.currentBlockHeight,
    );

    const pollTime = this.config.pollTime ?? DEFAULT_POLL_TIME;
    this.log.info("Starting monitoring routine with poll time", pollTime);
    this.monitoringInterval = setInterval(() => {
      this.monitoringRoutine(
        this.config.options?.type,
        this.config.options?.txFilterBy,
      );
    }, pollTime);

    socket.on("disconnect", async (reason: string) => {
      log.debug("WebSocket:disconnect reason=%o", reason);
      this.close();
    });

    socket.on(WatchBlocksV1.Unsubscribe, async () => {
      log.debug(`${WatchBlocksV1.Unsubscribe}: unsubscribing...`);
      this.close();
    });
  }

  /**
   * Disconnect the socket if connected and stop monitoring routine.
   */
  close(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    if (this.socket.connected) {
      this.socket.disconnect(true);
    }
  }
}
