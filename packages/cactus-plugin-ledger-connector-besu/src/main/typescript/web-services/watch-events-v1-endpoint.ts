import type { Socket as SocketIoSocket } from "socket.io";
import { stringify } from "safe-stable-stringify";
import {
  Abi,
  Transport,
  PublicClient as ViemPublicClient,
  WatchContractEventParameters,
} from "viem";

import {
  Logger,
  Checks,
  bigIntToDecimalStringReplacer,
} from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ViemV2242WatchEventsV1Progress,
  WatchEventsV1Request,
} from "../generated/openapi/typescript-axios";
import { WatchEventsV1 } from "../generated/openapi/typescript-axios";
import { watchEventsV1Impl } from "../impl/watch-events-v1/watch-events-v1-impl";
import { ensure0xPrefix } from "../common/ensure-0x-prefix";

export interface IWatchEventsV1EndpointOptions {
  readonly logLevel?: LogLevelDesc;
  readonly socket: SocketIoSocket;
  readonly viemClient: ViemPublicClient;
}

export class WatchEventsV1Endpoint {
  public static readonly CLASS_NAME = "WatchEventsV1Endpoint";

  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly socket: SocketIoSocket<
    Record<WatchEventsV1, (next: string) => void>,
    Record<
      WatchEventsV1,
      (next: ViemV2242WatchEventsV1Progress | Error) => void
    >
  >;
  private readonly viemClient: ViemPublicClient;

  public get className(): string {
    return WatchEventsV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWatchEventsV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.viemClient, `${fnTag} arg options.viemClient`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.viemClient = options.viemClient;
    this.socket = options.socket;

    const { logLevel = "INFO" } = options;
    this.logLevel = logLevel;

    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: logLevel, label });
  }

  public async subscribe(req: WatchEventsV1Request): Promise<void> {
    const fn = `${this.className}#subscribe()`;
    const { socket, log, viemClient } = this;
    const { Subscribe } = WatchEventsV1;

    try {
      const { address, fromBlock, eventName, abi, requestId } = req;
      const { socketAckTimeoutMs = 30_000 } = req;
      const filters = { address, fromBlock, eventName };
      const ctxPojo = { socketId: socket.id, reqId: requestId, filters };
      const ctx = stringify(ctxPojo);
      log.debug(`%s context=%s`, Subscribe, ctx);

      const watchArgs: WatchContractEventParameters<
        Abi,
        string,
        undefined,
        Transport
      > = {
        abi: abi as Abi,
        onError: (error: Error) => {
          log.error(`%s onError() error=%o`, Subscribe, error);
        },
        onLogs: async (logs: unknown) => {
          log.debug("onLogs() Raw JSON %s", stringify(logs));

          // Contains raw `BigInt` values which cannot be safely sent over the wire
          // and will cause SocketIO serialization errors. We need to replace them with strings.
          const nextUnsafe = { logs, requestId };

          // SocketIO can't serialize BigInt so we have to convert it to a string.
          // Doing this back-and-forth serialization is wasteful but necessary.
          // Other options include modifying the prototype of BigInt which is
          // a risky enough move that we chose to pay the performance penalty instead.
          // SocketIO does not have a way to inject the custom serializer so we
          // are forced to do it here manually like this.
          const nextJson = stringify(nextUnsafe, bigIntToDecimalStringReplacer);

          log.debug("onLogs() BigInt Replaced JSON %s", nextJson);

          if (!nextJson) {
            throw new Error(`${fn} JSON stringify of logs returned falsy.`);
          }

          const nextSafe = JSON.parse(nextJson);
          socket.timeout(socketAckTimeoutMs).emit(WatchEventsV1.Next, nextSafe);
        },
      };
      if (fromBlock) {
        watchArgs.fromBlock = BigInt(fromBlock);
      }
      if (address) {
        watchArgs.address = ensure0xPrefix(address);
      }
      if (eventName) {
        watchArgs.eventName = eventName;
      }

      log.debug("Effective viem watchArgs: %s", stringify(watchArgs));

      const { unwatch } = await watchEventsV1Impl({
        logLevel: this.logLevel,
        viemClient,
        watchArgs,
      });

      log.debug("Subscribed to Viem solidity contract events OK");

      socket.on("disconnect", async (reason: string) => {
        log.debug("WebSocket:disconnect reason=%o", reason);
        unwatch();
        log.debug("unsubscribed from viem event stream");
      });

      socket.on(WatchEventsV1.Unsubscribe, () => {
        log.debug(`${WatchEventsV1.Unsubscribe}: unsubscribing Viem...`);
        unwatch();
        log.debug("unsubscribed from viem event stream");
      });
    } catch (ex) {
      const errorMessage = "Viem event subscripton crashed with exception";
      log.debug("%s=%o", errorMessage, ex);
      socket.emit(WatchEventsV1.Error, new Error(errorMessage, { cause: ex }));
    }
  }
}
