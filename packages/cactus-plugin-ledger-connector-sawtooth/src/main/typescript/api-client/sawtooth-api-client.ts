import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
const { io } = require("socket.io-client-fixed-types");
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  WatchBlocksV1,
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
  Configuration,
} from "../generated/openapi/typescript-axios";

export class SawtoothApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

export class SawtoothApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksV1Progress>
{
  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  /**
   * Registry of started monitoring sessions.
   */
  private monitorSubjects = new Map<
    string,
    ReplaySubject<WatchBlocksV1Progress>
  >();

  public get className(): string {
    return "SawtoothApiClient";
  }

  constructor(public readonly options: SawtoothApiClientOptions) {
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
   * Monitor for new blocks or transactions (depends on provided options)
   *
   * @param options monitoring configuration
   * @returns rxjs observable
   */
  public watchBlocksV1(
    options?: WatchBlocksV1Options,
  ): Observable<WatchBlocksV1Progress> {
    const socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<WatchBlocksV1Progress>(0);

    socket.on(WatchBlocksV1.Next, (data: WatchBlocksV1Progress) => {
      this.log.debug("Received WatchBlocksV1.Next");
      subject.next(data);
    });

    socket.on(WatchBlocksV1.Error, (ex: string) => {
      this.log.warn("Received WatchBlocksV1.Error:", ex);
      subject.error(ex);
    });

    socket.on(WatchBlocksV1.Complete, () => {
      this.log.debug("Received WatchBlocksV1.Complete");
      subject.complete();
    });

    socket.on("connect", () => {
      this.log.info("Connected OK, sending WatchBlocksV1.Subscribe request...");
      this.monitorSubjects.set(socket.id, subject);
      socket.emit(WatchBlocksV1.Subscribe, options);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        this.log.info("FINALIZE - unsubscribing from the stream...");
        this.monitorSubjects.delete(socket.id);
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.close();
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
