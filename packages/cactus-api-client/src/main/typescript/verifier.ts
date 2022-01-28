/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verifier.ts
 */

import { Subscription } from "rxjs";

import { Logger } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { ISocketApiClient } from "@hyperledger/cactus-core-api";

/**
 * Interface required for monitoring ledger event using callback to Verifier.startMonitor()
 */
export interface VerifierEventListener<BlockType> {
  onEvent(ledgerEvent: BlockType): void;
  onError?(err: any): void;
}

/**
 * Utility type for retrieving monitoring event / new block type from generic ISocketApiClient interface.
 */
type BlockTypeFromSocketApi<T> = T extends ISocketApiClient<infer U>
  ? U
  : never;

/**
 * Extends ledger connector ApiClient with additional monitoring methods (using callbacks, instead of reactive).
 *
 * @remarks
 * Migrated from cmd-socketio-server for merging the codebases.
 */
export class Verifier<LedgerApiType extends ISocketApiClient<unknown>> {
  private readonly log: Logger;
  readonly className: string;
  readonly runningMonitors = new Map<string, Subscription>();

  /**
   * @param ledgerApi - ApiClient for communicating with ledger connector plugin (must implement `ISocketApiClient`)
   * @param logLevel - Log level used by the Verifier.
   */
  constructor(
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
   * @param eventListener - Type that supplies callbacks called when new event / error was encountered.
   * @param monitorOptions - Options passed to the validator.
   */
  startMonitor(
    appId: string,
    eventListener: VerifierEventListener<BlockTypeFromSocketApi<LedgerApiType>>,
    monitorOptions?: Record<string, unknown>,
  ): void {
    if (this.runningMonitors.has(appId)) {
      throw new Error(`Monitor with appId '${appId}' is already running!`);
    }

    this.log.debug("call : startMonitor appId =", appId);

    try {
      const blocksObservable = this.ledgerApi.watchBlocksV1(monitorOptions);

      const watchBlocksSub = blocksObservable.subscribe({
        next: (blockData: unknown) => {
          eventListener.onEvent(
            blockData as BlockTypeFromSocketApi<LedgerApiType>,
          );
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
}
