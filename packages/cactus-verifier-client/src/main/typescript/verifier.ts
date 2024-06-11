/*
 * Copyright 2020-2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * verifier.ts
 */

import type { Subscription } from "rxjs";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ISocketApiClient,
  IVerifier,
  IVerifierEventListener,
} from "@hyperledger/cactus-core-api";

export {
  IVerifierEventListener,
  LedgerEvent,
} from "@hyperledger/cactus-core-api";

/**
 * Utility type for retrieving monitoring event / new block type from generic ISocketApiClient interface.
 */
type BlockTypeFromSocketApi<T> =
  T extends ISocketApiClient<infer U> ? U : never;

/**
 * Extends ledger connector ApiClient with additional monitoring methods (using callbacks, instead of reactive).
 *
 * @todo Don't throw exception for not supported operations, don't include these methods at all (if possible)
 */
export class Verifier<LedgerApiType extends ISocketApiClient<unknown>>
  implements IVerifier
{
  private readonly log: Logger;
  readonly className: string;
  readonly runningMonitors = new Map<string, Subscription>();

  /**
   * @param ledgerApi - ApiClient for communicating with ledger connector plugin (must implement `ISocketApiClient`)
   * @param logLevel - Log level used by the Verifier.
   */
  constructor(
    public readonly verifierID: string,
    public readonly ledgerApi: LedgerApiType,
    logLevel: LogLevelDesc = "INFO",
  ) {
    this.className = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({
      level: logLevel,
      label: this.className,
    });
    this.log.debug("Created Verifier for ledger API");
  }

  /**
   * Start monitoring for new events / blocks from underlying ledger.
   *
   * @param appId - Used to track different apps that use the monitoring.
   *                Each app has one subscription to common monitoring subject returned by the ApiClient watch method.
   * @param options - Options passed to the validator.
   * @param eventListener - Type that supplies callbacks called when new event / error was encountered.
   *
   * @todo Change return type from Promise<void> to void, this method is already async by design.
   */
  async startMonitor(
    appId: string,
    options: Record<string, unknown>,
    eventListener: IVerifierEventListener<
      BlockTypeFromSocketApi<LedgerApiType>
    >,
  ): Promise<void> {
    if (!(this.ledgerApi.watchBlocksV1 || this.ledgerApi.watchBlocksAsyncV1)) {
      throw new Error("startMonitor not supported on this ledger");
    }

    if (this.runningMonitors.has(appId)) {
      throw new Error(`Monitor with appId '${appId}' is already running!`);
    }

    this.log.debug("call : startMonitor appId =", appId);

    try {
      const blocksObservable = this.ledgerApi.watchBlocksV1
        ? this.ledgerApi.watchBlocksV1(options)
        : await this.ledgerApi.watchBlocksAsyncV1?.(options);

      if (!blocksObservable) {
        throw new Error(
          "Could not get a valid blocks observable in startMonitor",
        );
      }

      const watchBlocksSub = blocksObservable.subscribe({
        next: (blockData: unknown) => {
          const event = {
            id: "",
            verifierId: this.verifierID,
            data: blockData as BlockTypeFromSocketApi<LedgerApiType>,
          };
          eventListener.onEvent(event);
        },
        error: (err) => {
          this.log.error("Error when watching for new blocks, err:", err);
          if (eventListener.onError) {
            eventListener.onError(err);
          }
        },
        complete: () => {
          this.log.info("Watch completed");
        },
      });

      this.runningMonitors.set(appId, watchBlocksSub);
      this.log.debug(
        "New monitor added, runningMonitors.size ==",
        this.runningMonitors.size,
      );
    } catch (err) {
      this.log.error(`##Error: startMonitor, ${err}`);
      this.runningMonitors.delete(appId);
    }
  }

  /**
   * Stops the monitor for specified app, removes it's subscription from internal storage.
   *
   * @param appId - ID of application that requested the monitoring.
   */
  stopMonitor(appId: string): void {
    if (!this.ledgerApi.watchBlocksV1) {
      throw new Error("stopMonitor not supported on this ledger");
    }

    const watchBlocksSub = this.runningMonitors.get(appId);
    if (!watchBlocksSub) {
      throw new Error("No monitor running with appId: " + appId);
    }
    watchBlocksSub.unsubscribe();
    this.runningMonitors.delete(appId);

    this.log.debug(
      "Monitor removed, runningMonitors.size ==",
      this.runningMonitors.size,
    );
  }

  /**
   * Immediately sends request to the validator, doesn't report any error or responses.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   *
   * @todo Change return type from Promise<void> to void, this method is already async by design.
   */
  async sendAsyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: unknown,
  ): Promise<void> {
    if (!this.ledgerApi.sendAsyncRequest) {
      throw new Error("sendAsyncRequest not supported on this ledger");
    }

    return this.ledgerApi.sendAsyncRequest(contract, method, args);
  }

  /**
   * Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   * @returns Promise that will resolve with response from the ledger, or reject when error occurred.
   */
  async sendSyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: unknown,
  ): Promise<unknown> {
    if (!this.ledgerApi.sendSyncRequest) {
      throw new Error("sendSyncRequest not supported on this ledger");
    }

    return this.ledgerApi.sendSyncRequest(contract, method, args);
  }
}
