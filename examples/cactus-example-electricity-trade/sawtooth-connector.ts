import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { Constants, Configuration } from "@hyperledger/cactus-core-api";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import {
  PluginLedgerConnectorSawtooth,
  SawtoothApiClient,
  StatusResponseV1,
} from "@hyperledger/cactus-plugin-ledger-connector-sawtooth";

import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "log4js";
import { Server as SocketIoServer } from "socket.io";

const config: any = ConfigUtil.getConfig();
const moduleName = "sawtooth-connector";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Single Sawtooth connector instance
let sawtoothConnectorPlugin: PluginLedgerConnectorSawtooth | undefined =
  undefined;
let sawtoothApiClient: SawtoothApiClient | undefined = undefined;

async function createSawtoothConnector() {
  if (sawtoothConnectorPlugin) {
    sawtoothConnectorPlugin.shutdown();
    sawtoothConnectorPlugin = undefined;
  }

  sawtoothConnectorPlugin = new PluginLedgerConnectorSawtooth({
    instanceId: `ethElectricityTrade-${uuidv4()}`,
    sawtoothRestApiEndpoint: config.electricityTradeInfo.sawtooth.restApiURL,
    logLevel: config.logLevel,
  });

  await sawtoothConnectorPlugin.onPluginInit();

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
  await sawtoothConnectorPlugin.getOrCreateWebServices();
  await sawtoothConnectorPlugin.registerWebServices(expressApp, socketioServer);

  // Create ApiClient
  const apiConfig = new Configuration({ basePath: apiHost });
  sawtoothApiClient = new SawtoothApiClient(apiConfig);
}

/**
 * Get latest block data. Can be used to test sawtooth connection.
 */
async function getStatus(): Promise<StatusResponseV1> {
  if (!sawtoothConnectorPlugin) {
    throw new Error("getLatestBlock() called before initSawtoothConnector()!");
  }

  return sawtoothConnectorPlugin.getStatus();
}

/**
 * Create sawtooth connector and check if connection can be established
 */
export async function initSawtoothConnector(): Promise<void> {
  if (!sawtoothConnectorPlugin) {
    await createSawtoothConnector();

    const connectorStatus = await getStatus();
    if (!connectorStatus.initialized) {
      throw new Error(`Invalid getLatestBlock response: ${connectorStatus}`);
    }

    logger.info("initSawtoothConnector() done.");
  } else {
    logger.info(
      "initSawtoothConnector() Sawtooth connector already initialized",
    );
  }
}

/**
 * Get instance of sawtooth connector, initialize it if not done yet.
 */
export async function getSawtoothConnector(): Promise<PluginLedgerConnectorSawtooth> {
  if (!sawtoothConnectorPlugin) {
    await initSawtoothConnector();
  }

  if (sawtoothConnectorPlugin) {
    return sawtoothConnectorPlugin;
  } else {
    throw new Error("Could not initialize new sawtooth connector!");
  }
}

/**
 * Get instance of sawtooth api client.
 */
export function getSawtoothApiClient(): SawtoothApiClient {
  if (sawtoothApiClient) {
    return sawtoothApiClient;
  } else {
    throw new Error("Sawtooth connector not initialized yet!");
  }
}
