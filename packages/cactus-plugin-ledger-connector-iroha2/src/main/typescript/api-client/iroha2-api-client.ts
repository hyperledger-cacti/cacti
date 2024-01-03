/**
 * Extension of ApiClient genereted from OpenAPI.
 * Allows operations not handled by OpenAPI (i.e. socketIO or grpc endpoints).
 */

import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require("socket.io-client-fixed-types");
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

/**
 * Configuration for Iroha2ApiClient
 */
export class Iroha2ApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

/**
 * Extended ApiClient that can be used to communicate with Iroha2 connector.
 */
export class Iroha2ApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksResponseV1>
{
  public readonly className = "Iroha2ApiClient";

  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  /**
   * Registry of started monitoring sessions.
   */
  private monitorSubjects = new Map<
    string,
    ReplaySubject<WatchBlocksResponseV1>
  >();

  constructor(public readonly options: Iroha2ApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.wsApiHost = options.wsApiHost || options.basePath || location.host;
    this.wsApiPath = options.wsApiPath || Constants.SocketIoConnectionPathV1;
    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`wsApiHost=${this.wsApiHost}`);
    this.log.debug(`wsApiPath=${this.wsApiPath}`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  /**
   * Watch for new blocks on Iroha2 ledger.
   *
   * @param monitorOptions Monitoring configuration.
   *
   * @returns Observable that will receive new blocks once they appear.
   */
  public watchBlocksV1(
    monitorOptions: WatchBlocksOptionsV1,
  ): Observable<WatchBlocksResponseV1> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchBlocksResponseV1>(0);

    socket.on(WatchBlocksV1.Next, (data: WatchBlocksResponseV1) => {
      this.log.debug("Received WatchBlocksV1.Next");
      subject.next(data);
    });

    socket.on(WatchBlocksV1.Error, (ex: string) => {
      this.log.error("Received WatchBlocksV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchBlocksV1.Complete, () => {
      this.log.debug("Received WatchBlocksV1.Complete");
      subject.complete();
    });

    socket.on("connect", () => {
      this.log.info(
        `Connected client '${socket.id}', sending WatchBlocksV1.Subscribe...`,
      );
      this.monitorSubjects.set(socket.id, subject);
      socket.emit(WatchBlocksV1.Subscribe, monitorOptions);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        this.log.info(
          `FINALIZE client ${socket.id} - unsubscribing from the stream...`,
        );
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.disconnect();
        this.monitorSubjects.delete(socket.id);
      }),
    );
  }

  /**
   * Stop all ongoing monitors, terminate connections.
   *
   * @note Might take few seconds to clean up all the connections.
   */
  public close(): void {
    this.log.debug("Close all running monitors.");
    this.monitorSubjects.forEach((subject) => subject.complete());
    this.monitorSubjects.clear();
  }
}
