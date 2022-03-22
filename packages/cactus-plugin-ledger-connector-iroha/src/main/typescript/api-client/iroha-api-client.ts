import { Observable, ReplaySubject, share } from "rxjs";
import { finalize } from "rxjs/operators";
import { Socket, io } from "socket.io-client";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  IrohaSocketSessionEvent,
  IrohaBlockProgress,
  IrohaBaseConfig,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";
import { RuntimeError } from "run-time-error";

export class IrohaApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

export class IrohaApiClient
  extends DefaultApi
  implements ISocketApiClient<IrohaBlockProgress> {
  public static readonly CLASS_NAME = "IrohaApiClient";
  private readonly log: Logger;
  private readonly wsApiHost: string;
  private readonly wsApiPath: string;
  public get className(): string {
    return IrohaApiClient.CLASS_NAME;
  }

  constructor(public readonly options: IrohaApiClientOptions) {
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

    Checks.nonBlankString(
      this.wsApiHost,
      `${this.className}::constructor() wsApiHost`,
    );
    Checks.nonBlankString(
      this.wsApiPath,
      `${this.className}::constructor() wsApiPath`,
    );
  }

  /**
   * Start monitoring for new blocks on the Iroha ledger.
   * @param monitorOptions - Options to be passed to validator `startMonitoring` procedure.
   * @returns RxJs Observable, `next` - new block, `error` - any error from the validator.
   */
  public watchBlocksV1(
    monitorOptions?: Record<string, unknown>,
  ): Observable<IrohaBlockProgress> {
    const socket: Socket = io(this.wsApiHost, { path: this.wsApiPath });
    const subject = new ReplaySubject<IrohaBlockProgress>(0);
    this.log.debug(monitorOptions);
    socket.on(IrohaSocketSessionEvent.Next, (data: IrohaBlockProgress) => {
      subject.next(data);
    });

    socket.on("connect", () => {
      this.log.debug("connected OK...");
      socket.emit(IrohaSocketSessionEvent.Subscribe, monitorOptions);
    });

    socket.connect();

    socket.on("connect_error", (err: Error) => {
      this.log.error("Error (connect_error): ", err);
      socket.disconnect();
      subject.error(err);
    });

    socket.on("connect_timeout", (err: Record<string, unknown>) => {
      this.log.error("Error (connect_timeout): ", err);
      socket.disconnect();
      subject.error(err);
    });

    return subject.pipe(
      finalize(() => {
        this.log.info("FINALIZE - unsubscribing from the stream...");
        socket.emit(IrohaSocketSessionEvent.Unsubscribe);
        socket.disconnect();
      }),
      share(),
    );
  }

  /**
   * Immediately sends request to the validator, doesn't report any error or responses.
   * @param args - arguments.
   * @param method - function / method to be executed by validator.
   * @param baseConfig - baseConfig needed to properly connect to ledger
   
   */
  public sendAsyncRequest(
    args: any,
    method: Record<string, unknown>,
    baseConfig?: IrohaBaseConfig,
  ): void {
    this.log.debug(`inside: sendAsyncRequest()`);
    this.log.debug(`baseConfig=${baseConfig}`);
    this.log.debug(`methodName=${method.methodName}`);
    this.log.debug(`args=${args}`);

    if (baseConfig === undefined || baseConfig === {}) {
      throw new RuntimeError("baseConfig object must exist and not be empty");
    }

    if (
      baseConfig.privKey === undefined ||
      baseConfig.creatorAccountId === undefined ||
      baseConfig.irohaHost === undefined ||
      baseConfig.irohaPort === undefined ||
      baseConfig.quorum === undefined ||
      baseConfig.timeoutLimit === undefined
    ) {
      throw new RuntimeError("Some fields in baseConfig are undefined");
    }

    if (method.methodName === undefined || method.methodName === "") {
      throw new RuntimeError("methodName parameter must be specified");
    }

    const socket: Socket = io(this.wsApiHost, { path: this.wsApiPath });
    const asyncRequestData = {
      baseConfig: baseConfig,
      methodName: method.methodName,
      args: args,
    };

    this.log.debug("requestData:", asyncRequestData);

    try {
      socket.emit(IrohaSocketSessionEvent.SendAsyncRequest, asyncRequestData);
    } catch (err) {
      this.log.error("Exception in: sendAsyncRequest(): ", err);
      throw err;
    }
  }

  /**
   * Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
   * @param args - arguments.
   * @param method - function / method to be executed by validator.
   * @param baseConfig - baseConfig needed to properly connect to ledger
   * @returns Promise that will resolve with response from the ledger, or reject when error occurred.
   */
  public sendSyncRequest(
    args: any,
    method: Record<string, unknown>,
    baseConfig?: IrohaBaseConfig,
  ): Promise<any> {
    this.log.debug(`inside: sendSyncRequest()`);
    this.log.debug(`baseConfig=${baseConfig}`);
    this.log.debug(`method=${method}`);
    this.log.debug(`args=${args}`);

    if (baseConfig === undefined || baseConfig === {}) {
      throw new RuntimeError("baseConfig object must exist and not be empty");
    }

    if (
      baseConfig.privKey === undefined ||
      baseConfig.creatorAccountId === undefined ||
      baseConfig.irohaHost === undefined ||
      baseConfig.irohaPort === undefined ||
      baseConfig.quorum === undefined ||
      baseConfig.timeoutLimit === undefined
    ) {
      throw new RuntimeError("Some fields in baseConfig are undefined");
    }

    if (method.methodName === undefined || method.methodName === "") {
      throw new RuntimeError("methodName parameter must be specified");
    }

    const socket: Socket = io(this.wsApiHost, { path: this.wsApiPath });

    let responseFlag = false;

    return new Promise((resolve, reject) => {
      try {
        socket.on("connect_error", (err: Error) => {
          this.log.error("Error (connect_error): ", err);
          socket.disconnect();
          reject(err);
        });

        socket.on("connect_timeout", (err: Record<string, unknown>) => {
          this.log.error("Error (connect_timeout): ", err);
          socket.disconnect();
          reject(err);
        });

        socket.on("response", (result: any) => {
          this.log.debug("#[recv]response, res:", result);
          responseFlag = true;
          const resultObj = {
            status: result.status,
            data: result.txHash,
          };
          this.log.debug("resultObj =", resultObj);
          resolve(resultObj);
        });

        const syncRequestData = {
          baseConfig: baseConfig,
          methodName: method.methodName,
          args: args,
        };

        this.log.debug("requestData:", syncRequestData);

        try {
          socket.emit(IrohaSocketSessionEvent.SendSyncRequest, syncRequestData);
        } catch (err) {
          this.log.error("Exception in: sendAsyncRequest(): ", err);
          throw err;
        }

        setTimeout(() => {
          if (responseFlag === false) {
            resolve({ status: 504 });
          }
        }, baseConfig.timeoutLimit);
      } catch (err) {
        this.log.error("Exception in: sendSyncRequest(): ", err);
        reject(err);
      }
    });
  }
}
