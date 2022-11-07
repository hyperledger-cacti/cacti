/**
 * Stress test to detect possible memory leaks in cactus-verifier-client.
 * Repeated requests are sent to go-ethereum validator (packages/cactus-plugin-ledger-connector-go-ethereum-socketio).
 * Run command:
 *  node --expose-gc --no-opt dist/main/typescript/verifier-with-go-eth-stress-check.js
 */

const STRESS_LOG_FILENAME = "integration-with-verifier-client-stress.log";
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

// Ledger settings
const imageName = "openethereum/openethereum";
const imageVersion = "v3.3.5";

// ApiClient settings
const syncReqTimeout = 1000 * 10; // 10 seconds

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import {
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { SelfSignedPkiGenerator } from "@hyperledger/cactus-cmd-api-server";
import { SocketIOApiClient } from "@hyperledger/cactus-api-client";
import {
  Verifier,
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

import { Server as HttpsServer } from "https";
import { Account } from "web3-core";
import { appendFileSync, writeFileSync } from "fs";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "integration-with-verifier-client-stress.test",
  level: testLogLevel,
});

let ledger: OpenEthereumTestLedger;
let connectorCertValue: string;
let connectorPrivKeyValue: string;
let connectorServer: HttpsServer;
let verifier: Verifier<SocketIOApiClient>;
let constTestAcc: Account;
const constTestAccBalance = 5 * 1000000;

/**
 * Check current memory usage, log it to the screen and write it to a file for future analysis.
 */
function checkMemory(): void {
  if (global.gc) {
    log.info("Run GC");
    global.gc();
  } else {
    throw new Error("Run with --expose-gc");
  }

  const memoryUsage = process.memoryUsage();
  const entry = [
    memoryUsage.rss,
    memoryUsage.heapTotal,
    memoryUsage.heapUsed,
    memoryUsage.external,
    memoryUsage.arrayBuffers,
  ].join(", ");

  log.warn(entry);
  appendFileSync(STRESS_LOG_FILENAME, entry + "\n");
}

/**
 * Startup the ledger and cactus connector
 */
async function setupEnvironment(): Promise<void> {
  log.info("Prune Docker...");
  await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

  log.info(`Start Ledger ${imageName}:${imageVersion}...`);
  ledger = new OpenEthereumTestLedger({
    imageName,
    imageVersion,
    emitContainerLogs: true,
    logLevel: sutLogLevel,
  });
  await ledger.start();
  const ledgerRpcUrl = await ledger.getRpcApiWebSocketHost();
  log.info(`Ledger started, RPC: ${ledgerRpcUrl}`);

  // Create Test Account
  constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

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
    logLevel: sutLogLevel,
    ledgerUrl: ledgerRpcUrl,
  };
  const configJson = JSON.stringify(connectorConfig);
  log.debug("Connector Config:", configJson);

  log.info("Export connector config before loading the module...");
  process.env["NODE_CONFIG"] = configJson;

  const conenctorModule = await import(
    "@hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio"
  );
  // Run the connector
  connectorServer = await conenctorModule.startGoEthereumSocketIOConnector();
  const connectorAddress = connectorServer.address();
  if (!connectorAddress || typeof connectorAddress === "string") {
    throw new Error("Unexpected go-ethereum connector AddressInfo type");
  }
  log.info(
    "Go-Ethereum-SocketIO Connector started on:",
    `${connectorAddress.address}:${connectorAddress.port}`,
  );

  // Create Verifier
  const ledgerPluginInfo: VerifierFactoryConfig = [
    {
      validatorID: "go-eth-socketio-test",
      validatorType: "legacy-socketio",
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
      ledgerInfo: {
        ledgerAbstract: "Go-Ethereum Ledger",
      },
      apiInfo: [],
    },
  ];
  const verifierFactory = new VerifierFactory(ledgerPluginInfo);
  verifier = verifierFactory.getVerifier(
    "go-eth-socketio-test",
    "legacy-socketio",
  );

  // Clear the stress log file
  writeFileSync(STRESS_LOG_FILENAME, "");
}

/**
 * Cleanup the ledger and cactus connector
 */
async function cleanupEnvironment(): Promise<void> {
  log.info("FINISHING THE TESTS");

  if (verifier) {
    log.info("Close Verifier ApiClient connection...");
    verifier.ledgerApi.close();
  }

  // Report after verifier close
  await new Promise((resolve) => setTimeout(resolve, 2000));
  checkMemory();

  if (connectorServer) {
    log.info("Stop the ethereum connector...");
    await new Promise<void>((resolve) =>
      connectorServer.close(() => resolve()),
    );
  }

  if (ledger) {
    log.info("Stop the ethereum ledger...");
    await ledger.stop();
    await ledger.destroy();
  }

  log.info("Prune Docker...");
  await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
}

/**
 * Stress test body
 */
async function executeTest(): Promise<void> {
  // getNumericBalance input
  const getBalanceMethod = { type: "function", command: "getNumericBalance" };
  const getBalanceArgs = {
    args: [constTestAcc.address],
  };

  // Initial memory report
  await new Promise((resolve) => setTimeout(resolve, 5000));
  checkMemory();

  // Test loop
  const startTime = Date.now();
  let count = 10000;
  while (count-- > 0) {
    try {
      await verifier.sendSyncRequest({}, getBalanceMethod, getBalanceArgs);
      //checkMemory();
    } catch (error) {
      log.error(error);
    }
  }
  const endTime = Date.now();
  log.info(`Execution time: ${(endTime - startTime) / 1000} seconds.`);

  // Final report
  await new Promise((resolve) => setTimeout(resolve, 5000));
  checkMemory();
}

/**
 * Main logic of the test
 */
export async function runStressTest(): Promise<void> {
  await setupEnvironment();
  try {
    await executeTest();
  } catch (error) {
    log.error("Stress test failed -", error);
  } finally {
    log.info("Cleanup the environment");
    await cleanupEnvironment();
  }
}

// Entry point
runStressTest();
