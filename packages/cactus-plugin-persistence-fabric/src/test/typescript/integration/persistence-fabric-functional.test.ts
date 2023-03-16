/**
 * Functional test of basic operations on connector-fabric-socketio (packages/cactus-plugin-ledger-connector-fabric-socketio)
 * Assumes sample CC was is deployed on the test ledger.
 * Tests include sending and evaluation transactions, and monitoring for events.
 *
 * You can speed up development or troubleshooting by using same ledger repeat.
 *  1. Remove fabric wallets from previous runs - `rm -rf /tmp/fabric-test-wallet*`. Repeat this everytime you restart ledger.
 *  2. Change variable `leaveLedgerRunning` to true.
 *  3. Run this functional test. It will leave the ledger running, and will enroll the users to common wallet location.
 *  4. Change `useRunningLedger` to true. The following test runs will not setup the ledger again.
 * Note:
 *  You may get a warning about open SIGNREQUEST handles after the test finishes.
 *  These are false-positives, and should be fixed in jest v28.1.0
 *  More details: https://github.com/facebook/jest/pull/12789
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// const postgresImageName = "postgres";
// const postgresImageVersion = "14.6-alpine";
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup
// const testTimeout = 1000 * 60 * 3; // 3 minutes timeout for some async tests

const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
const ledgerUserName = "appUser";
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";
const leaveLedgerRunning = false; // default: false
const useRunningLedger = false; // default: false

/////////////////////////////////

import fs from "fs";
import path from "path";
import os from "os";
import "jest-extended";

import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
import { DiscoveryOptions } from "fabric-network";
import { PluginPersistenceFabric } from "../../../main/typescript";
import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
  SelfSignedPkiGenerator,
  // PostgresTestContainer,
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
  // FabricContractInvocationType,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  FabricApiClient,
  GatewayOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
// Mocked DB setup

import DatabaseClient from "../../../main/typescript/db-client/db-client";
jest.mock("../../../main/typescript/db-client/db-client");
const DatabaseClientMock = (DatabaseClient as unknown) as jest.Mock;

import {
  enrollAdmin,
  enrollUser,
  getUserCryptoFromWallet,
} from "./fabric-setup-helpers";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "persistence-fabric-functional.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Persistence Fabric", () => {
  // const testPluginName = "TestPlugin";
  // const testPluginInstanceId = "testInstance";
  let ledger: FabricTestLedgerV1;
  let signingCredential: FabricSigningCredential;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let socketioServer: SocketIoServer;
  let apiClient: FabricApiClient;
  let persistence: PluginPersistenceFabric;
  let gatewayOptions: GatewayOptions;
  let dbClientInstance: any;
  let dbClient: DatabaseClient;
  let tmpWalletDir: string;
  let connectorCertValue: string;
  let connectorPrivKeyValue: string;
  // let postgresContainer: PostgresTestContainer;

  let instanceId: string;

  // function insertResponseMock() {
  //   (dbClientInstance.insertBlockDataEntry as jest.Mock).mockReturnValue({
  //     test: "test",
  //   });
  // }
  // function isThisBlockInDbMock(blockNumber: number) {
  //   (dbClientInstance.isThisBlockInDB as jest.Mock).mockReturnValue(
  //     blockNumber,
  //   );
  // }
  function getMaxBlockNumberMock(blockNumber: number) {
    (dbClientInstance.getMaxBlockNumber as jest.Mock).mockReturnValue(
      blockNumber,
    );
  }

  function missBlock10(blockNumber: number) {
    if (blockNumber === 10) {
      (dbClientInstance.isThisBlockInDB as jest.Mock).mockReturnValue({
        command: "SELECT",
        rowCount: 0,
        rows: [],
      });
    } else {
      (dbClientInstance.isThisBlockInDB as jest.Mock).mockReturnValue(
        blockNumber,
      );
    }
  }

  function clearMockTokenMetadata() {
    for (const mockMethodName in dbClientInstance) {
      const mockMethod = dbClientInstance[mockMethodName];
      if ("mockClear" in mockMethod) {
        mockMethod.mockClear;
      }
    }
  }

  ////////////////////
  function createFabricConnectorConfig(
    connectionProfile: Record<string, any>,
    connectorCert: string,
    connectorPrivKey: string,
    jwtAlgo: string,
    walletDir: string,
    adminName: string,
    adminSecret: string,
  ) {
    // Get Org CA
    const caId = connectionProfile.organizations.Org1.certificateAuthorities[0];
    log.debug("Use CA:", caId);

    // Get Orderer ID
    const ordererId = connectionProfile.channels[ledgerChannelName].orderers[0];
    log.debug("Use Orderer:", ordererId);

    const connectorConfig: any = {
      sslParam: {
        port: 0, // random port
        keyValue: connectorPrivKey,
        certValue: connectorCert,
        jwtAlgo: jwtAlgo,
      },
      logLevel: sutLogLevel,
      fabric: {
        mspid: connectionProfile.organizations.Org1.mspid,
        keystore: walletDir,
        connUserName: ledgerUserName,
        contractName: ledgerContractName,
        peers: [], // will be filled below
        orderer: {
          name:
            connectionProfile.orderers[ordererId].grpcOptions[
              "ssl-target-name-override"
            ],
          url: connectionProfile.orderers[ordererId].url,
          tlscaValue: connectionProfile.orderers[ordererId].tlsCACerts.pem,
        },
        ca: {
          name: connectionProfile.certificateAuthorities[caId].caName,
          url: connectionProfile.certificateAuthorities[caId].url,
        },
        submitter: {
          name: adminName,
          secret: adminSecret,
        },
        channelName: ledgerChannelName,
        chaincodeId: ledgerContractName,
      },
    };

    // Add peers
    connectionProfile.organizations.Org1.peers.forEach((peerName: string) => {
      log.debug("Add Peer:", peerName);
      const peer = connectionProfile.peers[peerName];
      connectorConfig.fabric.peers.push({
        name: peer.grpcOptions["ssl-target-name-override"],
        requests: peer.url,
        tlscaValue: peer.tlsCACerts.pem,
      });
    });

    const configJson = JSON.stringify(connectorConfig);
    log.debug("Connector Config:", configJson);
    return configJson;
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // postgresContainer = new PostgresTestContainer({
    //   imageName: postgresImageName,
    //   imageVersion: postgresImageVersion,
    //   logLevel: testLogLevel,
    //   envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=postgres"],
    // });
    // await postgresContainer.start();

    // const postgresPort = await postgresContainer.getPostgresPort();
    // expect(postgresPort).toBeTruthy();
    // log.info(`Postgres running at localhost:${postgresPort}`);

    log.info("Create PostgresDatabaseClient");
    // dbClient = new DatabaseClient({
    //   connectionString: `postgresql://postgres:postgres@localhost:${postgresPort}/postgres`,
    //   logLevel: sutLogLevel,
    // });

    log.info("Connect the PostgreSQL PostgresDatabaseClient");
    // await dbClient.connect();
    // await dbClient.client.query(
    //   `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    //      CREATE ROLE anon NOLOGIN;
    //      CREATE ROLE authenticated NOLOGIN;
    //      CREATE ROLE service_role NOLOGIN;
    //      CREATE ROLE supabase_admin NOLOGIN;`,
    // );

    log.info("Initialize the test DB Schema");
    // await dbClient.initializePlugin(testPluginName, testPluginInstanceId);

    // Prepare local filesystem wallet path
    if (leaveLedgerRunning || useRunningLedger) {
      tmpWalletDir = path.join(os.tmpdir(), "fabric-test-wallet-common");
      log.warn("Using common wallet path when re-using the same ledger.");
      try {
        fs.mkdirSync(tmpWalletDir);
      } catch (err: any) {
        if (!err.message.includes("EEXIST")) {
          log.error(
            "Unexpected exception when creating common wallet dir:",
            err,
          );
          throw err;
        }
      }
    } else {
      log.info("Create temp dir for wallet - will be removed later...");
      tmpWalletDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "fabric-test-wallet"),
      );
    }
    log.info("Wallet path:", tmpWalletDir);
    expect(tmpWalletDir).toBeTruthy();

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
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info("Get fabric connection profile for Org1...");
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();
    // Get admin credentials
    const [adminName, adminSecret] = ledger.adminCredentials;

    await enrollAdmin(connectionProfile, tmpWalletDir, adminName, adminSecret);
    // #useridentity test
    await enrollUser(
      connectionProfile,
      tmpWalletDir,
      ledgerUserName,
      adminName,
    );
    const userIdent = await getUserCryptoFromWallet("appUser", tmpWalletDir);
    const identityTest = {
      credentials: {
        certificate: userIdent[0],
        privateKey: userIdent[1],
      },
      mspId: userIdent[2],
      type: userIdent[3],
    };
    const pkiGenerator = new SelfSignedPkiGenerator();
    const pki = pkiGenerator.create("localhost");
    connectorCertValue = pki.certificatePem;
    connectorPrivKeyValue = pki.privateKeyPem;
    const jwtAlgo = "RS512";

    log.info("Export connector config before loading the module...");
    process.env["NODE_CONFIG"] = createFabricConnectorConfig(
      connectionProfile,
      connectorCertValue,
      connectorPrivKeyValue,
      jwtAlgo,
      tmpWalletDir,
      adminName,
      adminSecret,
    );

    // Create Keychain Plugin
    const keychainId = uuidv4();
    const keychainEntryKey = "user2";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify(identityTest)]]), // [userIdentity] - test value, default is userIdentity
    });

    gatewayOptions = {
      identity: keychainEntryKey,
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
    DatabaseClientMock.mockClear();
    persistence = new PluginPersistenceFabric({
      gatewayOptions,
      apiClient,
      logLevel: testLogLevel,
      instanceId,
      connectionString: `db-is-mocked`,
    });
    // await persistence.onPluginInit();
    expect(DatabaseClientMock).toHaveBeenCalledTimes(1);
    dbClientInstance = DatabaseClientMock.mock.instances[0];
    // log.warn("dbClientInstance", dbClientInstance);
    expect(dbClientInstance).toBeTruthy();
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger && !leaveLedgerRunning && !useRunningLedger) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    if (fabricConnectorPlugin) {
      log.info("Close Fabric connector...");
      fabricConnectorPlugin.shutdown();
    }

    if (socketioServer) {
      log.info("Stop the SocketIO server connector...");
      await new Promise<void>((resolve) =>
        socketioServer.close(() => resolve()),
      );
    }

    if (apiClient) {
      log.info("Close ApiClient connections...");
      apiClient.close();
    }
    if (connectorServer) {
      log.info("Stop the HTTP server connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    if (persistence) {
      await persistence.shutdown();
    }

    if (tmpWalletDir && !leaveLedgerRunning && !useRunningLedger) {
      log.info("Remove tmp wallet dir", tmpWalletDir);
      fs.rmSync(tmpWalletDir, { recursive: true });
    }

    if (dbClient) {
      log.info("Disconnect the PostgresDatabaseClient");
      await dbClient.shutdown();
    }
    // if (postgresContainer) {
    //   log.info("Disconnect the PostgresDatabaseClient");

    //   await postgresContainer.stop();
    //   await postgresContainer.destroy();
    // }

    // Wait for monitor to be terminated
    await new Promise((resolve) => setTimeout(resolve, 8000));

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  beforeEach(() => {
    clearMockTokenMetadata();
  }, setupTimeout);

  // test("insertBlockDataEntry test", async () => {
  //   const block_data = {
  //     fabric_block_id: uuidv4(),
  //     fabric_block_num: 1,
  //     fabric_block_data: "test",
  //   };
  //   const response = await persistence.insertBlockDataEntry(block_data);

  //   expect(response).toBeTruthy();
  //   expect(response.command).toEqual("INSERT");
  //   expect(response.rowCount).toEqual(1);
  // });

  // getblock method test should return block data from ledger
  // currently there is no option like "latest"
  test("getblock", async () => {
    const blockNumber = "1";
    const block = await persistence.getBlockFromLedger(blockNumber);
    expect(block).toBeTruthy();
  });

  // checks if method works.

  // checks if all blocks from ledger are inserted into DB. If not, returns array with numbers of missing blocks.
  test("log all not synchronized blocks", async () => {
    getMaxBlockNumberMock(11);
    const getMaxBlockNumber = await dbClientInstance.getMaxBlockNumber(11);
    const missedBlocks: number[] = [];
    let howManyBlocksMissing = 0;
    log.info("getMaxBlockNumber", getMaxBlockNumber);

    for (let i = getMaxBlockNumber; i >= 0; i--) {
      try {
        missBlock10(i);

        persistence.getBlockFromLedger(`${i}`);
        // await apiClient.getBlockV1({
        //   channelName: ledgerChannelName,
        //   gatewayOptions,
        //   query: {
        //     blockNumber: `${i}`,
        //   },
        // });
        const isThisBlockInDB = await dbClientInstance.isThisBlockInDB(i);
        log.info("isThisBlockInDB", isThisBlockInDB);
        if (isThisBlockInDB.rowCount === 0) {
          howManyBlocksMissing += 1;
          missedBlocks.push(i);
        }
      } catch (err: unknown) {
        const isThisBlockInDB = await dbClientInstance.isThisBlockInDB(i);
        if (isThisBlockInDB.rowCount === 0) {
          howManyBlocksMissing += 1;
          missedBlocks.push(i);
        }
      }
    }
    log.info(`missedBlocks: ${howManyBlocksMissing}`, missedBlocks);
    expect(getMaxBlockNumber).toBeTruthy();
  });

  // test("initialBlocksSynchronization", async () => {
  //   const initialBlocksSynchronization = await persistence.initialBlocksSynchronization();
  //   expect(initialBlocksSynchronization).toBeTruthy();
  //   expect(initialBlocksSynchronization).toEqual("done");
  // });
  // test("continueBlocksSynchronization", async () => {
  //   const continueBlocksSynchronization = await persistence.continueBlocksSynchronization();
  //   expect(continueBlocksSynchronization).toBeTruthy();
  //   expect(continueBlocksSynchronization).toEqual("done");
  // });
  // test("continuousBlocksSynchronization", async () => {
  //   const continuousBlocksSynchronization = await persistence.continuousBlocksSynchronization();
  //   expect(continuousBlocksSynchronization).toBeTruthy();
  //   expect(continuousBlocksSynchronization).toEqual("done");
  // });
  // test("changeSynchronization", async () => {
  //   const changeSynchronization = await persistence.changeSynchronization();
  //   expect(changeSynchronization).toBeTruthy();
  //   expect(changeSynchronization).toEqual(true || false);
  // });

  // test("LastBlockChanged", async () => {
  //   const LastBlockChanged = await persistence.currentLastSeenBlock();
  //   log.info("Getting Lastblock from plugin for analyze");

  //   expect(LastBlockChanged).toBeTruthy();
  // });

  test(" last block setting to 6", async () => {
    const LastBlockChanged = await persistence.setLastBlockConsidered(6);
    log.info("setting Lastblock from plugin for analyze");
    expect(LastBlockChanged).toBeTruthy();
  });
  test("currentLastBlock", async () => {
    const currentLastBlock = await persistence.currentLastBlock();
    log.info("Getting Lastblock from plugin for analyze");

    expect(currentLastBlock).toBeTruthy();
  });

  test("Migration of 5 block Test", async () => {
    const blockTotest = await persistence.migrateBlockNrWithTransactions("5");
    log.info("Getting block from ledger for analyze");
    expect(blockTotest).toBeTruthy();
  });
  test("Migration of 6 block Test", async () => {
    const blockTotest = await persistence.migrateBlockNrWithTransactions("6");
    log.info("Getting block from ledger for analyze");
    expect(blockTotest).toBeTruthy();
  });
  test("Migration of check Last block Test", async () => {
    const LastBlockChanged = await persistence.currentLastBlock();
    log.info("Getting Lastblock from plugin for analyze");
    expect(LastBlockChanged).toBeTruthy();
  });
  test("check missing blocks", async () => {
    const missingBlocksCheck = await persistence.whichBlocksAreMissingInDdSimple();
    log.info(
      "Getting missing blocks from plugin for analyze",
      missingBlocksCheck,
    );
    expect(missingBlocksCheck).not.toBe(undefined);
  });

  test("check missing blocks count", async () => {
    const missingBlocksCount = await persistence.showHowManyBlocksMissing();
    log.info(
      "Getting missingBlocksCount from plugin for analyze",
      missingBlocksCount,
    );
    expect(missingBlocksCount).not.toBe(undefined);
  });

  test("fill missing blocks", async () => {
    const missingBlocksCheck = await persistence.synchronizeOnlyMissedBlocks();
    log.info(
      "Getting missing blocks from plugin for analyze",
      missingBlocksCheck,
    );
    expect(missingBlocksCheck).toBe(0);
  });

  test("check missing blocks count after fill", async () => {
    const missingBlocksCount = await persistence.showHowManyBlocksMissing();
    log.info(
      "After migration missing blocks getting missingBlocksCount from plugin for analyze",
      missingBlocksCount,
    );
    expect(missingBlocksCount).toBe(0);
  });
  // test("migrateNextBlock", async () => {
  //   const nextBlockArrival = await persistence.migrateNextBlock();

  //   expect(nextBlockArrival).toBeTruthy();
  // });

  //creating test transaction on ledger.
  // test.skip("create test transaction", async () => {
  //   const createAssetResponse = await persistence.runTransactionV1({
  //     signingCredential,
  //     channelName: ledgerChannelName,
  //     invocationType: FabricContractInvocationType.Send,
  //     contractName: ledgerContractName,
  //     methodName: "CreateAsset",
  //     params: ["CactusTransactionsTest", "green", "111", "someOwner", "299"],
  //   });

  //   log.warn(
  //     "runTransactionV1 response:",
  //     JSON.stringify(createAssetResponse.data),
  //   );

  //   expect(createAssetResponse).toBeTruthy();
  //   expect(createAssetResponse.status).toEqual(200);
  //   expect(createAssetResponse.data).toBeTruthy();
  //   expect(createAssetResponse.data.success).toBeTrue();
  //   expect(createAssetResponse.data.transactionId).toBeTruthy();
  // });
});
