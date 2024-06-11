/*
 * Copyright 2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper functions for setting up test geth environment for benchmark testing with artillery.
 */

// Constants
const logLevel = "info";
const containerImageName = "cactus_geth_all_in_one";
const containerImageVersion = "latest";
const artilleryConfigFileName = "geth-benchmark-config.yaml";
const artilleryFunctionsFileName = "artillery-helper-functions.js";

import express from "express";
import bodyParser from "body-parser";
import http from "http";
import path from "path";
import { AddressInfo } from "net";
import { Server as SocketIoServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
  WHALE_ACCOUNT_PRIVATE_KEY,
} from "@hyperledger/cactus-test-geth-ledger";

import {
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
} from "../../../../main/typescript/index";
import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";

const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-benchmark-env",
  level: logLevel,
});

// Global variables
let ethereumTestLedger: GethTestLedger | undefined;
let ethereumConnector: PluginLedgerConnectorEthereum | undefined;
let httpServer: http.Server | undefined;
let wsServer: SocketIoServer | undefined;

/**
 * Overwrites for artillery test config
 */
export type BenchmarkEnvironmentConfig = {
  target: string;
  variables: Record<string, string[]>;
};

export function getDefaultArtilleryConfigPath() {
  return path.resolve(path.join(__dirname, artilleryConfigFileName));
}

export function getDefaultArtilleryFunctionsPath() {
  return path.resolve(path.join(__dirname, artilleryFunctionsFileName));
}

/**
 * Setup new test environment (ledger and connector).
 *
 * @param envLogLevel log level for test environment.
 * @returns configuration overwrites for newly created environment
 */
export async function setupBenchmarkEnvironment(
  envLogLevel: LogLevelDesc = logLevel,
): Promise<BenchmarkEnvironmentConfig> {
  log.info("Prune Docker...");
  await pruneDockerAllIfGithubAction({ logLevel });

  log.info("Start GethTestLedger...");
  // log.debug("Ethereum version:", containerImageVersion);
  ethereumTestLedger = new GethTestLedger({
    containerImageName,
    containerImageVersion,
  });
  await ethereumTestLedger.start(true, ["--verbosity", "1", "--cache", "8192"]);

  const rpcApiHttpHost = await ethereumTestLedger.getRpcApiHttpHost();
  log.debug("rpcApiHttpHost:", rpcApiHttpHost);
  const rpcApiWsHost = await ethereumTestLedger.getRpcApiWebSocketHost();
  log.debug("rpcApiWsHost:", rpcApiWsHost);

  log.info("Create PluginKeychainMemory...");
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    logLevel: envLogLevel,
  });
  keychainPlugin.set(
    HelloWorldContractJson.contractName,
    JSON.stringify(HelloWorldContractJson),
  );

  log.info("Create PluginLedgerConnectorEthereum...");
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "500mb" }));
  httpServer = http.createServer(expressApp);
  wsServer = new SocketIoServer(httpServer, {
    path: Constants.SocketIoConnectionPathV1,
  });
  const addressInfo = (await Servers.listen({
    hostname: "127.0.0.1",
    port: 0,
    server: httpServer,
  })) as AddressInfo;
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  ethereumConnector = new PluginLedgerConnectorEthereum({
    rpcApiHttpHost,
    rpcApiWsHost,
    rpcApiWsSocketOptions: {
      timeout: 1000 * 60 * 2, // 2 minutes
    },
    logLevel: envLogLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });
  await ethereumConnector.getOrCreateWebServices();
  await ethereumConnector.registerWebServices(expressApp, wsServer);

  log.info("Deploy HelloWorld contract to interact with...");
  const deployOut = await ethereumConnector.deployContract({
    contract: {
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
    },
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  if (!deployOut.transactionReceipt.contractAddress) {
    throw new Error(`Could not deploy test contract: ${deployOut}`);
  }

  return {
    target: apiHost,
    variables: {
      hello_world_contract_name: [HelloWorldContractJson.contractName],
      keychain_id: [keychainPlugin.getKeychainId()],
      sender_account: [WHALE_ACCOUNT_ADDRESS],
      sender_private_key: [WHALE_ACCOUNT_PRIVATE_KEY],
    },
  };
}

/**
 * Cleanup test environment (stop the ledger, close the server)
 */
export async function cleanupBenchmarkEnvironment() {
  log.info("cleanupBenchmarkEnvironment() started...");

  if (ethereumConnector) {
    log.debug("Stopping the ethereum connector...");
    await ethereumConnector.shutdown();
    ethereumConnector = undefined;
  }

  if (httpServer) {
    log.debug("Stopping the ethereum connector HTTP server...");
    await Servers.shutdown(httpServer);
    httpServer = undefined;
  }

  if (wsServer) {
    log.debug("Stopping the ethereum connector WS server...");
    wsServer.removeAllListeners();
    wsServer.close();
    wsServer = undefined;
  }

  if (ethereumTestLedger) {
    try {
      log.debug("Stopping the ethereum ledger...");
      await ethereumTestLedger.stop();
      await ethereumTestLedger.destroy();
    } catch (error) {
      log.warn("Error when closing ethereum ledger:", error);
    } finally {
      ethereumTestLedger = undefined;
    }
  }

  await pruneDockerAllIfGithubAction({ logLevel });
  log.info("cleanupBenchmarkEnvironment() done!");
}
