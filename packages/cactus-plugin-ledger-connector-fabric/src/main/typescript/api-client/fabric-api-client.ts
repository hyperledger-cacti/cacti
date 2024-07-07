/**
 * Extension of ApiClient genereted from OpenAPI.
 * Allows operations not handled by OpenAPI (i.e. socketIO or grpc endpoints).
 */

import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { io } from "socket.io-client-fixed-types";
import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { Constants, ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  WatchBlocksResponseV1,
  WatchBlocksDelegatedSignOptionsV1,
  CactiBlockTransactionsResponseV1,
  CactiBlockTransactionEventV1,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

/**
 * Configuration for FabricApiClient
 */
export class FabricApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
  readonly wsApiHost?: string;
  readonly wsApiPath?: string;
}

/**
 * Extended ApiClient that can be used to communicate with Fabric connector.
 */
export class FabricApiClient
  extends DefaultApi
  implements ISocketApiClient<WatchBlocksResponseV1>
{
  public static readonly CLASS_NAME = "FabricApiClient";

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

  /**
   * Get this class name.
   */
  public get className(): string {
    return FabricApiClient.CLASS_NAME;
  }

  constructor(public readonly options: FabricApiClientOptions) {
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
   * Watch for new blocks on Fabric ledger. Type of response must be configured in monitorOptions.
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
   * Watch for new blocks on Fabric ledger. Type of response must be configured in monitorOptions.
   * Works with delegated signing function (no need to supply identity - requests are signing in a connector callback)
   *
   * @param monitorOptions Monitoring configuration.
   *
   * @returns Observable that will receive new blocks once they appear.
   */
  public watchBlocksDelegatedSignV1(
    monitorOptions: WatchBlocksDelegatedSignOptionsV1,
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
      socket.emit(WatchBlocksV1.SubscribeDelegatedSign, monitorOptions);
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
   * Wait for transaction with specified ID to be committed.
   * Must be started before sending the transaction (uses realtime monitoring).
   * @warning: Remember to use timeout mechanism on production
   *
   * @param txId transactionId to wait for.
   * @param monitorObservable Block observable in CactiTransactions mode (important - other mode will not work!)
   * @returns `CactiBlockTransactionEventV1` of specified transaction.
   */
  public async waitForTransactionCommit(
    txId: string,
    monitorObservable: Observable<CactiBlockTransactionsResponseV1>,
  ) {
    this.log.info("waitForTransactionCommit()", txId);

    return new Promise<CactiBlockTransactionEventV1>((resolve, reject) => {
      const subscription = monitorObservable.subscribe({
        next: (event) => {
          try {
            this.log.debug(
              "waitForTransactionCommit() Received event:",
              JSON.stringify(event),
            );
            if (!("cactiTransactionsEvents" in event)) {
              throw new Error("Invalid event type received!");
            }

            const foundTransaction = event.cactiTransactionsEvents.find(
              (tx) => tx.transactionId === txId,
            );
            if (foundTransaction) {
              this.log.info(
                "waitForTransactionCommit() Found transaction with txId",
                txId,
              );
              subscription.unsubscribe();
              resolve(foundTransaction);
            }
          } catch (err) {
            this.log.error(
              "waitForTransactionCommit() event check error:",
              err,
            );
            subscription.unsubscribe();
            reject(err);
          }
        },
        error: (err) => {
          this.log.error("waitForTransactionCommit() error:", err);
          subscription.unsubscribe();
          reject(err);
        },
      });
    });
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
