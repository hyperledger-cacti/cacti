import type { Socket as SocketIoSocket } from "socket.io";
import { BadRequestError, ForbiddenError } from "http-errors-enhanced-cjs";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";

import OAS from "../../json/openapi.json";
import {
  WatchBlocksV1,
  WatchBlocksV1Error,
  WatchBlocksV1Options,
} from "../generated/openapi/typescript-axios";
import type { PluginLedgerConnectorCanton } from "../plugin-ledger-connector-canton";
import { toCantonErrorResponse } from "./handle-canton-endpoint-error";

/** The stream reveals contract data, so it requires the contract-read scope. */
export const WATCH_BLOCKS_REQUIRED_SCOPES: readonly string[] =
  OAS.paths[
    "/api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-active-contracts"
  ].post.security[0].bearerTokenAuth;

const OPTION_KEYS: ReadonlySet<string> = new Set([
  "parties",
  "templateIds",
  "interfaceIds",
  "lastSeenOffset",
]);

export interface IWatchBlocksV1EndpointOptions {
  readonly socket: SocketIoSocket;
  readonly connector: PluginLedgerConnectorCanton;
  readonly pollIntervalMs: number;
  readonly logLevel?: LogLevelDesc;
  readonly onStop?: (endpoint: WatchBlocksV1Endpoint) => void;
}

/**
 * Scopes of the JWT the API server verified for this socket (the
 * `@thream/socketio-jwt` authorizer stores it as `decodedToken`), or none.
 */
function grantedScopes(socket: SocketIoSocket): readonly string[] {
  const token = (socket as { decodedToken?: unknown }).decodedToken;
  const scope =
    typeof token === "object" && token !== null
      ? (token as { scope?: unknown }).scope
      : undefined;
  if (typeof scope === "string") {
    return scope.split(" ");
  }
  return Array.isArray(scope)
    ? scope.filter((value): value is string => typeof value === "string")
    : [];
}

/**
 * Streams the transactions of the requested parties to one socket. It polls
 * the update stream through the connector, so party policy, timeouts,
 * in-flight limits and error sanitization match the REST endpoints. The
 * subscription ends on Unsubscribe, disconnect, connector shutdown, or the
 * first error, which is sent once as WatchBlocksV1.Error.
 */
export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private stopped = false;
  private sleepTimer?: ReturnType<typeof setTimeout>;
  private wakeUp?: () => void;

  public constructor(private readonly options: IWatchBlocksV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.socket, `${fnTag} options.socket`);
    Checks.truthy(options.connector, `${fnTag} options.connector`);
    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: options.logLevel ?? "INFO",
    });
  }

  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  public get isStopped(): boolean {
    return this.stopped;
  }

  /** Starts streaming in the background; failures go to the socket. */
  public start(options: unknown): void {
    void this.run(options);
  }

  /** Ends the subscription, first sending `error` to the client if given. */
  public stop(error?: unknown): void {
    if (this.stopped) {
      return;
    }
    if (error !== undefined) {
      this.emitError(error);
    }
    this.stopped = true;
    clearTimeout(this.sleepTimer);
    this.wakeUp?.();
    this.options.onStop?.(this);
  }

  private async run(options: unknown): Promise<void> {
    const { socket, connector } = this.options;
    try {
      const granted = grantedScopes(socket);
      if (!WATCH_BLOCKS_REQUIRED_SCOPES.every((s) => granted.includes(s))) {
        throw new ForbiddenError("Insufficient scope for WatchBlocksV1.");
      }
      const filter = this.validateOptions(options);
      let beginExclusive = filter.lastSeenOffset;
      while (!this.stopped) {
        const page = await connector.readUpdates({
          parties: filter.parties,
          templateIds: filter.templateIds,
          interfaceIds: filter.interfaceIds,
          beginExclusive,
        });
        for (const transaction of page.transactions) {
          if (this.stopped) {
            return;
          }
          socket.emit(WatchBlocksV1.Next, transaction);
        }
        beginExclusive = page.nextOffset;
        if (!page.limitReached) {
          await this.sleep();
        }
      }
    } catch (error: unknown) {
      this.stop(error);
    }
  }

  private emitError(error: unknown): void {
    const { socket } = this.options;
    const { statusCode, body } = toCantonErrorResponse(
      error,
      `${this.className} subscription for socket ${socket.id} failed`,
      this.log,
    );
    const payload: WatchBlocksV1Error = { statusCode, ...body };
    socket.emit(WatchBlocksV1.Error, payload);
  }

  /**
   * socket.io messages bypass the API server's OpenAPI validator, so the
   * object shape is checked here; field values are validated by
   * readUpdates() like the REST requests.
   */
  private validateOptions(options: unknown): WatchBlocksV1Options {
    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new BadRequestError("WatchBlocksV1 options must be an object.");
    }
    if (Object.keys(options).some((key) => !OPTION_KEYS.has(key))) {
      throw new BadRequestError(
        "WatchBlocksV1 options contain an unknown key.",
      );
    }
    return options as WatchBlocksV1Options;
  }

  private sleep(): Promise<void> {
    return new Promise((resolve) => {
      this.wakeUp = resolve;
      this.sleepTimer = setTimeout(resolve, this.options.pollIntervalMs);
    });
  }
}
