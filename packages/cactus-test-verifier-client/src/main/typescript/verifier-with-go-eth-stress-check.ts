/**
 * Stress test to detect possible memory leaks in cactus-verifier-client.
 * Repeated requests are sent to ethereum validator (packages/cactus-plugin-ledger-connector-ethereum).
 * Run command:
 *  node --expose-gc --no-opt dist/main/typescript/verifier-with-go-eth-stress-check.js
 */

const STRESS_LOG_FILENAME = "integration-with-verifier-client-stress.log";
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

// Ledger settings
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";
import { GethTestLedger } from "@hyperledger/cactus-test-geth-ledger";
import {
  EthereumApiClient,
  PluginLedgerConnectorEthereum,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { Verifier, VerifierFactory } from "@hyperledger/cactus-verifier-client";

import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidV4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import type { Web3Account } from "web3-eth-accounts";
import { appendFileSync, writeFileSync } from "node:fs";
import { AddressInfo } from "node:net";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "integration-with-verifier-client-stress.test",
  level: testLogLevel,
});

let ledger: GethTestLedger;
let connector: PluginLedgerConnectorEthereum;
let verifier: Verifier<EthereumApiClient>;
let constTestAcc: Web3Account;
const constTestAccBalance = 5 * 1000000;

const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);
const wsApi = new SocketIoServer(server, {
  path: Constants.SocketIoConnectionPathV1,
});
// Add custom replacer to handle bigint responses correctly
expressApp.set("json replacer", (_key: string, value: bigint | unknown) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
});

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

  log.info(`Start Ledger ${containerImageName}:${containerImageVersion}...`);
  ledger = new GethTestLedger({
    containerImageName,
    containerImageVersion,
  });
  await ledger.start();
  const ledgerRpcUrl = await ledger.getRpcApiWebSocketHost();
  log.info(`Ledger started, RPC: ${ledgerRpcUrl}`);

  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  connector = new PluginLedgerConnectorEthereum({
    instanceId: uuidV4(),
    rpcApiWsHost: ledgerRpcUrl,
    logLevel: testLogLevel,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
  });
  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);

  // Create Test Account
  constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

  // Create Verifier
  const ethereumValidatorId = "eth_openapi_connector";
  const verifierFactory = new VerifierFactory(
    [
      {
        validatorID: ethereumValidatorId,
        validatorType: "ETH_1X",
        basePath: apiHost,
        logLevel: sutLogLevel,
      },
    ],
    sutLogLevel,
  );

  verifier = await verifierFactory.getVerifier(ethereumValidatorId, "ETH_1X");

  // Clear the stress log file
  writeFileSync(STRESS_LOG_FILENAME, "");
}

/**
 * Cleanup the ledger and cactus connector
 */
async function cleanupEnvironment(): Promise<void> {
  if (server) {
    log.info("Shutdown the connector server...");
    await Servers.shutdown(server);
  }

  if (connector) {
    log.info("Shutdown the connector...");
    await connector.shutdown();
  }

  if (ledger) {
    log.info("Stop and destroy the test ledger...");
    await ledger.stop();
    await ledger.destroy();
  }

  // Report after connector close
  await new Promise((resolve) => setTimeout(resolve, 2000));
  checkMemory();

  log.info("Prune docker...");
  await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
}

/**
 * Stress test body
 */
async function executeTest(): Promise<void> {
  // getNumericBalance input
  const getBalanceMethod = { type: "web3Eth", command: "getBalance" };
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
