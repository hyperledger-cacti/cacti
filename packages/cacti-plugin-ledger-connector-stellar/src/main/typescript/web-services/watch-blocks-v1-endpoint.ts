import type { Socket as SocketIoSocket } from "socket.io";

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { WatchBlocksV1Progress } from "../generated/openapi/typescript-axios";
import { WatchBlocksV1 } from "../generated/openapi/typescript-axios";

export interface IWatchBlocksV1EndpointOptions {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
}

export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | Error) => void>
  >;

  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWatchBlocksV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.socket = options.socket;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    const { socket, log } = this;
    log.debug(`${WatchBlocksV1.Subscribe} => ${socket.id}`);
    log.error("FIXME - this is not yet implemented");
  }
}
