import { Observable, ReplaySubject } from "rxjs";
import { finalize, share } from "rxjs/operators";
import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import { ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  DefaultApi,
  GetMonitorTransactionsV1ResponseTxInner,
} from "../generated/openapi/typescript-axios";
import { Configuration } from "../generated/openapi/typescript-axios/configuration";

const DEFAULT_POLL_RATE_MS = 5000;

type CordaBlock = GetMonitorTransactionsV1ResponseTxInner;

/**
 * Options for CordaApiClient.watchBlocksV1  method.
 */
export type watchBlocksV1Options = {
  readonly stateFullClassName: string;
  readonly clientAppId: string;
  readonly pollRate?: number;
};

export class CordaApiClientOptions extends Configuration {
  readonly logLevel?: LogLevelDesc;
}

/**
 * ApiClient to call remote Corda connector.
 */
export class CordaApiClient
  extends DefaultApi
  implements ISocketApiClient<CordaBlock>
{
  public static readonly CLASS_NAME = "CordaApiClient";

  private readonly log: Logger;

  public get className(): string {
    return CordaApiClient.CLASS_NAME;
  }

  constructor(public readonly options: CordaApiClientOptions) {
    super(options);
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.debug(`Created ${this.className} OK.`);
    this.log.debug(`basePath=${this.options.basePath}`);
  }

  /**
   * Send low-level HTTP API startMonitorV1 to the connector to start monitoring queue for specified client.
   * Errors are pushed to RxJs subject.
   *
   * @param subject RxJs subject associated with this monitoring request.
   * @param clientAppId Client application ID to identify monitoring queue on the connector.
   * @param stateName Corda state to monitor.
   */
  private async sendStartMonitorRequest(
    subject: ReplaySubject<GetMonitorTransactionsV1ResponseTxInner>,
    clientAppId: string,
    stateName: string,
  ) {
    const reportError = (err: any) => {
      this.log.warn("Error in startMonitorV1:", err);
      subject.error(`startMonitorV1 for '${stateName}' transactions failed`);
    };

    try {
      const startMonRes = await this.startMonitorV1({
        clientAppId: clientAppId,
        stateFullClassName: stateName,
      });

      if (startMonRes.status != 200 || !startMonRes.data.success) {
        reportError(
          `Wrong response: status ${startMonRes.status}, success ${startMonRes.data.success}, msg ${startMonRes.data.msg}`,
        );
      } else {
        this.log.info(`Monitoring for ${stateName} transactions started.`);
      }
    } catch (err) {
      reportError(err);
    }
  }

  /**
   * Function to perform single request to read and confirm retrieval of transactions from the connector.
   * Should be executed periodically (i.e. connector should be polled for new transactions).
   * New transactions are pushed into the subject.
   *
   * @param subject RxJs subject associated with this monitoring request.
   * @param clientAppId Client application ID to identify monitoring queue on the connector.
   * @param stateName Corda state to monitor.
   */
  private async pollTransactionsLogin(
    subject: ReplaySubject<GetMonitorTransactionsV1ResponseTxInner>,
    clientAppId: string,
    stateName: string,
  ) {
    try {
      const response = await this.getMonitorTransactionsV1({
        clientAppId: clientAppId,
        stateFullClassName: stateName,
      });

      if (response.status != 200 || !response.data.success) {
        throw new Error(`Poll error: ${response.data.msg}`);
      }

      if (response.data.stateFullClassName != stateName) {
        throw new Error(
          `Received class name mismatch! ${stateName} != ${response.data.stateFullClassName}`,
        );
      }

      if (!response.data.tx) {
        this.log.debug("No new transactions, continue...");
        return;
      }

      const readTxIdx = response.data.tx.map((tx) => tx.index);
      await this.clearMonitorTransactionsV1({
        clientAppId: clientAppId,
        stateFullClassName: stateName,
        txIndexes: readTxIdx?.filter(Boolean) as string[],
      });

      response.data.tx.forEach((tx) => subject.next(tx));
    } catch (err) {
      this.log.warn("Monitor poll error for state", stateName);
      subject.error(err);
    }
  }

  /**
   * Should be called to stop monitoring on the connector.
   * Calling this will remove all pending transactions (that were not read yet)!
   *
   * @param monitor Monitoring interval set with `setTimeout`.
   * @param clientAppId Client application ID to identify monitoring queue on the connector.
   * @param stateName Corda state to monitor.
   */
  private finalizeMonitoring(
    monitor: ReturnType<typeof setTimeout>,
    clientAppId: string,
    stateName: string,
  ) {
    this.log.info("Unsubscribe from the monitoring...");

    clearInterval(monitor);

    this.stopMonitorV1({
      clientAppId: clientAppId,
      stateFullClassName: stateName,
    })
      .then((stopMonRes) => {
        if (stopMonRes.status != 200 || !stopMonRes.data.success) {
          this.log.warn(
            "Error response from stopMonitorV1:",
            stopMonRes.data.msg,
          );
        } else {
          this.log.info(`Monitoring for ${stateName} transactions stopped.`);
        }
      })
      .catch((err) => {
        this.log.warn("Error when calling stopMonitorV1:", err);
      });
  }

  /**
   * Watch new transactions (state changes) on the corda ledger.
   *
   * @param options.stateFullClassName Corda state to monitor
   * @param options.clientAppId Calling app ID. Each monitoring queue on the connector is associated with a client ID.
   * @param options.pollRate How often poll the connector for new transactions. Defaults to 5s
   *
   * @returns RxJS observable of transactions.
   */
  public async watchBlocksAsyncV1(
    options: watchBlocksV1Options,
  ): Promise<Observable<CordaBlock>> {
    Checks.truthy(options, "watchBlocksV1 missing options");
    Checks.nonBlankString(
      options.stateFullClassName,
      "watchBlocksV1 stateFullClassName empty",
    );
    Checks.nonBlankString(
      options.clientAppId,
      "watchBlocksV1 clientAppId empty",
    );
    const pollRate = options.pollRate ?? DEFAULT_POLL_RATE_MS;
    this.log.debug("Using monitoring poll rate:", pollRate);

    const subject = new ReplaySubject<CordaBlock>(0);

    // Start monitoring
    await this.sendStartMonitorRequest(
      subject,
      options.clientAppId,
      options.stateFullClassName,
    );

    // Periodically poll
    const monitoringInterval = setInterval(
      () =>
        this.pollTransactionsLogin(
          subject,
          options.clientAppId,
          options.stateFullClassName,
        ),
      pollRate,
    );

    // Share and finalize monitoring when not listened to anymore
    return subject.pipe(
      finalize(() =>
        this.finalizeMonitoring(
          monitoringInterval,
          options.clientAppId,
          options.stateFullClassName,
        ),
      ),
      share(),
    );
  }
}
