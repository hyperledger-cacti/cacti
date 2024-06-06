import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import type {
  BlockType,
  Channel,
  EventCallback,
  EventInfo,
  IdentityContext,
} from "fabric-common";
import { BlockEvent, BlockListener, EventType, Gateway } from "fabric-network";
import type { Socket as SocketIoSocket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { RuntimeError } from "run-time-error-cjs";

import { assertFabricFunctionIsAvailable } from "../common/utils";
import { SignPayloadCallback } from "../plugin-ledger-connector-fabric";
import {
  WatchBlocksV1,
  WatchBlocksResponseV1,
  WatchBlocksListenerTypeV1,
  WatchBlocksOptionsV1,
  WatchBlocksDelegatedSignOptionsV1,
} from "../generated/openapi/typescript-axios";
import {
  formatCactiFullBlockResponse,
  formatCactiTransactionsBlockResponse,
} from "../get-block/cacti-block-formatters";

const {
  newFilteredBlockEvent,
} = require("fabric-network/lib/impl/event/filteredblockeventfactory");
assertFabricFunctionIsAvailable(newFilteredBlockEvent, "newFilteredBlockEvent");
const {
  newFullBlockEvent,
} = require("fabric-network/lib/impl/event/fullblockeventfactory");
assertFabricFunctionIsAvailable(newFullBlockEvent, "newFullBlockEvent");
const {
  newPrivateBlockEvent,
} = require("fabric-network/lib/impl/event/privateblockeventfactory");
assertFabricFunctionIsAvailable(newPrivateBlockEvent, "newPrivateBlockEvent");

/**
 * WatchBlocksV1Endpoint configuration.
 */
export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
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
   * Callback executed when receiving block with custom cacti type "cacti:full-block"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent full block
   *
   * @returns Nothing.
   */
  private monitorCactiFullBlockCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `CactiFullBlock BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("data" in blockEvent.blockData)) {
      throw new Error("Wrong blockEvent type received - should not happen!");
    }

    socket.emit(
      WatchBlocksV1.Next,
      formatCactiFullBlockResponse(blockEvent.blockData),
    );
  }

  /**
   * Callback executed when receiving block with custom cacti type "cacti:transactions"
   * Sends WatchBlocksV1.Next with new block to the client.
   *
   * @param blockEvent full block
   *
   * @returns Nothing.
   */
  private monitorCactiTransactionsCallback(blockEvent: BlockEvent) {
    const { socket, log } = this;
    const clientId = socket.id;
    log.debug(
      `CactiTransactions BlockEvent received: #${blockEvent.blockNumber.toString()}, client: ${clientId}`,
    );

    if (!("data" in blockEvent.blockData)) {
      throw new Error("Wrong blockEvent type received - should not happen!");
    }

    socket.emit(
      WatchBlocksV1.Next,
      formatCactiTransactionsBlockResponse(blockEvent.blockData),
    );
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
   * @param type requested listener type (including custom Cacti ones).
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
      case WatchBlocksListenerTypeV1.CactiTransactions:
        listener = async (blockEvent) =>
          this.monitorCactiTransactionsCallback(blockEvent);
        listenerType = "full";
        break;
      case WatchBlocksListenerTypeV1.CactiFullBlock:
        listener = async (blockEvent) =>
          this.monitorCactiFullBlockCallback(blockEvent);
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
   * Use Fabric SDK functions to convert raw `EventInfo` to `BlockEvent` of specified `BlockType`.
   *
   * @param blockType block type (e.g. full, filtered)
   * @param event raw block event from EventService
   * @returns parsed BlockEvent
   */
  private toFabricBlockEvent(
    blockType: BlockType,
    event: EventInfo,
  ): BlockEvent {
    if (blockType === "filtered") {
      return newFilteredBlockEvent(event);
    } else if (blockType === "full") {
      return newFullBlockEvent(event);
    } else if (blockType === "private") {
      return newPrivateBlockEvent(event);
    } else {
      // Exhaustive check
      const unknownBlockType: never = blockType;
      throw new Error(`Unsupported event type: ${unknownBlockType}`);
    }
  }

  /**
   * Subscribe to new blocks on fabric ledger, push them to the client via socketio.
   *
   * @param options Block monitoring options.
   */
  public async subscribe(
    options: WatchBlocksOptionsV1,
    gateway: Gateway,
  ): Promise<void> {
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
      const network = await gateway.getNetwork(options.channelName);

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
        gateway.disconnect();
        this.close();
      });

      socket.on(WatchBlocksV1.Unsubscribe, () => {
        log.info(`${WatchBlocksV1.Unsubscribe} => clientId: ${clientId}`);
        this.close();
      });
    } catch (error) {
      const errorMessage = safeStringifyException(error);
      log.warn(errorMessage);
      socket.emit(WatchBlocksV1.Error, {
        code: 500,
        errorMessage,
      });
    }
  }

  /**
   * Subscribe to new blocks on fabric ledger, push them to the client via socketio.
   * Uses delegate signing callback from the connector to support custom signing scenarios.
   *
   * @param options Block monitoring options.
   * @param channel Target channel to monitor blocks.
   * @param userIdCtx Signer identity context.
   * @param signCallback Signing callback to use when sending requests to a network.
   */
  public async SubscribeDelegatedSign(
    options: WatchBlocksDelegatedSignOptionsV1,
    channel: Channel,
    userIdCtx: IdentityContext,
    signCallback: SignPayloadCallback,
  ): Promise<void> {
    const { socket, log } = this;
    const clientId = socket.id;
    log.info(
      `${WatchBlocksV1.SubscribeDelegatedSign} => clientId: ${clientId}`,
    );
    log.debug(
      "WatchBlocksV1.SubscribeDelegatedSign args: channelName:",
      options.channelName,
      ", startBlock:",
      options.startBlock,
      ", type: ",
      options.type,
    );

    try {
      const { listener, listenerType } = this.getBlockListener(options.type);
      log.debug("Subscribing to new blocks... listenerType:", listenerType);

      // Eventers
      // (prefer peers from same org)
      let peers = channel.getEndorsers(options.signerMspID);
      peers = peers.length > 0 ? peers : channel.getEndorsers();
      const eventers = peers.map((peer) => {
        const eventer = channel.client.newEventer(peer.name);
        eventer.setEndpoint(peer.endpoint);
        return eventer;
      });
      if (eventers.length === 0) {
        throw new Error("No peers (eventers) available for monitoring");
      }

      // Event Service
      const eventService = channel.newEventService(
        `SubscribeDelegatedSign_${uuidv4()}`,
      );
      eventService.setTargets(eventers);

      // Event listener
      const eventCallback: EventCallback = (
        error?: Error,
        event?: EventInfo,
      ) => {
        try {
          if (error) {
            throw error;
          }

          if (event) {
            listener(this.toFabricBlockEvent(listenerType, event));
          } else {
            this.log.warn(
              "SubscribeDelegatedSign() missing event - without an error.",
            );
          }
        } catch (error) {
          const errorMessage = safeStringifyException(error);
          log.warn("SubscribeDelegatedSign callback exception:", errorMessage);
          socket.emit(WatchBlocksV1.Error, {
            code: 500,
            errorMessage,
          });
        }
      };

      const eventListener = eventService.registerBlockListener(eventCallback, {
        startBlock: options.startBlock,
        unregister: false,
      });

      // Start monitoring
      const monitorRequest = eventService.build(userIdCtx, {
        blockType: listenerType,
        startBlock: options.startBlock,
      });
      const signature = await signCallback(
        monitorRequest,
        options.uniqueTransactionData,
      );
      eventService.sign(signature);
      await eventService.send();

      socket.on("disconnect", async (reason: string) => {
        log.info(
          "WebSocket:disconnect => reason=%o clientId=%s",
          reason,
          clientId,
        );

        eventListener.unregisterEventListener();
        eventService.close();
        channel.close();
        channel.client.close();
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

  /**
   * Disconnect the socket if connected.
   * This will trigger cleanups for all started monitoring logics that use this socket.
   */
  close(): void {
    if (this.socket.connected) {
      this.socket.disconnect(true);
    }
  }
}
