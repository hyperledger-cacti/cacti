/**
 * Common setup code for the persistence plugin with detailed comments on each step.
 * Requires environment variable `SUPABASE_CONNECTION_STRING` to be set before running the script that includes this!
 */

import process from "process";
import { v4 as uuidV4 } from "uuid";
import {
  LoggerProvider,
  Logger,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  EthereumApiClient,
  PluginLedgerConnectorEthereum,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginPersistenceEthereum } from "../../../main/typescript/plugin-persistence-ethereum";

//////////////////////////////////
// Constants
//////////////////////////////////

const SUPABASE_CONNECTION_STRING =
  process.env.SUPABASE_CONNECTION_STRING ??
  "postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:5432/postgres";

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "common-setup-methods",
  level: testLogLevel,
});

/**
 * Common ApiServer instance, can be empty if setup was not called yet!
 */
let apiServer: ApiServer;

//////////////////////////////////
// Methods
//////////////////////////////////

/**
 * Setup Cacti ApiServer instance containing Ethereum Connector plugin (for accessing the ethereum ledger)
 * and Ethereum Persistence plugin (for storing data read from ledger to the database).
 *
 * @param port Port under which an ApiServer will be started. Can't be 0.
 * @param rpcApiWsHost Ledger RPC WS URL
 */
export async function setupApiServer(port: number, rpcApiWsHost: string) {
  // PluginLedgerConnectorEthereum requires a keychain plugin to operate correctly, ensuring secure data storage.
  // For testing and debugging purposes, we use PluginKeychainMemory, which stores all secrets in memory (remember: this is not secure!).
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidV4(),
    keychainId: uuidV4(),
    backend: new Map([]),
    logLevel: testLogLevel,
  });

  // We create ethereum connector instance. It will connect to the ledger through RPC endpoints rpcApiHttpHost and rpcApiWsHost.
  const connector = new PluginLedgerConnectorEthereum({
    instanceId: uuidV4(),
    rpcApiWsHost,
    logLevel: sutLogLevel,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });
  await connector.onPluginInit();

  // We need an `EthereumApiClient` to access `PluginLedgerConnectorEthereum` methods from our `PluginPersistenceEthereum`.
  const apiConfig = new Configuration({ basePath: `http://127.0.0.1:${port}` });
  const apiClient = new EthereumApiClient(apiConfig);

  // We create persistence plugin, it will read data from ethereum ledger through `apiClient` we've just created,
  // and push it to PostgreSQL database accessed by it's SUPABASE_CONNECTION_STRING (read from the environment variable)
  const persistence = new PluginPersistenceEthereum({
    apiClient,
    logLevel: sutLogLevel,
    instanceId: uuidV4(),
    connectionString: SUPABASE_CONNECTION_STRING,
  });
  // Plugin initialization will check connection to the database and setup schema if needed.
  await persistence.onPluginInit();

  // The API Server is a common "container" service that manages our plugins (connector and persistence).
  // We use a sample configuration with most security measures disabled for simplicity.
  log.info("Create ApiServer...");
  const configService = new ConfigService();
  const cactusApiServerOptions = await configService.newExampleConfig();
  cactusApiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  cactusApiServerOptions.configFile = "";
  cactusApiServerOptions.apiCorsDomainCsv = "*";
  cactusApiServerOptions.apiTlsEnabled = false;
  cactusApiServerOptions.apiPort = port;
  cactusApiServerOptions.grpcPort = port + 1;
  cactusApiServerOptions.crpcPort = port + 2;
  const config = await configService.newExampleConfigConvict(
    cactusApiServerOptions,
  );

  apiServer = new ApiServer({
    config: config.getProperties(),
    pluginRegistry: new PluginRegistry({ plugins: [connector, persistence] }),
  });

  const apiServerStartOut = await apiServer.start();
  log.debug(`apiServerStartOut:`, apiServerStartOut);
  // Our setup is operational now!

  return persistence;
}

/**
 * Cleanup all the resources allocated by our Api Server.
 * Remember to call it before exiting!
 */
export async function cleanupApiServer() {
  log.info("cleanupApiServer called.");

  if (apiServer) {
    await apiServer.shutdown();
  }
}
