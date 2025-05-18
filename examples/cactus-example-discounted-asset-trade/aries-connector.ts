import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { Constants, Configuration } from "@hyperledger/cactus-core-api";
import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import {
  PluginLedgerConnectorAries,
  AriesApiClient,
} from "@hyperledger/cactus-plugin-ledger-connector-aries";

import * as path from "node:path";
import * as os from "node:os";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { readFileSync } from "fs";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "log4js";
import { Server as SocketIoServer } from "socket.io";

const config: any = ConfigUtil.getConfig();
const moduleName = "aries-connector";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Constants
const BLP_AGENT_NAME = "cactiDiscountedAssetTradeAgent";
const BLP_AGENT_INBOUND_URL = "http://127.0.0.1:5035";
const DID_INDY_NAMESPACE = "cacti:test";

const ARIES_WALLET_PATH = path.join(
  os.homedir(),
  ".cacti/cactus-example-discounted-asset-trade/wallet",
);

// Read Genesis transactions
const genesisTransactionsPath =
  "/etc/cactus/indy-all-in-one/pool_transactions_genesis";
logger.info(
  "Reading Indy genesis transactions from file:",
  genesisTransactionsPath,
);
const genesisTransactions = readFileSync(genesisTransactionsPath).toString(
  "utf-8",
);

/**
 * Configuration for local indy-all-in-one ledger.
 */
export const localTestNetwork = {
  isProduction: false,
  genesisTransactions,
  indyNamespace: DID_INDY_NAMESPACE,
  connectOnStartup: true,
};

// Single Aries connector instance
let ariesConnectorPlugin: PluginLedgerConnectorAries | undefined = undefined;
let ariesApiClient: AriesApiClient | undefined = undefined;

async function createAriesConnector() {
  if (ariesConnectorPlugin) {
    ariesConnectorPlugin.shutdown();
    ariesConnectorPlugin = undefined;
  }

  ariesConnectorPlugin = new PluginLedgerConnectorAries({
    instanceId: `ariesAssetTrade-${uuidv4()}`,
    logLevel: config.logLevel,
    walletPath: ARIES_WALLET_PATH,
    ariesAgents: [
      {
        name: BLP_AGENT_NAME,
        walletKey: BLP_AGENT_NAME,
        indyNetworks: [localTestNetwork],
        inboundUrl: BLP_AGENT_INBOUND_URL,
        autoAcceptConnections: true,
      },
    ],
  });

  await ariesConnectorPlugin.onPluginInit();

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
  await ariesConnectorPlugin.getOrCreateWebServices();
  await ariesConnectorPlugin.registerWebServices(expressApp, socketioServer);

  // Create ApiClient
  const apiConfig = new Configuration({ basePath: apiHost });
  ariesApiClient = new AriesApiClient(apiConfig);
}

/**
 * Create aries connector
 */
export async function initAriesConnector(): Promise<void> {
  if (!ariesConnectorPlugin) {
    await createAriesConnector();
    logger.info("initAriesConnector() done.");
  } else {
    logger.info("initAriesConnector() Aries connector already initialized");
  }
}

/**
 * Get instance of aries connector, initialize it if not done yet.
 */
export async function getAriesConnector(): Promise<PluginLedgerConnectorAries> {
  if (!ariesConnectorPlugin) {
    await initAriesConnector();
  }

  if (ariesConnectorPlugin) {
    return ariesConnectorPlugin;
  } else {
    throw new Error("Could not initialize new aries connector!");
  }
}

/**
 * Get instance of aries api client.
 */
export function getAriesApiClient(): AriesApiClient {
  if (ariesApiClient) {
    return ariesApiClient;
  } else {
    throw new Error("Aries connector not initialized yet!");
  }
}

/**
 * Get BLP agent name registered in connector
 */
export function getBlpAgentName(): string {
  return BLP_AGENT_NAME;
}
