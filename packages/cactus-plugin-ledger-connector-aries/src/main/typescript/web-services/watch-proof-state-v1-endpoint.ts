import type { Socket as SocketIoSocket } from "socket.io";
import { ProofStateChangedEvent, ProofEventTypes } from "@aries-framework/core";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";

import {
  WatchProofStateProgressV1,
  WatchProofStateV1,
} from "../generated/openapi/typescript-axios";
import { AnoncredAgent } from "../aries-types";

export interface IWatchProofStateV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  agent: AnoncredAgent;
}

export class WatchProofStateV1Endpoint {
  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchProofStateV1, (next: string) => void>,
    Record<WatchProofStateV1, (next: WatchProofStateProgressV1) => void>
  >;
  private readonly agent: AnoncredAgent;

  public get className(): string {
    return "WatchProofStateV1Endpoint";
  }

  constructor(public readonly config: IWatchProofStateV1EndpointConfiguration) {
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
    log.info(`${WatchProofStateV1.Subscribe} => ${socket.id}`);

    const eventListener = (e: ProofStateChangedEvent) => {
      socket.emit(WatchProofStateV1.Next, e.payload);
    };

    agent.events.on<ProofStateChangedEvent>(
      ProofEventTypes.ProofStateChanged,
      eventListener,
    );

    socket.on("disconnect", async (reason: string) => {
      log.info("WebSocket:disconnect reason=%o", reason);
      agent.events.off<ProofStateChangedEvent>(
        ProofEventTypes.ProofStateChanged,
        eventListener,
      );
    });

    socket.on(WatchProofStateV1.Unsubscribe, async () => {
      agent.events.off<ProofStateChangedEvent>(
        ProofEventTypes.ProofStateChanged,
        eventListener,
      );
      log.debug("WatchProofStateV1 unsubscribe done.");
    });

    log.debug(
      `Subscribing to proof state changes on aries agent ${agent.config.label}...`,
    );
  }
}
