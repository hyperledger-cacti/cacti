import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { Socket, io, SocketOptions } from "socket.io-client";
import { Logger, Checks, IAsyncProvider } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  WatchHealthcheckV1,
  HealthCheckResponse,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";
import { ConfigurationParameters } from "../generated/openapi/typescript-axios/configuration";
import { Optional } from "typescript-optional";

export interface IApiServerApiClientOptions extends ConfigurationParameters {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
  readonly tokenProvider?: IAsyncProvider<string>;
}

export class ApiServerApiClientConfiguration extends Configuration {
  public static readonly CLASS_NAME = "ApiServerApiClientConfiguration";

  public readonly logLevel: LogLevelDesc;
  public readonly wsApiHost: string;
  public readonly wsApiPath: string;
  public readonly tokenProvider: Optional<IAsyncProvider<string>>;

  public get className(): string {
    return ApiServerApiClient.CLASS_NAME;
  }

  constructor(public readonly options: IApiServerApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    this.logLevel = options.logLevel || "INFO";
    this.wsApiHost = options.wsApiHost || options.basePath || location.host;
    this.wsApiPath = options.wsApiPath || Constants.SocketIoConnectionPathV1;
    this.tokenProvider = Optional.ofNullable(options.tokenProvider);
    Checks.nonBlankString(this.logLevel, `${fnTag}:logLevel`);
    Checks.nonBlankString(this.wsApiHost, `${fnTag}:wsApiHost`);
    Checks.nonBlankString(this.wsApiPath, `${fnTag}:wsApiPath`);
    Checks.truthy(this.tokenProvider, `${fnTag}:tokenProvider`);
  }
}

export class ApiServerApiClient extends DefaultApi {
  public static readonly CLASS_NAME = "ApiServerApiClient";

  public readonly log: Logger;
  public readonly wsApiHost: string;
  public readonly wsApiPath: string;
  public readonly tokenProvider: Optional<IAsyncProvider<string>>;

  public get className(): string {
    return ApiServerApiClient.CLASS_NAME;
  }

  constructor(public readonly options: ApiServerApiClientConfiguration) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: options.logLevel, label });

    this.wsApiHost = options.wsApiHost;
    this.wsApiPath = options.wsApiPath;
    this.tokenProvider = options.tokenProvider;
    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`wsApiHost=${this.wsApiHost}`);
    this.log.debug(`wsApiPath=${this.wsApiPath}`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  public async watchHealthcheckV1(): Promise<Observable<HealthCheckResponse>> {
    const { log, tokenProvider } = this;

    const socketOptions: SocketOptions = {
      auth: { token: this.configuration?.baseOptions.headers.Authorization },
      path: this.wsApiPath,
    } as SocketOptions; // TODO

    const socket: Socket = io(this.wsApiHost, socketOptions);
    const subject = new ReplaySubject<HealthCheckResponse>(1);

    socket.on("error", (ex: Error) => {
      log.error("[SocketIOClient] ERROR: %o", ex);
      socket.disconnect();
      subject.error(ex);
    });

    socket.on("connect_error", async (err) => {
      log.debug("[SocketIOClient] CONNECT_ERROR: %o", err);
      if (tokenProvider.isPresent()) {
        const theProvider = tokenProvider.get(); // unwrap the Optional
        const token = await theProvider.get(); // get the actual token
        socket.auth = { token };
        this.options.baseOptions = { headers: { Authorization: token } };
        log.debug("Received fresh token from token provider OK");
      } else {
        socket.disconnect();
        subject.error(err);
        log.debug("Disconnected socket, send error to RxJS subject.");
      }
    });

    socket.on(WatchHealthcheckV1.Next, (data: HealthCheckResponse) => {
      subject.next(data);
    });

    socket.on("connect", () => {
      const transport = socket.io.engine.transport.name; // in most cases, "polling"

      socket.io.engine.on("upgrade", () => {
        const upgradedTransport = socket.io.engine.transport.name; // in most cases, "websocket"
        log.debug("[SocketIOClient] Upgraded transport=%o", upgradedTransport);
      });
      log.debug("[SocketIOClient] Connected OK");
      log.debug("[SocketIOClient] initial transport=%o", transport);
      socket.emit(WatchHealthcheckV1.Subscribe);
    });

    return subject.pipe(
      finalize(() => {
        log.debug("Emitting unsubscribe, disconnecting socket...");
        socket.emit(WatchHealthcheckV1.Unsubscribe);
        socket.disconnect();
        log.debug("Completing RxJS subject...");
        subject.complete();
        log.debug("Finalized RxJS subject OK");
      }),
      // TODO: Investigate if we need these below - in theory without these
      // it could happen that only the fist subscriber gets the last emitted value
      // publishReplay(1),
      // refCount(),
    );
  }
}
