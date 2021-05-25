import { Socket as SocketIoSocket } from "socket.io";
import Web3 from "web3";

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { WatchBlocksV1Progress } from "../generated/openapi/typescript-axios";
import { WatchBlocksV1 } from "../generated/openapi/typescript-axios";

export interface IWatchBlocksV1EndpointOptions {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  web3: Web3;
}

export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | Error) => void>
  >;
  private readonly web3: Web3;

  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWatchBlocksV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.web3, `${fnTag} arg options.web3`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.web3 = options.web3;
    this.socket = options.socket;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    const { socket, log, web3 } = this;
    log.debug(`${WatchBlocksV1.Subscribe} => ${socket.id}`);

    const sub = web3.eth.subscribe("newBlockHeaders", (ex, blockHeader) => {
      log.debug("newBlockHeaders: Error=%o BlockHeader=%o", ex, blockHeader);
      if (blockHeader) {
        const next: WatchBlocksV1Progress = {
          blockHeader,
        };
        socket.emit(WatchBlocksV1.Next, next);
      }
      if (ex) {
        socket.emit(WatchBlocksV1.Error, ex);
        sub.unsubscribe();
      }
    });

    log.debug("Subscribing to Web3 new block headers event...");

    socket.on("disconnect", async (reason: string) => {
      log.debug("WebSocket:disconnect reason=%o", reason);
      sub.unsubscribe((ex: Error, success: boolean) => {
        log.debug("Web3 unsubscribe success=%o, ex=%", success, ex);
      });
    });

    socket.on(WatchBlocksV1.Unsubscribe, () => {
      log.debug(`${WatchBlocksV1.Unsubscribe}: unsubscribing Web3...`);
      sub.unsubscribe((ex: Error, success: boolean) => {
        log.debug("Web3 unsubscribe error=%o, success=%", ex, success);
      });
    });
  }
}
