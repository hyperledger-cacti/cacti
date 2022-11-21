/**
 * Functional test of basic operations on sawtooth connector (packages/cactus-plugin-ledger-connector-sawtooth-socketio).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const testTimeout = 1000 * 2 * 60; // 2 minutes timeout for some tests
const setupTimeout = 1000 * 3 * 60; // 3 minutes timeout for setup

// Ledger settings
const containerImageName = "ghcr.io/hyperledger/cactus-sawtooth-all-in-one";
const containerImageVersion = "2022-11-21-9da24a0";
const useRunningLedger = false;

// Use for development on local sawtooth network
// const containerImageName = "sawtooth_aio_1x";
// const containerImageVersion = "1.0.0";
// const useRunningLedger = true;

// ApiClient settings
const syncReqTimeout = 1000 * 10; // 10 seconds

import {
  SawtoothTestLedger,
  SelfSignedPkiGenerator,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import "jest-extended";
import { Server as HttpsServer } from "https";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "sawtooth-socketio-connector.test",
  level: testLogLevel,
});

describe("Sawtooth-SocketIO connector tests", () => {
  let ledger: SawtoothTestLedger;
  let connectorPrivKeyValue: string;
  let connectorCertValue: string;
  let connectorServer: HttpsServer;
  let apiClient: SocketIOApiClient;

  //////////////////////////////////
  // Environment Setup
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

    // Generate connector private key and certificate
    const pkiGenerator = new SelfSignedPkiGenerator();
    const pki = pkiGenerator.create("localhost");
    connectorPrivKeyValue = pki.privateKeyPem;
    connectorCertValue = pki.certificatePem;
    const jwtAlgo = "RS512";

    const connectorConfig: any = {
      sslParam: {
        port: 0, // random port
        keyValue: connectorPrivKeyValue,
        certValue: connectorCertValue,
        jwtAlgo: jwtAlgo,
      },
      blockMonitor: {
        request: {
          method: "GET",
          host: ledgerRestApi,
          getLatestBlockNumberCommand: "blocks?limit=1",
          periodicMonitoringCommand1: "blocks?start=",
          periodicMonitoringCommand2: "&reverse",
        },
        pollingInterval: 5000
      },
      logLevel: sutLogLevel,
    };
    const configJson = JSON.stringify(connectorConfig);
    log.debug("Connector Config:", configJson);

    log.info("Export connector config before loading the module...");
    process.env["NODE_CONFIG"] = configJson;

    // Load connector module
    const connectorModule = await import("../../../main/typescript/index");

    // Run the connector
    connectorServer = await connectorModule.startSawtoothSocketIOConnector();
    expect(connectorServer).toBeTruthy();
    const connectorAddress = connectorServer.address();
    if (!connectorAddress || typeof connectorAddress === "string") {
      throw new Error("Unexpected sawtooth connector AddressInfo type");
    }
    log.info(
      "Sawtooth-SocketIO Connector started on:",
      `${connectorAddress.address}:${connectorAddress.port}`,
    );

    // Create ApiClient instance
    const apiConfigOptions = {
      validatorID: "sawtooth-socketio-test",
      validatorURL: `https://localhost:${connectorAddress.port}`,
      validatorKeyValue: connectorCertValue,
      logLevel: sutLogLevel,
      maxCounterRequestID: 1000,
      syncFunctionTimeoutMillisecond: syncReqTimeout,
      socketOptions: {
        rejectUnauthorized: false,
        reconnection: false,
        timeout: syncReqTimeout * 2,
      },
    };
    log.debug("ApiClient config:", apiConfigOptions);
    apiClient = new SocketIOApiClient(apiConfigOptions);
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (apiClient) {
      log.info("Close ApiClient connection...");
      apiClient.close();
    }

    if (connectorServer) {
      log.info("Stop the sawtooth connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    if (ledger) {
      log.info("Stop the sawtooth ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    // SocketIOApiClient has timeout running for each request which is not cancellable at the moment.
    // Wait timeout amount of seconds to make sure all handles are closed.
    await new Promise((resolve) => setTimeout(resolve, syncReqTimeout))

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Simple test to see if test sawtooth ledger is running correctly and required API is available.
   * Will set and retrieve intkey value.
   * Doesn't use apiClient or validator.
   */
  test("Sanity check ledger connection", async () => {
    const keyName = "sanityCheck";
    const keyValue = "42";

    // Set key
    const setResponse = JSON.parse(await ledger.runSawtoothShell(["intkey", "set", keyName, keyValue]));
    log.debug("setResponse:", setResponse);
    const setStatus = await ledger.waitOnTransaction(setResponse.link);
    log.info("setStatus:", setStatus);
    expect(setStatus).not.toEqual("PENDING"); // TX should be commited

    // Show key
    const showResponse = await ledger.runSawtoothShell(["intkey", "show", keyName]);
    log.info("showResponse:", showResponse);
    expect(showResponse).toContain(keyName);
    expect(showResponse).toContain(keyValue);
  });

  /**
   * Test ServerMonitorPlugin startMonitor/stopMonitor functions.
   */
   test("Monitoring returns new block", async () => {
    // Create monitoring promise and subscription
    let monitorSub: any;
    const newBlockPromise = new Promise<any>((resolve, reject) => {
      monitorSub = apiClient.watchBlocksV1({
        filterKey: "intkey"
      }).subscribe({
        next: block => resolve(block),
        error: err => reject(err),
        complete: () => reject("Unexpected watchBlocksV1 completion - reject."),
      });
    });

    // Keep adding new keys until block was received
    try {
      let keyId = 1;
      while (keyId++) { // infinite loop
        // Set new key
        const keyName = "monitorTest" + keyId;
        await ledger.runSawtoothShell(["intkey", "set", keyName, "42"]);
        await ledger.runSawtoothShell(["intkey", "inc", keyName, "11"]);
        const sleepPromise: Promise<undefined> = new Promise((resolve) => setTimeout(resolve, 2000))

        // Wait for 2 seconds or for new block to arrive
        const resolvedValue = await Promise.race([newBlockPromise, sleepPromise]);
        log.debug("Monitor: resolvedValue", resolvedValue);
        if (resolvedValue && resolvedValue!.blockData) {
          log.info("Resolved watchBlock promise");
          expect(resolvedValue.status).toEqual(200);
          expect(resolvedValue.blockData).toBeTruthy();
          break;
        }
      }
    } catch (error) {
      throw error;
    } finally {
      if (monitorSub) {
        monitorSub.unsubscribe();
      } else {
        log.warn("monitorSub was not valid, could not unsubscribe");
      }
    }
  }, testTimeout);
});
