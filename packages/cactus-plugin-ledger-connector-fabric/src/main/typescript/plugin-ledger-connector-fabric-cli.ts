import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  DriverConfig,
  FabricDriverServerOptions,
} from "./weaver/fabric-driver-server";
import fs from "fs";
import {
  ConnectionProfile,
  DefaultEventHandlerStrategy,
  PluginLedgerConnectorFabric,
} from "./public-api";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import "dotenv/config";

import http2 from "http2";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { getDriverKeyCert, walletSetup } from "./weaver/walletSetup";
import { Wallet } from "fabric-network";
import path from "path";

export async function startFabricWeaverDriver(): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "Fabric-Weaver-Driver",
  });
  const envVars = [
    "CONNECTION_PROFILE",
    "RELAY_ENDPOINT",
    "RELAY_TLS",
    "RELAY_TLSCA_CERT_PATH",
    "DRIVER_ENDPOINT",
    "DRIVER_TLS",
    "DRIVER_TLS_CERT_PATH",
    "DRIVER_TLS_KEY_PATH",
    "NETWORK_NAME",
    "DRIVER_CONFIG",
    "INTEROP_CHAINCODE",
    "MOCK",
    "DB_PATH",
    "WALLET_PATH",
    "DEBUG",
    "LEVELDB_LOCKED_MAX_RETRIES",
    "LEVELDB_LOCKED_RETRY_BACKOFF_MSEC",
    "ENABLE_MONITOR",
    "MONITOR_SYNC_PERIOD",
  ];
  const config: Record<string, string | undefined> = {};

  envVars.forEach((key) => {
    config[key] = process.env[key];
  });

  logger.info("Fabric Weaver Driver Environment Variables:", config);

  if (config.CONNECTION_PROFILE === undefined) {
    throw new Error("ENV variable CONNECTION_PROFILE must be set");
  }
  if (!fs.existsSync(config.CONNECTION_PROFILE)) {
    throw new Error(
      `File not found: CONNECTION_PROFILE=${config.CONNECTION_PROFILE}`,
    );
  }

  if (config.DRIVER_TLS === "true") {
    if (!config.DRIVER_TLS_CERT_PATH) {
      throw new Error(
        "ENV variable DRIVER_TLS_CERT_PATH must be set when DRIVER_TLS is true",
      );
    }
    if (!config.DRIVER_TLS_KEY_PATH) {
      throw new Error(
        "ENV variable DRIVER_TLS_KEY_PATH must be set when DRIVER_TLS is true",
      );
    }

    if (!fs.existsSync(config.DRIVER_TLS_CERT_PATH)) {
      throw new Error(
        `File not found: DRIVER_TLS_CERT_PATH=${config.DRIVER_TLS_CERT_PATH}`,
      );
    }
    if (!fs.existsSync(config.DRIVER_TLS_KEY_PATH)) {
      throw new Error(
        `File not found: DRIVER_TLS_KEY_PATH=${config.DRIVER_TLS_KEY_PATH}`,
      );
    }
  }

  if (config.RELAY_ENDPOINT === undefined) {
    throw new Error("ENV variable RELAY_ENDPOINT must be set");
  }

  if (config.CONNECTION_PROFILE === undefined) {
    throw new Error("ENV variable CONNECTION_PROFILE must be set");
  }
  if (!fs.existsSync(config.CONNECTION_PROFILE)) {
    throw new Error(
      `File not found: CONNECTION_PROFILE=${config.CONNECTION_PROFILE}`,
    );
  }

  const driverConfig: DriverConfig = JSON.parse(
    fs.readFileSync(config.DRIVER_CONFIG || "./config.json", "utf8"),
  );

  logger.debug("Driver Config:", driverConfig);

  const connectionProfile: ConnectionProfile = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, config.CONNECTION_PROFILE), "utf8"),
  );

  const logLevel = config.DEBUG === "true" ? "DEBUG" : "INFO";

  const wallet: Wallet = await walletSetup(
    config.WALLET_PATH || `./wallet-${config.NETWORK_NAME || "network1"}`,
    connectionProfile,
    driverConfig,
    logLevel,
  );

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    logLevel,
    backend: new Map([
      [
        driverConfig.relay?.name || "",
        JSON.stringify(await wallet.get(driverConfig.relay?.name || "")),
      ],
      [
        driverConfig.admin?.name || "",
        JSON.stringify(await wallet.get(driverConfig.admin?.name || "")),
      ],
    ]),
  });

  const connector = new PluginLedgerConnectorFabric({
    instanceId: uuidv4(),
    connectionProfile,
    logLevel,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    discoveryOptions: {
      enabled: true,
      asLocalhost: true,
    },
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      commitTimeout: 300,
    },
  });

  const gatewayOptions = {
    identity: driverConfig.relay?.name || "",
    wallet: {
      keychain: {
        keychainId: keychainPlugin.getKeychainId(),
        keychainRef: driverConfig.relay?.name || "",
      },
    },
  };

  const options: Partial<FabricDriverServerOptions> = {
    mock: config.MOCK === "true",
    logLevel: logLevel,
    networkName: config.NETWORK_NAME,
    monitorSyncPeriod: config.MONITOR_SYNC_PERIOD,
    monitorEnabled: config.ENABLE_MONITOR === "true",
    driverConfig: driverConfig,
    relayEndpoint: config.RELAY_ENDPOINT,
    walletPath: config.WALLET_PATH,
    tls: config.DRIVER_TLS === "true",
    discoveryOptions: { enabled: true, asLocalhost: true },
    gatewayOptions: gatewayOptions,
    certificate: await getDriverKeyCert(wallet, driverConfig),
    interopChainCode: config.INTEROP_CHAINCODE || "interop",
  };

  const handler = await connector.createWeaverDriveService({
    weaverOptions: options,
  });

  let server: http2.Http2Server;
  if (config.DRIVER_TLS === "true") {
    logger.info("Starting Fabric Weaver Driver with TLS");
    const httpsOptions = {
      cert: fs.readFileSync(config.DRIVER_TLS_CERT_PATH!),
      key: fs.readFileSync(config.DRIVER_TLS_KEY_PATH!),
    };
    server = http2.createSecureServer(httpsOptions, handler);
  } else {
    logger.info("Starting Fabric Weaver Driver without TLS");
    server = http2.createServer(handler);
  }

  if (config.DRIVER_ENDPOINT === undefined) {
    throw new Error("ENV variable DRIVER_ENDPOINT must be set");
  }

  const address: string[] = config.DRIVER_ENDPOINT.split(":");

  const host = address[0];
  const port = parseInt(address[1]);

  try {
    server.listen(port, host, () => {
      logger.info(
        `Fabric Weaver Driver server listening on https://${host}:${port}`,
      );
    });
    server.on("error", (error) => {
      logger.error(`Fabric Weaver Driver failed to start: ${error}`);
    });
  } catch (error) {
    logger.error(`Error starting Fabric Weaver Driver: ${error}`);
    throw error;
  }
}

if (require.main === module) {
  startFabricWeaverDriver();
}
