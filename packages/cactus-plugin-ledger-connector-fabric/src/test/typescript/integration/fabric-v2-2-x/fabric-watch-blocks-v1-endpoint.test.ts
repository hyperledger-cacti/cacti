/**
 * Functional test of WatchBlocksV1Endpoint on connector-fabric (packages/cactus-plugin-ledger-connector-fabric)
 * Assumes sample CC was already deployed on the test ledger.
 *
 * @note - this test sometimes hangs infinitely when used with fabric-node-sdk 2.3.0,
 * probably due to bug in the underlying dependency grpc-js. Problem does not occur on 2.5.0.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

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
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { Constants, Configuration } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  FabricContractInvocationType,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  FabricApiClient,
  WatchBlocksListenerTypeV1,
  WatchBlocksResponseV1,
} from "../../../../main/typescript/public-api";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "fabric-watch-blocks-v1-endpoint.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("watchBlocksV1 of fabric connector tests", () => {
  let ledger: FabricTestLedgerV1;
  let signingCredential: FabricSigningCredential;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let socketioServer: SocketIoServer;
  let apiClient: FabricApiClient;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

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
    signingCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

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
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (fabricConnectorPlugin) {
      log.info("Close Fabric connector...");
      fabricConnectorPlugin.shutdown();
    }

    if (apiClient) {
      log.info("Close ApiClient connections...");
      apiClient.close();
    }

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

  //////////////////////////////////
  // Helpers
  //////////////////////////////////

  /**
   * Common logic for executing watchBlock monitoring tests.
   * Will subscribe to new blocks and send new transaction, to trigger creation of the new block.
   *
   * @param monitorName Unique name, will be used for identification and in transaction argument.
   * @param type Type of block to receive.
   * @param checkEventCallback Callback called when received the event from the connector.
   *
   * @returns Monitoring promise - will resolve if `checkEventCallback` passes, reject if it throws.
   */
  async function testWatchBlock(
    monitorName: string,
    type: WatchBlocksListenerTypeV1,
    checkEventCallback: (event: WatchBlocksResponseV1) => void,
    triggerTransactionCreation = true,
  ) {
    // Start monitoring
    const monitorPromise = new Promise<void>((resolve, reject) => {
      const watchObservable = apiClient.watchBlocksV1({
        channelName: ledgerChannelName,
        gatewayOptions: {
          identity: signingCredential.keychainRef,
          wallet: {
            keychain: signingCredential,
          },
        },
        type,
      });

      const subscription = watchObservable.subscribe({
        next(event) {
          log.debug("Received event:", JSON.stringify(event));
          try {
            checkEventCallback(event);
            subscription.unsubscribe();
            resolve();
          } catch (err) {
            log.error("watchBlocksV1() event check error:", err);
            subscription.unsubscribe();
            reject(err);
          }
        },
        error(err) {
          log.error("watchBlocksV1() error:", err);
          subscription.unsubscribe();
          reject(err);
        },
      });
    });

    // Create new asset to trigger new block creation
    if (triggerTransactionCreation) {
      const createAssetResponse = await apiClient.runTransactionV1({
        signingCredential,
        channelName: ledgerChannelName,
        invocationType: FabricContractInvocationType.Send,
        contractName: ledgerContractName,
        methodName: "CreateAsset",
        params: [monitorName, "green", "111", "someOwner", "299"],
      });
      expect(createAssetResponse).toBeTruthy();
      expect(createAssetResponse.status).toEqual(200);
      expect(createAssetResponse.data).toBeTruthy();
      expect(createAssetResponse.data.success).toBeTrue();
      expect(createAssetResponse.data.transactionId).toBeTruthy();
      log.debug(
        "runTransactionV1 response:",
        JSON.stringify(createAssetResponse.data),
      );
    }

    return monitorPromise;
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Check full block monitoring
   */
  test("Monitoring with type Full returns entire raw block", async () => {
    const monitorPromise = testWatchBlock(
      "FullBlockTest",
      WatchBlocksListenerTypeV1.Full,
      (event) => {
        expect(event).toBeTruthy();

        if (!("fullBlock" in event)) {
          throw new Error(
            `Unexpected response from the connector: ${JSON.stringify(event)}`,
          );
        }

        const fullBlock = event.fullBlock;
        expect(fullBlock.blockNumber).toBeTruthy();
        expect(fullBlock.blockData).toBeTruthy();
        expect(fullBlock.blockData.header).toBeTruthy();
        expect(fullBlock.blockData.data).toBeTruthy();
        expect(fullBlock.blockData.metadata).toBeTruthy();
      },
    );

    await monitorPromise;
  });

  /**
   * Check filtered block monitoring
   */
  test("Monitoring with type Filtered returns filtered block", async () => {
    const monitorPromise = testWatchBlock(
      "FilteredBlockTest",
      WatchBlocksListenerTypeV1.Filtered,
      (event) => {
        expect(event).toBeTruthy();

        if (!("filteredBlock" in event)) {
          throw new Error(
            `Unexpected response from the connector: ${JSON.stringify(event)}`,
          );
        }

        const filteredBlock = event.filteredBlock;
        expect(filteredBlock.blockNumber).toBeTruthy();
        expect(filteredBlock.blockData).toBeTruthy();
        expect(filteredBlock.blockData.channel_id).toBeTruthy();
        expect(filteredBlock.blockData.number).toBeTruthy();
        expect(filteredBlock.blockData.filtered_transactions).toBeTruthy();
      },
    );

    await monitorPromise;
  });

  /**
   * Check private block monitoring
   */
  test("Monitoring with type Private returns private block", async () => {
    const monitorPromise = testWatchBlock(
      "PrivateBlockTest",
      WatchBlocksListenerTypeV1.Private,
      (event) => {
        expect(event).toBeTruthy();

        if (!("privateBlock" in event)) {
          throw new Error(
            `Unexpected response from the connector: ${JSON.stringify(event)}`,
          );
        }

        const fullBlock = event.privateBlock;
        expect(fullBlock.blockNumber).toBeTruthy();
        expect(fullBlock.blockData).toBeTruthy();
        expect(fullBlock.blockData.header).toBeTruthy();
        expect(fullBlock.blockData.data).toBeTruthy();
        expect(fullBlock.blockData.metadata).toBeTruthy();
      },
    );

    await monitorPromise;
  });

  /**
   * Check Cactus custom transactions summary block monitoring.
   * This format is compatible with legacy fabric-socketio output.
   */
  test("Monitoring with type CactusTransactions returns transactions summary", async () => {
    const monitorPromise = testWatchBlock(
      "CactusTransactionsTest",
      WatchBlocksListenerTypeV1.CactusTransactions,
      (event) => {
        expect(event).toBeTruthy();

        if (!("cactusTransactionsEvents" in event)) {
          throw new Error(
            `Unexpected response from the connector: ${JSON.stringify(event)}`,
          );
        }

        const eventData = event.cactusTransactionsEvents;
        expect(eventData.length).toBeGreaterThan(0);
        expect(eventData[0].chaincodeId).toBeTruthy();
        expect(eventData[0].transactionId).toBeTruthy();
        expect(eventData[0].functionName).toBeTruthy();
        expect(eventData[0].functionArgs).toBeTruthy();
      },
    );

    await monitorPromise;
  });

  test("Invalid WatchBlocksListenerTypeV1 value gets knocked down", async () => {
    const monitorPromise = testWatchBlock(
      "CactusTransactionsTest",
      "Some_INVALID_WatchBlocksListenerTypeV1" as WatchBlocksListenerTypeV1,
      () => undefined, // will never reach this because it is meant to error out
      false,
    );

    try {
      await monitorPromise;
    } catch (ex: any) {
      // Execution never reaches this point - I'm assuming because the
      // testWatchBlock method somehow does not fulfil it's obligation of
      // either succeeding or throwing (it seems to get stuck idling forever
      // when I debug this in VSCode)
      expect(ex).toBeTruthy();
      expect(ex.code).toEqual(500);
      expect(ex.errorMessage).toBeTruthy();
    }
  });
});
