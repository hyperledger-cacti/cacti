import { Socket as SocketIoSocket } from "socket.io";

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { HealthCheckResponse } from "../generated/openapi/typescript-axios";
import { WatchHealthcheckV1 } from "../generated/openapi/typescript-axios";

export interface IWatchHealthcheckV1EndpointOptions {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  process: NodeJS.Process;
}

export class WatchHealthcheckV1Endpoint {
  public static readonly CLASS_NAME = "WatchHealthcheckV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchHealthcheckV1, (next: string) => void>,
    Record<WatchHealthcheckV1, (next: HealthCheckResponse | Error) => void>
  >;
  private readonly process: NodeJS.Process;

  public get className(): string {
    return WatchHealthcheckV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWatchHealthcheckV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.process, `${fnTag} arg options.process`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.process = options.process;
    this.socket = options.socket;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<void> {
    const { socket, log } = this;
    log.debug(`${WatchHealthcheckV1.Subscribe} => ${socket.id}`);

    const timerId = setInterval(() => {
      try {
        const next: HealthCheckResponse = {
          createdAt: new Date().toJSON(),
          memoryUsage: this.process.memoryUsage(),
          success: true,
        };
        socket.emit(WatchHealthcheckV1.Next, next);
      } catch (ex) {
        log.error(`Failed to construct health check response:`, ex);
        socket.emit(WatchHealthcheckV1.Error, ex);
        clearInterval(timerId);
      }
    }, 1000);

    socket.on("disconnect", async (reason: string) => {
      log.debug("WebSocket:disconnect reason=%o", reason);
      clearInterval(timerId);
    });

    socket.on(WatchHealthcheckV1.Unsubscribe, () => {
      clearInterval(timerId);
    });
  }
}
