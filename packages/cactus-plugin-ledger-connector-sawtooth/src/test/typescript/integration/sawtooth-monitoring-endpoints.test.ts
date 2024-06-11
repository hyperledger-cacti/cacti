/**
 * Tests for Sawtooth connector monitoring endpoint and status endpoint (used for sanity check)
 */

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { v4 as uuidV4 } from "uuid";
import { AddressInfo } from "net";
import { Server as SocketIoServer } from "socket.io";
import type { Subscription } from "rxjs";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import {
  SawtoothTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  isWatchBlocksV1CactiTransactionsResponse,
  isWatchBlocksV1FullResponse,
  PluginLedgerConnectorSawtooth,
  SawtoothApiClient,
  WatchBlocksV1ListenerType,
  WatchBlocksV1Progress,
} from "../../../main/typescript/public-api";

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const testTimeout = 1000 * 60 * 5; // 5 minutes timeout for async tests
const setupTimeout = 1000 * 60 * 5; // 5 minutes timeout for setup
const watchBlocksPollTime = 1000 * 3; // 3 seconds

// Ledger settings
const containerImageName = "ghcr.io/hyperledger/cactus-sawtooth-all-in-one";
const containerImageVersion = "2022-11-21-9da24a0";

// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "sawtooth-monitoring-endpoints.test",
  level: testLogLevel,
});

describe("Sawtooth monitoring endpoints tests", () => {
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });
  let ledger: SawtoothTestLedger;
  let connector: PluginLedgerConnectorSawtooth;
  let apiClient: SawtoothApiClient;

  //////////////////////////////////
  // Helpers
  //////////////////////////////////

  /**
   * Common logic for executing watchBlock monitoring tests.
   * Will subscribe to new blocks and send new transaction, to trigger creation of the new block.
   *
   * @param monitorName Unique name, will be used for identification and in transaction argument.
   * @param type Type of block to receive.
   * @param checkEventCallback Callback called when received the event from the connector.
   *
   * @returns void - just await for test to finish
   */
  async function testWatchBlock(
    monitorName: string,
    type: WatchBlocksV1ListenerType,
    checkEventCallback: (event: WatchBlocksV1Progress) => void,
  ) {
    let subscription: Subscription | undefined = undefined;

    // Start monitoring
    const monitorPromise = new Promise<boolean>((resolve, reject) => {
      const watchObservable = apiClient.watchBlocksV1({
        type,
        txFilterBy: {
          family_name: "intkey",
        },
      });

      subscription = watchObservable.subscribe({
        next(event) {
          log.debug("Received event:", JSON.stringify(event));
          try {
            checkEventCallback(event);
            subscription?.unsubscribe();
            resolve(true);
          } catch (err) {
            log.error("watchBlocksV1() event check error:", err);
            subscription?.unsubscribe();
            reject(err);
          }
        },
        error(err) {
          log.error("watchBlocksV1() error:", err);
          subscription?.unsubscribe();
          reject(err);
        },
      });
    });

    // Wait for at least one monitor routine to finish before sending transactions
    await new Promise((resolve) =>
      setTimeout(resolve, 2 * watchBlocksPollTime),
    );

    // Create new asset to trigger new block creation
    let keyId = 1;
    while (keyId++) {
      const sleepPromise: Promise<undefined> = new Promise((resolve) =>
        setTimeout(resolve, watchBlocksPollTime),
      );

      // infinite loop
      // Set new key
      const keyName = monitorName + keyId;
      await ledger.runSawtoothShell(["intkey", "set", keyName, "42"]);
      await ledger.runSawtoothShell(["intkey", "inc", keyName, "11"]);

      // Wait for 2 seconds or for new block to arrive
      const resolvedValue = await Promise.race([monitorPromise, sleepPromise]);
      log.debug("Monitor: resolvedValue", resolvedValue);
      if (resolvedValue) {
        log.info("Resolved watchBlock promise");
        await Promise.all([monitorPromise, sleepPromise]);
        break;
      }
    }
  }

  //////////////////////////////////
  // Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info(`Start Ledger ${containerImageName}:${containerImageVersion}...`);
    ledger = new SawtoothTestLedger({
      containerImageName,
      containerImageVersion,
      emitContainerLogs: false,
      logLevel: sutLogLevel,
      useRunningLedger,
    });
    await ledger.start();
    const ledgerRestApi = await ledger.getRestApiHost();
    log.info(`Ledger started, API: ${ledgerRestApi}`);

    log.info("Setup ApiServer...");
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    apiClient = new SawtoothApiClient(new Configuration({ basePath: apiHost }));

    log.info("Setup Connector...");
    connector = new PluginLedgerConnectorSawtooth({
      instanceId: uuidV4(),
      logLevel: testLogLevel,
      sawtoothRestApiEndpoint: ledgerRestApi,
      watchBlocksPollTime,
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (apiClient) {
      log.info("Close ApiClient connections...");
      apiClient.close();
    }

    if (server) {
      log.info("Stop the HTTP and SocketIO server connector...");
      await Servers.shutdown(server);
    }

    if (connector) {
      log.info("Shutdown Sawtooth connector...");
      connector.shutdown();
    }

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the sawtooth ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("get status returns valid response", async () => {
    const statusResponse = await apiClient.getStatusV1();
    expect(statusResponse).toBeTruthy();
    expect(statusResponse.status).toBe(200);
    const status = statusResponse.data;
    expect(status).toBeTruthy();
    expect(status.instanceId).toBeTruthy();
    expect(status.openApiSpecVersion).toBeTruthy();
    expect(status.initialized).toBeTrue();
    expect(status.sawtoothStatus).toBeTruthy();
  });

  test(
    "watchBlocksV1 returns cacti transactions",
    async () => {
      await testWatchBlock(
        "cactiTx",
        WatchBlocksV1ListenerType.CactiTransactions,
        (event) => {
          // Check response body
          if (!isWatchBlocksV1CactiTransactionsResponse(event)) {
            throw new Error(
              `Unexpected response from the connector: ${JSON.stringify(
                event,
              )}`,
            );
          }

          for (const tx of event.cactiTransactionsEvents) {
            expect(tx).toBeTruthy();
            expect(tx.header).toBeTruthy();
            expect(tx.header_signature).toBeTruthy();
            expect(tx.payload).toBeTruthy();
            expect(tx.payload_decoded).toBeTruthy();
          }

          log.info("Received cactiTransactionsEvents passed validation - OK!");
        },
      );
    },
    testTimeout,
  );

  test(
    "watchBlocksV1 returns full blocks",
    async () => {
      await testWatchBlock(
        "cactiFullBlock",
        WatchBlocksV1ListenerType.Full,
        (event) => {
          // Check response body
          if (!isWatchBlocksV1FullResponse(event)) {
            throw new Error(
              `Unexpected response from the connector: ${JSON.stringify(
                event,
              )}`,
            );
          }

          const block = event.fullBlock;
          expect(block).toBeTruthy();
          expect(block.batches).toBeTruthy();
          expect(block.header).toBeTruthy();
          expect(block.header_signature).toBeTruthy();

          log.info("Received cactiTransactionsEvents passed validation - OK!");
        },
      );
    },
    testTimeout,
  );
});
