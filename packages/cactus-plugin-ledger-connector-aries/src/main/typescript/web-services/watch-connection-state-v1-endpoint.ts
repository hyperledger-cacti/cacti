import type { Socket as SocketIoSocket } from "socket.io";
import {
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
} from "@aries-framework/core";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  WatchConnectionStateProgressV1,
  WatchConnectionStateV1,
} from "../generated/openapi/typescript-axios";
import { AnoncredAgent } from "../aries-types";

export interface IWatchConnectionStateV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  agent: AnoncredAgent;
}

export class WatchConnectionStateV1Endpoint {
  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchConnectionStateV1, (next: string) => void>,
    Record<
      WatchConnectionStateV1,
      (next: WatchConnectionStateProgressV1) => void
    >
  >;
  private readonly agent: AnoncredAgent;

  public get className(): string {
    return "WatchConnectionStateV1Endpoint";
  }

  constructor(
    public readonly config: IWatchConnectionStateV1EndpointConfiguration,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.socket = config.socket;
    this.agent = config.agent;
  }

  public async subscribe(): Promise<void> {
    const { socket, log, agent } = this;
    log.info(`${WatchConnectionStateV1.Subscribe} => ${socket.id}`);

    const eventListener = (e: ConnectionStateChangedEvent) => {
      socket.emit(WatchConnectionStateV1.Next, e.payload);
    };

    agent.events.on<ConnectionStateChangedEvent>(
      ConnectionEventTypes.ConnectionStateChanged,
      eventListener,
    );

    socket.on("disconnect", async (reason: string) => {
      log.info("WebSocket:disconnect reason=%o", reason);
      agent.events.off<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        eventListener,
      );
    });

    socket.on(WatchConnectionStateV1.Unsubscribe, async () => {
      agent.events.off<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        eventListener,
      );
      log.debug("WatchConnectionStateV1 unsubscribe done.");
    });

    log.debug(
      `Subscribing to connection state changes on aries agent ${agent.config.label}...`,
    );
  }
}
