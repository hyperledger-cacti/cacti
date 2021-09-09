import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { Socket, io } from "socket.io-client";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants, BaseAPI } from "@hyperledger/cactus-core-api";
import { WatchBlocksV1 } from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class VerifierCcApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

export class VerifierCcApiClient extends BaseAPI {
  public static readonly CLASS_NAME = "VerifierCcApiClient";

  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;

  public get className(): string {
    return VerifierCcApiClient.CLASS_NAME;
  }

  constructor(public readonly options: VerifierCcApiClientOptions) {
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

  public async watchBlocksV1(): Promise<Observable<unknown>> {
    const socket: Socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<unknown>(0);

    socket.on(WatchBlocksV1.Next, (data: unknown) => {
      subject.next(data);
    });

    socket.on("connect", () => {
      console.log("connected OK...");
      socket.emit(WatchBlocksV1.Subscribe);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        console.log("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.disconnect();
      }),
      // TODO: Investigate if we need these below - in theory without these
      // it could happen that only the fist subscriber gets the last emitted value
      // publishReplay(1),
      // refCount(),
    );
  }
}
