/**
 * Functional test of basic operations on fabric persistence plugin (packages/cactus-plugin-persistence-fabric).
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const ledgerChannelName = "mychannel";
const assetTradeContractName = "copyAssetTrade";
const setupTimeout = 1000 * 60 * 6; // 6 minutes timeout for setup
const testTimeout = 1000 * 60 * 6; // 6 minutes timeout for some async tests

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { Server as SocketIoServer } from "socket.io";

import {
  Containers,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
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
  DefaultEventHandlerStrategy,
  FabricApiClient,
  FabricContractInvocationType,
  FabricSigningCredential,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import DatabaseClient from "../../../main/typescript/db-client/db-client";
jest.mock("../../../main/typescript/db-client/db-client");
const DatabaseClientMock = DatabaseClient as unknown as jest.Mock;
import { PluginPersistenceFabric } from "../../../main/typescript";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-functional.test",
  level: testLogLevel,
});

describe("Fabric persistence plugin tests", () => {
  let ledger: FabricTestLedgerV1;
  let signingCredential: FabricSigningCredential;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let dbClientInstance: any;
  let socketioServer: SocketIoServer;
  let apiClient: FabricApiClient;
  let instanceId: string;
  let persistence: PluginPersistenceFabric;

  //////////////////////////////////
  // Helper Functions
  //////////////////////////////////

  /**
   * Remove all mocks setup on the test DB Client instance.
   */
  function clearMockMetadata() {
    for (const mockMethodName in dbClientInstance) {
      const mockMethod = dbClientInstance[mockMethodName];
      if ("mockClear" in mockMethod) {
        mockMethod.mockClear();
      }
    }
  }

  async function createNewAsset() {
    const newAssetId = `asset_${(Math.random() + 1).toString(36).substring(2)}`;
    const sendResponse = await apiClient.runTransactionV1({
      signingCredential,
      channelName: ledgerChannelName,
      contractName: assetTradeContractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "CreateAsset",
      params: [newAssetId, "yellow", "11", "foo", "199"],
    });
    expect(sendResponse).toBeTruthy();
    expect(sendResponse.data).toBeTruthy();
    expect(sendResponse.status).toEqual(200);
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug("Fabric Version:", FABRIC_25_LTS_AIO_FABRIC_VERSION);
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info(`Get fabric connection profile for Org1...`);
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    log.debug("Fabric connection profile for Org1 OK: %o", connectionProfile);
    expect(connectionProfile).toBeTruthy();

    // Enroll admin and user
    const userOrg = "org1";
    const enrollAdminOut = await ledger.enrollAdminV2({
      organization: userOrg,
    });
    log.debug("Enrolled admin OK.");
    const adminWallet = enrollAdminOut[1];
    const userId = `testUser_${(Math.random() + 1).toString(36).substring(2)}`;
    const [userIdentity] = await ledger.enrollUserV2({
      enrollmentID: userId,
      organization: userOrg,
      wallet: adminWallet,
    });
    log.debug(`Enrolled user '${userId}' OK.`);

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
    fabricConnectorPlugin = new PluginLedgerConnectorFabric({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      sshConfig: await ledger.getSshConfig(),
      cliContainerEnv: {},
      peerBinary: "/fabric-samples/bin/peer",
      logLevel: sutLogLevel,
      connectionProfile,
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
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

    // Deploy contract asset-transfer-basic
    if (!useRunningLedger) {
      const cmd = [
        "./network.sh",
        "deployCC",
        "-ccn",
        assetTradeContractName,
        "-ccp",
        "../asset-transfer-basic/chaincode-go",
        "-ccl",
        "go",
      ];
      const out = await Containers.exec(
        ledger.getContainer(),
        cmd,
        180000,
        sutLogLevel,
        "/fabric-samples/test-network/",
      );
      expect(out).toBeTruthy();

      const initResponse = await apiClient.runTransactionV1({
        signingCredential,
        channelName: ledgerChannelName,
        contractName: assetTradeContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "InitLedger",
        params: [],
      });
      expect(initResponse).toBeTruthy();
      expect(initResponse.data).toBeTruthy();
      expect(initResponse.status).toEqual(200);
      log.info("Asset trade initialized");
    }

    // Create persistence plugin
    instanceId = "functional-test";
    DatabaseClientMock.mockClear();
    persistence = new PluginPersistenceFabric({
      apiClient,
      logLevel: sutLogLevel,
      instanceId,
      connectionString: "db-is-mocked",
      channelName: ledgerChannelName,
      gatewayOptions: {
        identity: signingCredential.keychainRef,
        wallet: {
          keychain: signingCredential,
        },
      },
    });
    expect(DatabaseClientMock).toHaveBeenCalledTimes(1);
    dbClientInstance = DatabaseClientMock.mock.instances[0];
    expect(dbClientInstance).toBeTruthy();
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (persistence) {
      log.info("Stop persistence plugin...");
      await persistence.shutdown();
    }

    if (connectorServer) {
      log.info("Stop connector http servers...");
      await Servers.shutdown(connectorServer);
    }

    if (fabricConnectorPlugin) {
      log.info("Stop the connector...");
      await fabricConnectorPlugin.shutdown();
    }

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  }, setupTimeout);

  beforeEach(() => {
    clearMockMetadata();
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test("Basic methods test", async () => {
    // getInstanceId()
    expect(persistence.getInstanceId()).toEqual(instanceId);

    // getPackageName()
    expect(persistence.getPackageName()).toEqual(
      "@hyperledger/cactus-plugin-persistence-fabric",
    );

    // getOpenApiSpec()
    expect(persistence.getOpenApiSpec()).toBeTruthy();
  });

  test("onPluginInit creates a DB schema", async () => {
    await persistence.onPluginInit();

    // DB Schema initialized
    const initDBCalls = dbClientInstance.initializePlugin.mock.calls;
    expect(initDBCalls.length).toBe(1);
  });

  test("Initial plugin status is correct", async () => {
    await persistence.onPluginInit();

    const status = persistence.getStatus();
    expect(status).toBeTruthy();
    expect(status.instanceId).toEqual(instanceId);
    expect(status.connected).toBeTrue();
    expect(status.webServicesRegistered).toBeFalse(); // We don't init the services in this test
    expect(status.operationsRunning).toBeEmpty();
    expect(status.monitorRunning).toBeFalse();
    expect(status.lastSeenBlock).toEqual(0);
  });

  test(
    "Calling syncAll adds new tracked operation that is reported in plugin status",
    async () => {
      // Freeze on getMissingBlocksInRange method until status is checked
      let isStatusChecked = false;
      (
        dbClientInstance.getMissingBlocksInRange as jest.Mock
      ).mockImplementation(async () => {
        while (!isStatusChecked) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return [];
      });

      const syncAllPromise = persistence.syncAll();

      try {
        // Wait for method to be called
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if syncAll operation is present
        const status = persistence.getStatus();
        expect(status).toBeTruthy();
        expect(status.operationsRunning.length).toEqual(1);
        const trackedOperation = status.operationsRunning[0];
        expect(trackedOperation.startAt).toBeTruthy();
        expect(trackedOperation.operation).toEqual("syncAll");
      } finally {
        // Always finish the syncAll call
        isStatusChecked = true;
        await syncAllPromise;
      }

      const statusAfterFinish = persistence.getStatus();
      expect(statusAfterFinish).toBeTruthy();
      expect(statusAfterFinish.operationsRunning.length).toEqual(0);
    },
    testTimeout,
  );

  test(
    "Block monitoring detects new changes correctly.",
    async () => {
      const insertBlockPromise = new Promise<any>((resolve, reject) => {
        (dbClientInstance.getMissingBlocksInRange as jest.Mock).mockReturnValue(
          [],
        );

        (dbClientInstance.insertBlockData as jest.Mock).mockImplementation(
          (blockData) => resolve(blockData),
        );

        persistence.startMonitor((err) => {
          reject(err);
        });
        log.debug("Persistence plugin block monitoring started.");
      });

      // Wait for monitor to get started
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Trigger new block
      await createNewAsset();
      log.debug("New asset has been created to trigger new tx");

      const blockData = await insertBlockPromise;
      log.error("blockData was inserted:", blockData);
      expect(blockData.blockNumber).toBeTruthy();
      expect(blockData.blockHash).toBeTruthy();
      expect(blockData.previousBlockHash).toBeTruthy();
      expect(blockData.cactiTransactionsEvents).toBeDefined();

      // Check if status reports that monitor is running
      const status = persistence.getStatus();
      expect(status).toBeTruthy();
      expect(status.monitorRunning).toBeTrue();

      // Check if status reports monitor is not running after stopMonitor is called
      persistence.stopMonitor();
      const statusAfterStop = persistence.getStatus();
      expect(statusAfterStop).toBeTruthy();
      expect(statusAfterStop.monitorRunning).toBeFalse();
    },
    testTimeout,
  );
});
