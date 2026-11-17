import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client-fixed-types";

import { Checks, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import {
  Constants,
  ISocketApiClient,
} from "@hyperledger-cacti/cactus-core-api";

import {
  DefaultApi,
  WatchBlocksV1,
  WatchBlocksV1Error,
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

export class CantonApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  /** socket.io host; defaults to `basePath`. */
  readonly wsApiHost?: string;
  /** socket.io path; defaults to the API server's path. */
  readonly wsApiPath?: string;
}

export class CantonApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksV1Progress>
{
  public static readonly CLASS_NAME = "CantonApiClient";

  public constructor(public readonly options: CantonApiClientOptions) {
    super(options);
    Checks.truthy(options, `${CantonApiClient.CLASS_NAME} options`);
  }

  /**
   * Streams the requested parties' transactions. The observable errors with
   * a `WatchBlocksV1Error` when the connector ends the subscription, and
   * unsubscribing closes the socket. The configured `accessToken` is sent
   * as the socket's bearer token.
   */
  public watchBlocksV1(
    options: WatchBlocksV1Options,
  ): Observable<WatchBlocksV1Progress> {
    const host = this.options.wsApiHost ?? this.options.basePath ?? "";
    Checks.nonBlankString(host, `${CantonApiClient.CLASS_NAME} wsApiHost`);
    const accessToken = this.options.accessToken;
    const socket = io(host, {
      path: this.options.wsApiPath ?? Constants.SocketIoConnectionPathV1,
      autoConnect: false,
      auth: (callback) => {
        const token =
          typeof accessToken === "function" ? accessToken() : accessToken;
        void Promise.resolve(token).then(
          (value) => callback(value ? { token: `Bearer ${value}` } : {}),
          () => callback({}),
        );
      },
    });
    const subject = new ReplaySubject<WatchBlocksV1Progress>(0);

    socket.on(WatchBlocksV1.Next, (progress: WatchBlocksV1Progress) =>
      subject.next(progress),
    );
    socket.on(WatchBlocksV1.Error, (error: WatchBlocksV1Error) =>
      subject.error(error),
    );
    socket.on("connect_error", (error: Error) => subject.error(error));
    socket.on("connect", () => socket.emit(WatchBlocksV1.Subscribe, options));
    socket.connect();

    return subject.pipe(
      finalize(() => {
        socket.emit(WatchBlocksV1.Unsubscribe);
        socket.close();
      }),
    );
  }
}
