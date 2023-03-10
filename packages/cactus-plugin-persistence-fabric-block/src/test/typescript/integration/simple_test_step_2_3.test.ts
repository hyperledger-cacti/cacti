/**
 * Functional tests
 *
 *
 * @note -
 *
 */

//////////////////////////////////
// Constants
//////////////////////////////////

//Fabric Ledger settings

const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
// const ledgerChannelName = "mychannel";
// const ledgerContractName = "basic";

// Log settings

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
import { DiscoveryOptions } from "fabric-network";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LoggerProvider,
  IListenOptions,
  Servers,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { Constants, Configuration } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
//import { GatewayOptions } from '../../../../../cactus-plugin-ledger-connector-fabric/dist/lib/main/typescript/generated/openapi/typescript-axios/api';

// import PostgresDatabaseClient from "../../../main/typescript/db-client/db-client";
import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  FabricApiClient,
  GatewayOptions,
  //WatchBlocksListenerTypeV1,
  //WatchBlocksResponseV1,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginPersistenceFabricBlock } from "../../../main/typescript";

//////////////////////////////////
// Constants
//////////////////////////////////

//Fabric Ledger settings

const setupTimeout = 2000 * 360; // 6 minute timeout for setup
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
// Logger setup
const log = LoggerProvider.getOrCreate({
  label: "merge_test_step_1_2.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Persistence Fabric", () => {
  let ledger: FabricTestLedgerV1;
  let signingCredential: FabricSigningCredential;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let socketioServer: SocketIoServer;
  let apiClient: FabricApiClient;
  let persistence: PluginPersistenceFabricBlock;
  let gatewayOptions: GatewayOptions;
  // let dbClient: PostgresDatabaseClient;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Create PostgresDatabaseClient");
    //dbClient = new PostgresDatabaseClient({
    // connectionString: `postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres`,
    // });

    log.info("Connect the PostgreSQL PostgresDatabaseClient");
    //await dbClient.connect();

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug("Version:", fabricEnvVersion, "CA Version:", fabricEnvCAVersion);
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName,
      imageVersion,
      envVars: new Map([
        ["FABRIC_VERSION", fabricEnvVersion],
        ["CA_VERSION", fabricEnvCAVersion],
      ]),
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info("Get fabric connection profile for Org1...");
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();

    // Enroll admin and user
    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);

    // Create Keychain Plugin
    const keychainId = uuidv4();
    const keychainEntryKey = "user2";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
    });

    gatewayOptions = {
      identity: keychainEntryKey, // signingCredential
      wallet: {
        keychain: {
          keychainId,
          keychainRef: keychainEntryKey,
        },
      },
    };

    signingCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
    log.debug("signingCredential", signingCredential);

    // Create Connector Plugin
    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    fabricConnectorPlugin = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      sshConfig: await ledger.getSshConfig(),
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
    // Run http server
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    connectorServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: connectorServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

    // Run socketio server
    socketioServer = new SocketIoServer(connectorServer, {
      path: Constants.SocketIoConnectionPathV1,
    });

    // Register services
    await fabricConnectorPlugin.getOrCreateWebServices();
    await fabricConnectorPlugin.registerWebServices(expressApp, socketioServer);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new FabricApiClient(apiConfig);
    log.debug("apiClient", apiClient);

    persistence = new PluginPersistenceFabricBlock({
      gatewayOptions,
      apiClient,
      logLevel: testLogLevel,
      instanceId: uuidv4(),
      connectionString:
        "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres",
    });
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (fabricConnectorPlugin) {
      log.info("Close Fabric connector...");
      fabricConnectorPlugin.shutdown();
    }

    // if (apiClient) {
    //   log.info("Close ApiClient connections...");
    //   apiClient.close();
    // }

    if (socketioServer) {
      log.info("Stop the SocketIO server connector...");
      await new Promise<void>((resolve) =>
        socketioServer.close(() => resolve()),
      );
    }

    if (connectorServer) {
      log.info("Stop the HTTP server connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    // Wait for monitor to be terminated
    await new Promise((resolve) => setTimeout(resolve, 8000));

    if (ledger) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  test("plugins checks", async () => {
    log.debug("###SigningCredential", signingCredential);
    log.debug("###ApiClient", apiClient);
    log.debug("###Persistence", persistence);
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /*
Test Scenario III 
1) set Last BLock to 20
2) read LastBlock as 20
3) migrate 2 blocks
4) launch missing blocks
5) check missing blocks number
6) fill missing blocks
7) check missing blocks number
*/

  /////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////////////////////////

  test(" last block setting to 6", async () => {
    const LastBlockChanged = await persistence.setLastBlockConsidered(6);
    log.warn("setting Lastblock from plugin for analyze");
    log.warn(LastBlockChanged);
  });
  test("check last block setting to 6", async () => {
    const LastBlockChanged = await persistence.currentLastBlock();
    log.warn("Getting Lastblock from plugin for analyze");
    log.warn(LastBlockChanged);
  });

  test("Migration of 5 block Test", async () => {
    const blockTotest = await persistence.migrateBlockNrWithTransactions("5");
    log.warn("Getting block from ledger for analyze");
    log.warn(blockTotest);
    log.warn(blockTotest);
  });
  test("Migration of 6 block Test", async () => {
    const blockTotest = await persistence.migrateBlockNrWithTransactions("6");
    log.warn("Getting block from ledger for analyze");
    log.warn(blockTotest);
    log.warn(blockTotest);
  });
  test("Migration of check Last block Test", async () => {
    const LastBlockChanged = await persistence.currentLastBlock();
    log.warn("Getting Lastblock from plugin for analyze");
    log.warn(LastBlockChanged);
  });
  test("check missing blocks", async () => {
    const missingBlocksCheck = await persistence.whichBlocksAreMissingInDdSimple();
    log.warn("Getting missing blocks from plugin for analyze");
    log.warn(JSON.stringify(missingBlocksCheck));
  });

  test("check missing blocks count", async () => {
    const missingBlocksCount = await persistence.showHowManyBlocksMissing();
    log.warn("Getting missingBlocksCount from plugin for analyze");
    log.warn(missingBlocksCount);
  });

  test("fill missing blocks", async () => {
    const missingBlocksCheck = await persistence.synchronizeOnlyMissedBlocks();
    log.warn("Getting missing blocks from plugin for analyze");
    log.warn(JSON.stringify(missingBlocksCheck));
  });

  test("check missing blocks count after fill", async () => {
    const missingBlocksCount = await persistence.showHowManyBlocksMissing();
    log.warn(
      "After migration missing blocks getting missingBlocksCount from plugin for analyze",
    );
    log.warn(missingBlocksCount);
  });

  /*test("Migration of check Last block Test which is in ledger", async () => {
    const checkParameterLastBlock = await persistence.lastBlockInLedger();
    log.warn("Getting Lastblock from plugin for analyze but the last block is set");
    log.warn(checkParameterLastBlock);

  });*/
});
