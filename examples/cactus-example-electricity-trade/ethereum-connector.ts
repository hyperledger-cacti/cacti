import { PluginRegistry } from "@hyperledger/cactus-core";
import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { Constants, Configuration } from "@hyperledger/cactus-core-api";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import {
  PluginLedgerConnectorEthereum,
  EthereumApiClient,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "log4js";
import { Server as SocketIoServer } from "socket.io";

const config: any = ConfigUtil.getConfig();
const moduleName = "ethereum-connector";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const keychainId = uuidv4();

// Single Ethereum connector instance
let ethereumConnectorPlugin: PluginLedgerConnectorEthereum | undefined =
  undefined;
let ethereumApiClient: EthereumApiClient | undefined = undefined;

async function createEthereumConnector() {
  if (ethereumConnectorPlugin) {
    ethereumConnectorPlugin.shutdown();
    ethereumConnectorPlugin = undefined;
  }

  // Create empty Keychain Plugin
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    logLevel: config.logLevel,
    backend: new Map(),
  });

  ethereumConnectorPlugin = new PluginLedgerConnectorEthereum({
    instanceId: `ethElectricityTrade-${uuidv4()}`,
    rpcApiWsHost: config.electricityTradeInfo.ethereum.gethURL,
    logLevel: config.logLevel,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  await ethereumConnectorPlugin.onPluginInit();

  // Run http server
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const connectorServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server: connectorServer,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  // Run socketio server
  const socketioServer = new SocketIoServer(connectorServer, {
    path: Constants.SocketIoConnectionPathV1,
  });

  // Register services
  await ethereumConnectorPlugin.getOrCreateWebServices();
  await ethereumConnectorPlugin.registerWebServices(expressApp, socketioServer);

  // Create ApiClient
  const apiConfig = new Configuration({ basePath: apiHost });
  ethereumApiClient = new EthereumApiClient(apiConfig);
}

/**
 * Get latest block data. Can be used to test ethereum connection.
 */
async function getLatestBlock(): Promise<any> {
  if (!ethereumConnectorPlugin) {
    throw new Error("getLatestBlock() called before initEthereumConnector()!");
  }

  return ethereumConnectorPlugin.invokeRawWeb3EthMethod({
    methodName: "getBlock",
    params: ["latest"],
  });
}

/**
 * Create ethereum connector and check if connection can be established
 */
export async function initEthereumConnector(): Promise<void> {
  if (!ethereumConnectorPlugin) {
    await createEthereumConnector();

    const latestBlockResponse = await getLatestBlock();
    if (!latestBlockResponse.hash) {
      throw new Error(
        `Invalid getLatestBlock response: ${latestBlockResponse}`,
      );
    }

    logger.info("initEthereumConnector() done.");
  } else {
    logger.info(
      "initEthereumConnector() Ethereum connector already initialized",
    );
  }
}

/**
 * Get instance of ethereum connector, initialize it if not done yet.
 */
export async function getEthereumConnector(): Promise<PluginLedgerConnectorEthereum> {
  if (!ethereumConnectorPlugin) {
    await initEthereumConnector();
  }

  if (ethereumConnectorPlugin) {
    return ethereumConnectorPlugin;
  } else {
    throw new Error("Could not initialize new ethereum connector!");
  }
}

/**
 * Get instance of ethereum api client.
 */
export function getEthereumApiClient(): EthereumApiClient {
  if (ethereumApiClient) {
    return ethereumApiClient;
  } else {
    throw new Error("Ethereum connector not initialized yet!");
  }
}
