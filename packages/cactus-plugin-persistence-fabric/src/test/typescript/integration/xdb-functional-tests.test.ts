// /**
//  * Functional test of WatchBlocksV1Endpoint on connector-fabric (packages/cactus-plugin-ledger-connector-fabric)
//  * Assumes sample CC was already deployed on the test ledger.
//  *
//  * @note - this test sometimes hangs infinitely when used with fabric-node-sdk 2.3.0,
//  * probably due to bug in the underlying dependency grpc-js. Problem does not occur on 2.5.0.
//  */

// //////////////////////////////////
// // Constants
// //////////////////////////////////

// // const testLogLevel: LogLevelDesc = "info";
// // const sutLogLevel: LogLevelDesc = "info";
// const setupTimeout = 1000 * 60; // 1 minute timeout for setup
// // const testTimeout = 1000 * 60 * 3; // 3 minutes timeout for some async tests
// //Fabric Ledger settings

// const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
// const imageVersion = "2021-09-02--fix-876-supervisord-retries";
// const fabricEnvVersion = "2.2.0";
// const fabricEnvCAVersion = "1.4.9";
// // const ledgerChannelName = "mychannel";
// // const ledgerContractName = "basic";

// // Log settings

// const testLogLevel: LogLevelDesc = "info";
// const sutLogLevel: LogLevelDesc = "info";

// import "jest-extended";
// import http from "http";
// import { AddressInfo } from "net";
// import { v4 as uuidv4 } from "uuid";
// import bodyParser from "body-parser";
// import express from "express";
// import { Server as SocketIoServer } from "socket.io";
// import { DiscoveryOptions } from "fabric-network";
// import { PluginPersistenceFabric } from "../../../main/typescript";
// import {
//   FabricTestLedgerV1,
//   pruneDockerAllIfGithubAction,
// } from "@hyperledger/cactus-test-tooling";

// import {
//   LogLevelDesc,
//   LoggerProvider,
//   Logger,
//   IListenOptions,
//   Servers,
// } from "@hyperledger/cactus-common";

// import { Constants, Configuration } from "@hyperledger/cactus-core-api";

// import { PluginRegistry } from "@hyperledger/cactus-core";

// import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
// // import PostgresDatabaseClient from "../../../main/typescript/db-client/db-client";
// import {
//   PluginLedgerConnectorFabric,
//   //   FabricContractInvocationType,
//   DefaultEventHandlerStrategy,
//   FabricSigningCredential,
//   FabricApiClient,
//   // GatewayOptions,
// } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

// import DatabaseClient from "../../../main/typescript/db-client/db-client";
// jest.mock("../../../main/typescript/db-client/db-client");
// const DatabaseClientMock = (DatabaseClient as unknown) as jest.Mock;

// // Logger setup
// const log: Logger = LoggerProvider.getOrCreate({
//   label: "persistence-fabric-functional.test",
//   level: testLogLevel,
// });

// /**
//  * Main test suite
//  */

// describe("Persistence Fabric", () => {
//   let ledger: FabricTestLedgerV1;
//   let signingCredential: FabricSigningCredential;
//   let fabricConnectorPlugin: PluginLedgerConnectorFabric;
//   let connectorServer: http.Server;
//   let socketioServer: SocketIoServer;
//   let apiClient: FabricApiClient;
//   let persistence: PluginPersistenceFabric;
//   let gatewayOptions: GatewayOptions;
//   let dbClient: PostgresDatabaseClient;
//   let dbClientInstance: any;

//   // mockBlockData
//   // args: data - provide data obtained from connector call.
//   // mocking block data to be inserted into DB
//   function mockBlockData(data: any) {
//     dbClientInstance.insertBlockDataEntry.mockReturnValue([
//       {
//         fabric_block_id: data.fabric_block_id,
//         fabric_block_num: data.fabric_block_num,
//         fabric_block_data: data.fabric_block_data,
//       },
//     ]);
//   }

//   // mockTransactionData
//   // args: data - provide data obtained from connector call.
//   // mocking transaction data to be inserted into DB
//   // function mockTransactionData(data: any) {
//   //   (dbClientInstance.insertTransactionDataEntry as jest.Mock).mockReturnValue([
//   //     {
//   //       fabric_transaction_id: data.fabric_transaction_id,
//   //       fabric_transaction_num: data.fabric_transaction_num,
//   //       fabric_transaction_data: data.fabric_transaction_data,
//   //     },
//   //   ]);
//   // }

//   function clearMockTokenMetadata() {
//     for (const mockMethodName in dbClientInstance) {
//       const mockMethod = dbClientInstance[mockMethodName];
//       if ("mockClear" in mockMethod) {
//         mockMethod.mockClear();
//       }
//     }
//   }

//   //////////////////////////////////
//   // Environment Setup
//   //////////////////////////////////

//   beforeAll(async () => {
//     log.info("Prune Docker...");
//     await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

//     log.info("Create PostgresDatabaseClient");

//     log.info("Connect the PostgreSQL PostgresDatabaseClient");

//     log.info("Start FabricTestLedgerV1...");
//     log.debug("Version:", fabricEnvVersion, "CA Version:", fabricEnvCAVersion);

//     // fabric aio contrainer
//     ledger = new FabricTestLedgerV1({
//       emitContainerLogs: false,
//       publishAllPorts: true,
//       logLevel: testLogLevel,
//       imageName,
//       imageVersion,
//       envVars: new Map([
//         ["FABRIC_VERSION", fabricEnvVersion],
//         ["CA_VERSION", fabricEnvCAVersion],
//       ]),
//     });
//     log.debug("Fabric image:", ledger.getContainerImageName());
//     await ledger.start();

//     // Get connection profile
//     log.info("Get fabric connection profile for Org1...");
//     const connectionProfile = await ledger.getConnectionProfileOrg1();
//     expect(connectionProfile).toBeTruthy();

//     // Enroll admin and user
//     const enrollAdminOut = await ledger.enrollAdmin();
//     const adminWallet = enrollAdminOut[1];
//     const [userIdentity] = await ledger.enrollUser(adminWallet);

//     // Create Keychain Plugin
//     const keychainId = uuidv4();
//     const keychainEntryKey = "user2";
//     const keychainPlugin = new PluginKeychainMemory({
//       instanceId: uuidv4(),
//       keychainId,
//       logLevel: sutLogLevel,
//       backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
//     });

//     gatewayOptions = {
//       identity: keychainEntryKey,
//       wallet: {
//         keychain: {
//           keychainId,
//           keychainRef: keychainEntryKey,
//         },
//       },
//     };

//     signingCredential = {
//       keychainId,
//       keychainRef: keychainEntryKey,
//     };
//     log.debug("signingCredential", signingCredential);

//     // Create Connector Plugin
//     const discoveryOptions: DiscoveryOptions = {
//       enabled: true,
//       asLocalhost: true,
//     };

//     fabricConnectorPlugin = new PluginLedgerConnectorFabric({
//       instanceId: uuidv4(),
//       pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
//       sshConfig: await ledger.getSshConfig(),
//       cliContainerEnv: {},
//       peerBinary: "/fabric-samples/bin/peer",
//       logLevel: sutLogLevel,
//       connectionProfile,
//       discoveryOptions,
//       eventHandlerOptions: {
//         strategy: DefaultEventHandlerStrategy.NetworkScopeAnyfortx,
//         commitTimeout: 300,
//       },
//     });

//     // Run http server
//     const expressApp = express();
//     expressApp.use(bodyParser.json({ limit: "250mb" }));
//     connectorServer = http.createServer(expressApp);
//     const listenOptions: IListenOptions = {
//       hostname: "127.0.0.1",
//       port: 0,
//       server: connectorServer,
//     };

//     const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
//     const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

//     // Run socketio server
//     socketioServer = new SocketIoServer(connectorServer, {
//       path: Constants.SocketIoConnectionPathV1,
//     });

//     // Register services
//     await fabricConnectorPlugin.getOrCreateWebServices();
//     await fabricConnectorPlugin.registerWebServices(expressApp, socketioServer);

//     // Create ApiClient
//     const apiConfig = new Configuration({ basePath: apiHost });
//     apiClient = new FabricApiClient(apiConfig);
//     log.debug("apiClient", apiClient);

//     DatabaseClientMock.mockClear();
//     persistence = new PluginPersistenceFabric({
//       gatewayOptions,
//       apiClient,
//       logLevel: testLogLevel,
//       instanceId: uuidv4(),
//       connectionString: `postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:5432/postgres`,
//     });
//     // expect(DatabaseClientMock).toHaveBeenCalledTimes(1);
//     // log.warn(persistence.dbClient);
//     dbClientInstance = DatabaseClientMock.mock.instances[0];
//     log.warn("DatabaseClientMock", DatabaseClientMock);
//     log.warn("dbClientInstance", dbClientInstance);
//     // expect(dbClientInstance).toBeTruthy();
//   });

//   afterAll(async () => {
//     log.info("FINISHING THE TESTS");

//     if (fabricConnectorPlugin) {
//       log.info("Close Fabric connector...");
//       fabricConnectorPlugin.shutdown();
//     }

//     if (apiClient) {
//       log.info("Close ApiClient connections...");
//       apiClient.close();
//     }

//     if (socketioServer) {
//       log.info("Stop the SocketIO server connector...");
//       await new Promise<void>((resolve) =>
//         socketioServer.close(() => resolve()),
//       );
//     }

//     if (connectorServer) {
//       log.info("Stop the HTTP server connector...");
//       await new Promise<void>((resolve) =>
//         connectorServer.close(() => resolve()),
//       );
//     }

//     // Wait for monitor to be terminated
//     await new Promise((resolve) => setTimeout(resolve, 8000));

//     if (ledger) {
//       log.info("Stop the fabric ledger...");
//       await ledger.stop();
//       await ledger.destroy();
//     }

//     log.info("Prune Docker...");
//     await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
//   });

//   beforeEach(() => {
//     clearMockTokenMetadata();
//   }, setupTimeout);

//   // test("plugins checks", async () => {
//   //   log.debug("###SigningCredential", signingCredential);
//   //   log.debug("###ApiClient", apiClient);
//   //   log.debug("###Persistence", persistence);
//   // });

//   // check if blockdata insertion works
//   test("block data mock", async () => {
//     const blockData = {
//       fabric_block_id: uuidv4(),
//       fabric_block_num: 1,
//       fabric_block_data: "test",
//     };
//     mockBlockData(blockData);

//     const persistenceResult = await persistence.insertBlockData(blockData);
//     log.warn("persistenceResult", persistenceResult);

//     expect(persistenceResult).toBeTruthy();
//     expect(persistenceResult[0]).toEqual(blockData);
//   });
// });
