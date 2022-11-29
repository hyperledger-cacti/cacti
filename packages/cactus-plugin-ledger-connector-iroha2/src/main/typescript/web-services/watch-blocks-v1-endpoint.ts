/**
 * SocketIO `WatchBlocks` endpoint
 */

import type { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
  BlockTypeV1,
} from "../generated/openapi/typescript-axios";

import { safeStringifyException, stringifyBigIntReplacer } from "../utils";

import { Torii as ToriiClient } from "@iroha2/client";

import safeStringify from "fast-safe-stringify";
import { VersionedCommittedBlock } from "@iroha2/data-model";

/**
 * Iroha2WatchBlocksEndpointV1 configuration.
 */
export interface IIroha2WatchBlocksEndpointV1Configuration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  torii: ToriiClient;
}

/**
 * Endpoint to watch for new blocks on Iroha V2 ledger and report them
 * to the client using socketio.
 */
export class Iroha2WatchBlocksEndpointV1 {
  public readonly className = "Iroha2WatchBlocksEndpointV1";
  private readonly log: Logger;
  private readonly torii: ToriiClient;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: WatchBlocksResponseV1) => void>
  >;

  constructor(
    public readonly config: IIroha2WatchBlocksEndpointV1Configuration,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);
    Checks.truthy(config.torii, `${fnTag} arg options.client`);

    this.socket = config.socket;
    this.torii = config.torii;

    const level = this.config.logLevel || "info";
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });
  }

  /**
   * Subscribe to new blocks on Iroha V2 ledger, push them to the client via SocketIO.
   *
   * @param options Block monitoring options.
   */
  public async subscribe(options: WatchBlocksOptionsV1): Promise<void> {
    const { torii, socket, log } = this;
    const clientId = socket.id;
    log.info(
      `${WatchBlocksV1.Subscribe} => clientId: ${clientId}, startBlock: ${options.startBlock}`,
    );

    try {
      const height = options.startBlock ?? "0";
      const blockType = options.type ?? BlockTypeV1.Raw;
      const blockMonitor = await torii.listenForBlocksStream({
        height: BigInt(height),
      });

      // Handle events
      blockMonitor.ee.on("open", (openEvent) => {
        log.debug("listenForBlocksStream open:", safeStringify(openEvent));
      });

      blockMonitor.ee.on("close", (closeEvent) => {
        log.debug("listenForBlocksStream close:", safeStringify(closeEvent));
      });

      blockMonitor.ee.on("error", (error) => {
        const errorMessage = safeStringify(error);
        log.warn("listenForBlocksStream error:", errorMessage);
        socket.emit(WatchBlocksV1.Error, {
          message: "listenForBlocksStream error event",
          error: errorMessage,
        });
      });

      blockMonitor.ee.on("block", (block) => {
        try {
          switch (blockType) {
            case BlockTypeV1.Raw:
              socket.emit(WatchBlocksV1.Next, {
                blockData: JSON.stringify(block, stringifyBigIntReplacer),
              });
              break;
            case BlockTypeV1.Binary:
              socket.emit(WatchBlocksV1.Next, {
                binaryBlock: VersionedCommittedBlock.toBuffer(block),
              });
              break;
            default:
              const unknownType: never = blockType;
              throw new Error(
                `Unknown block listen type - '${unknownType}'. Check name and connector version.`,
              );
          }
        } catch (error) {
          const errorMessage = safeStringifyException(error);
          log.warn(
            "listenForBlocksStream block serialization error:",
            errorMessage,
          );
          socket.emit(WatchBlocksV1.Error, {
            message: "listenForBlocksStream onBlock event error",
            error: errorMessage,
          });
        }
      });

      socket.on("disconnect", async (reason: string) => {
        log.info(
          "WebSocket:disconnect => reason=%o clientId=%s",
          reason,
          clientId,
        );
        blockMonitor.ee.clearListeners();
        await blockMonitor.stop();
      });

      socket.on(WatchBlocksV1.Unsubscribe, () => {
        log.info(`${WatchBlocksV1.Unsubscribe} => clientId: ${clientId}`);
        this.close();
      });
    } catch (error) {
      const errorMessage = safeStringifyException(error);
      log.error(errorMessage);
      socket.emit(WatchBlocksV1.Error, {
        message: "WatchBlocksV1 Exception",
        error: errorMessage,
      });
    }
  }

  close(): void {
    if (this.socket.connected) {
      this.socket.disconnect(true);
    }
  }
}
