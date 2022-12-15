import { Socket as SocketIoSocket } from "socket.io";

import { BlockEvent, BlockListener, EventType, Gateway } from "fabric-network";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  WatchBlocksV1,
  WatchBlocksResponseV1,
  WatchBlocksListenerTypeV1,
  WatchBlocksOptionsV1,
  WatchBlocksCactusTransactionsEventV1,
} from "../generated/openapi/typescript-axios";

import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";
import { RuntimeError } from "run-time-error";

/**
 * WatchBlocksV1Endpoint configuration.
 */
export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  gateway: Gateway;
}

/**
 * Return secure string representation of error from the input.
 * Handles circular structures and removes HTML.`
 *
 * @param error Any object to return as an error, preferable `Error`
 * @returns Safe string representation of an error.
 *
 * @todo use one from cactus-common after #2089 is merged.
 */
export function safeStringifyException(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeHtml(error.stack || error.message);
  }

  return sanitizeHtml(safeStringify(error));
}

/**
 * Endpoint to watch for new blocks on fabric ledger and report them
 * to client using socketio.
 */
export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: WatchBlocksResponseV1) => void>
  >;

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);

    this.socket = config.socket;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /**
   * Get this class name.
   */
  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  /**
   * Callback executed when receiving block with custom cactus type "cactus:transactions"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent full block
   *
   * @returns Nothing.
   */
  private monitorCactusTransactionsCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `CactusTransactions BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("data" in blockEvent.blockData)) {
      log.error("Wrong blockEvent type received - should not happen!");
      return;
    }

    const blockData = blockEvent.blockData.data?.data as any;
    if (!blockData) {
      log.debug("Block data empty - ignore...");
      return;
    }

    const transactions: WatchBlocksCactusTransactionsEventV1[] = [];
    for (const data of blockData) {
      try {
        const payload = data.payload;
        const transaction = payload.data;
        const actionPayload = transaction.actions[0].payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";

        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;
        const channelHeader = payload.header.channel_header;
        const transactionId = channelHeader.tx_id;

        transactions.push({
          chaincodeId,
          transactionId,
          functionName,
          functionArgs: decodedArgs,
        });
      } catch (error) {
        const errorMessage = safeStringifyException(error);
        log.error(
          "Could not retrieve transaction from received block. Error:",
          errorMessage,
        );
        socket.emit(WatchBlocksV1.Error, {
          code: 512,
          errorMessage,
        });
      }
    }

    socket.emit(WatchBlocksV1.Next, {
      cactusTransactionsEvents: transactions,
    });
  }

  /**
   * Callback executed when receiving block with standard type "full"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent full block
   *
   * @returns Nothing.
   */
  private monitorFullCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `Full BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("data" in blockEvent.blockData)) {
      log.error("Wrong blockEvent type received - should not happen!");
      return;
    }

    socket.emit(WatchBlocksV1.Next, {
      fullBlock: blockEvent,
    });
  }

  /**
   * Callback executed when receiving block with standard type "filtered"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent filtered block
   *
   * @returns Nothing.
   */
  private monitorFilteredCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `Filtered BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("filtered_transactions" in blockEvent.blockData)) {
      log.error("Wrong blockEvent type received - should not happen!");
      return;
    }

    socket.emit(WatchBlocksV1.Next, {
      filteredBlock: blockEvent,
    });
  }

  /**
   * Callback executed when receiving block with standard type "private"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent private block
   *
   * @returns Nothing.
   */
  private monitorPrivateCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `Private BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("data" in blockEvent.blockData)) {
      log.error("Wrong blockEvent type received - should not happen!");
      return;
    }

    socket.emit(WatchBlocksV1.Next, {
      privateBlock: blockEvent,
    });
  }

  /**
   * Get block listener callback and listener type it's expect.
   * Returns separate function object each time it's called (this is required y fabric node SDK).
   *
   * @param type requested listener type (including custom Cactus ones).
   *
   * @returns listener: BlockListener;
   * @returns listenerType: BlockType;
   */
  private getBlockListener(type: WatchBlocksListenerTypeV1) {
    let listener: BlockListener;
    let listenerType: EventType;

    switch (type) {
      case WatchBlocksListenerTypeV1.Full:
        listener = async (blockEvent) => this.monitorFullCallback(blockEvent);
        listenerType = "full";
        break;
      case WatchBlocksListenerTypeV1.Filtered:
        listener = async (blockEvent) =>
          this.monitorFilteredCallback(blockEvent);
        listenerType = "filtered";
        break;
      case WatchBlocksListenerTypeV1.Private:
        listener = async (blockEvent) =>
          this.monitorPrivateCallback(blockEvent);
        listenerType = "private";
        break;
      case WatchBlocksListenerTypeV1.CactusTransactions:
        listener = async (blockEvent) =>
          this.monitorCactusTransactionsCallback(blockEvent);
        listenerType = "full";
        break;
      default:
        // Will not compile if any type was not handled by above switch.
        const unknownType: never = type;
        const validTypes = Object.keys(WatchBlocksListenerTypeV1).join(";");
        const errorMessage = `Unknown block listen type '${unknownType}'. Check name and connector version. Accepted listener types for WatchBlocksListenerTypeV1 are: [${validTypes}]`;
        throw new RuntimeError(errorMessage);
    }

    return { listener, listenerType };
  }

  /**
   * Subscribe to new blocks on fabric ledger, push them to the client via socketio.
   *
   * @param options Block monitoring options.
   */
  public async subscribe(options: WatchBlocksOptionsV1): Promise<void> {
    const { socket, log } = this;
    const clientId = socket.id;
    log.info(`${WatchBlocksV1.Subscribe} => clientId: ${clientId}`);
    log.debug(
      "WatchBlocksV1.Subscribe args: channelName:",
      options.channelName,
      ", startBlock:",
      options.startBlock,
      ", type: ",
      options.type,
    );

    try {
      Checks.truthy(options.channelName, "Missing channel name");
      const network = await this.config.gateway.getNetwork(options.channelName);

      const { listener, listenerType } = this.getBlockListener(options.type);

      log.debug("Subscribing to new blocks... listenerType:", listenerType);
      // @todo Add support for checkpointer (long-term improvement)
      // https://hyperledger.github.io/fabric-sdk-node/release-2.2/module-fabric-network.Checkpointer.html
      await network.addBlockListener(listener, {
        startBlock: options.startBlock,
        type: listenerType,
      });

      socket.on("disconnect", async (reason: string) => {
        log.info(
          "WebSocket:disconnect => reason=%o clientId=%s",
          reason,
          clientId,
        );
        network.removeBlockListener(listener);
        this.close();
      });

      socket.on(WatchBlocksV1.Unsubscribe, () => {
        log.info(`${WatchBlocksV1.Unsubscribe} => clientId: ${clientId}`);
        this.close();
      });
    } catch (error) {
      const errorMessage = safeStringifyException(error);
      log.error(errorMessage);
      socket.emit(WatchBlocksV1.Error, {
        code: 500,
        errorMessage,
      });
    }
  }

  close(): void {
    if (this.socket.connected) {
      this.socket.disconnect(true);
    }
    this.config.gateway.disconnect();
  }
}
