/**
 * Common setup code for the persistence plugin with detailed comments on each step.
 * Requires environment variable `SUPABASE_CONNECTION_STRING` to be set before running the script that includes this!
 * If not provided, a localhost instance of supabase will be assumed.
 */

import process from "process";
import { v4 as uuidV4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import {
  DefaultEventHandlerStrategy,
  FabricApiClient,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { PluginPersistenceFabric } from "../../../main/typescript";

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
 * Setup Cacti ApiServer instance containing Fabric Connector plugin (for accessing the fabric ledger)
 * and Fabric Persistence plugin (for storing data read from ledger to the database).
 *
 * @param port Port under which an ApiServer will be started. Can't be 0.
 * @param channelName Channel that we want to connect to.
 * @param connectionProfile Fabric connection profile (JSON object, not a string!)
 * @param userIdentity Signing identity to use to connect to the channel (object, not a string!)
 *
 * @returns `{ persistence, apiClient, signingCredential }`
 */
export async function setupApiServer(
  port: number,
  channelName: string,
  connectionProfile: any,
  userIdentity: X509Identity,
) {
  // PluginLedgerConnectorFabric requires a keychain plugin to operate correctly, ensuring secure data storage.
  // We will store our userIdentity in it.
  // For testing and debugging purposes, we use PluginKeychainMemory, which stores all secrets in memory (remember: this is not secure!).
  const keychainId = uuidV4();
  const keychainEntryKey = "monitorUser";
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidV4(),
    keychainId,
    backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
    logLevel: testLogLevel,
  });
  const signingCredential = {
    keychainId,
    keychainRef: keychainEntryKey,
  };

  // We create fabric connector instance with some default settings assumed.
  const discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };
  const connector = new PluginLedgerConnectorFabric({
    instanceId: uuidV4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    sshConfig: {},
    cliContainerEnv: {},
    peerBinary: "/fabric-samples/bin/peer",
    logLevel: sutLogLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAnyfortx,
      commitTimeout: 300,
    },
  });

  // Remember to initialize a plugin
  await connector.onPluginInit();

  // We need an `FabricApiClient` to access `PluginLedgerConnectorFabric` methods from our `PluginPersistenceFabric`.
  const apiConfig = new Configuration({ basePath: `http://127.0.0.1:${port}` });
  const apiClient = new FabricApiClient(apiConfig);

  // We create persistence plugin, it will read data from fabric ledger through `apiClient` we've just created,
  // and push it to PostgreSQL database accessed by it's SUPABASE_CONNECTION_STRING (read from the environment variable).
  const persistence = new PluginPersistenceFabric({
    channelName,
    gatewayOptions: {
      identity: signingCredential.keychainRef,
      wallet: {
        keychain: signingCredential,
      },
    },
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

  return { persistence, apiClient, signingCredential };
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
