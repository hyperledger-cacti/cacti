// /* eslint-disable @typescript-eslint/no-unused-vars */

// import { PluginRegistry } from "@hyperledger/cactus-core";
// import { Server as SocketIoServer } from "socket.io";
// import {
//   Constants,
//   LedgerType,
//   PluginImportType,
// } from "@hyperledger/cactus-core-api";
// import test, { Test } from "tape-promise/tape";
// import { v4 as uuidv4 } from "uuid";
// import {
//   APIConfig,
//   IPluginCcTxVisualizationOptions,
//   CcTxVisualization,
// } from "../../../main/typescript/plugin-cc-tx-visualization";
// import { Configuration, ICactusPlugin } from "@hyperledger/cactus-core-api";
// import { IListenOptions, Servers } from "@hyperledger/cactus-common";
// import bodyParser from "body-parser";
// import express from "express";
// import { DiscoveryOptions } from "fabric-network";
// import { LogLevelDesc } from "loglevel";
// import { AddressInfo } from "net";
// import {
//   BesuTestLedger,
//   Containers,
//   FabricTestLedgerV1,
//   pruneDockerAllIfGithubAction,
// } from "@hyperledger/cactus-test-tooling";
// import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
// import {
//   PluginLedgerConnectorFabric,
//   DefaultApi,
//   DefaultEventHandlerStrategy,
//   FabricSigningCredential,
//   IPluginLedgerConnectorFabricOptions,
//   FabricContractInvocationType,
//   RunTransactionRequest,
// } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
// import http from "http";
// import { K_CACTUS_FABRIC_TOTAL_TX_COUNT } from "@hyperledger/cactus-plugin-ledger-connector-fabric/src/main/typescript/prometheus-exporter/metrics";
// import {
//   EthContractInvocationType,
//   Web3SigningCredentialType,
//   PluginLedgerConnectorBesu,
//   PluginFactoryLedgerConnector,
//   Web3SigningCredentialCactusKeychainRef,
//   ReceiptType,
//   BesuApiClient,
//   WatchBlocksV1Progress,
//   Web3BlockHeader,
//   BesuApiClientOptions,
// } from "@hyperledger/cactus-plugin-ledger-connector-besu/src/main/typescript/public-api";
// import Web3 from "web3";
// import HelloWorldContractJson from "@hyperledger/cactus-plugin-ledger-connector-besu/src/test/solidity/hello-world-contract/HelloWorld.json";

// // test("Basic Instantiation", (t: Test) => {
// //   const options: IPluginCcTxVisualizationOptions = {
// //     instanceId: uuidv4(),
// //     connectorRegistry: new PluginRegistry(),
// //   };

// //   const pluginCcTxVisualization: PluginCcTxVisualization = new PluginCcTxVisualization(
// //     options,
// //   );

// //   t.ok(pluginCcTxVisualization, "Instantiated");
// //   t.end();
// // });

// // test("Dummy Connector Instantiaton", (t: Test) => {
// //     class DummyPlugin implements ICactusPlugin{
// //     private readonly instanceId: string;

// //     constructor(){
// //       this.instanceId = "CCTX_DUMMY_" + uuidv4();
// //     }
// //     public getInstanceId(): string {
// //       return this.instanceId;
// //     }
// //     public getPackageName(): string {
// //       return "DummyPlugin";
// //     }
// //     public async onPluginInit(): Promise<unknown> {
// //       return;
// //     }

// //   }

// //   //add connector reference to the registry
// //   const connectorRegistryTest = new PluginRegistry();
// //   connectorRegistryTest.add(new DummyPlugin());

// //   const options: IPluginCcTxVisualizationOptions = {
// //     instanceId: uuidv4(),
// //     connectorRegistry: connectorRegistryTest,
// //   };

// //   const pluginCcTxVisualization: PluginCcTxVisualization = new PluginCcTxVisualization(
// //     options,
// //   );

// //   t.ok(pluginCcTxVisualization, "Instantiated with a dummy connector");
// //   t.end();
// // });

// const logLevel: LogLevelDesc = "TRACE";
// test("BEFORE ", async (t: Test) => {
//   const pruning = pruneDockerAllIfGithubAction({ logLevel });
//   await t.doesNotReject(pruning, "Pruning didn't throw OK");
//   t.end();
// });

// test("Connector Instantiaton with Fabric and Besu", async (t: Test) => {
//   //FABRIC
//   const logLevel: LogLevelDesc = "TRACE";

//   test.onFailure(async () => {
//     await Containers.logDiagnostics({ logLevel });
//   });

//   const FabricTestLedger = new FabricTestLedgerV1({
//     emitContainerLogs: true,
//     publishAllPorts: true,
//     logLevel,
//     imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
//     imageVersion: "2021-04-20-nodejs",
//     envVars: new Map([
//       ["FABRIC_VERSION", "2.2.0"],
//       ["CA_VERSION", "1.4.9"],
//     ]),
//   });
//   t.ok(FabricTestLedger, "ledger (FabricTestLedgerV1) truthy OK");

//   const tearDownLedger = async () => {
//     await FabricTestLedger.stop();
//     await FabricTestLedger.destroy();
//     await pruneDockerAllIfGithubAction({ logLevel });
//   };

//   test.onFinish(tearDownLedger);

//   await FabricTestLedger.start();

//   const enrollAdminOut = await FabricTestLedger.enrollAdmin();
//   const adminWallet = enrollAdminOut[1];
//   const [userIdentity] = await FabricTestLedger.enrollUser(adminWallet);

//   const connectionProfile = await FabricTestLedger.getConnectionProfileOrg1();

//   const sshConfig = await FabricTestLedger.getSshConfig();

//   const keychainInstanceIdFabric = uuidv4();
//   const keychainIdFabric = uuidv4();
//   const keychainEntryKeyFabric = "user2";
//   const keychainEntryValueFabric = JSON.stringify(userIdentity);

//   const keychainPluginFabric = new PluginKeychainMemory({
//     instanceId: keychainInstanceIdFabric,
//     keychainId: keychainIdFabric,
//     logLevel,
//     backend: new Map([
//       [keychainEntryKeyFabric, keychainEntryValueFabric],
//       ["some-other-entry-key", "some-other-entry-value"],
//     ]),
//   });

//   const FabricPluginRegistry = new PluginRegistry({
//     plugins: [keychainPluginFabric],
//   });

//   const discoveryOptions: DiscoveryOptions = {
//     enabled: true,
//     asLocalhost: true,
//   };

//   const FabricPluginOptions: IPluginLedgerConnectorFabricOptions = {
//     instanceId: uuidv4(),
//     pluginRegistry: FabricPluginRegistry,
//     sshConfig,
//     cliContainerEnv: {},
//     peerBinary: "/fabric-samples/bin/peer",
//     logLevel,
//     connectionProfile,
//     discoveryOptions,
//     eventHandlerOptions: {
//       strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
//       commitTimeout: 300,
//     },
//   };
//   const FabricConnector = new PluginLedgerConnectorFabric(FabricPluginOptions);

//   const expressAppFabric = express();
//   expressAppFabric.use(bodyParser.json({ limit: "250mb" }));
//   const serverFabric = http.createServer(expressAppFabric);
//   const listenOptionsFabric: IListenOptions = {
//     hostname: "localhost",
//     port: 0,
//     server: serverFabric,
//   };
//   const addressInfoFabric = (await Servers.listen(
//     listenOptionsFabric,
//   )) as AddressInfo;
//   test.onFinish(async () => await Servers.shutdown(serverFabric));
//   const { address, port } = addressInfoFabric;
//   const apiHostFabric = `http://${address}:${port}`;
//   t.comment(
//     `Metrics URL: ${apiHostFabric}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/get-prometheus-exporter-metrics`,
//   );

//   const FabricApiConfig = new Configuration({ basePath: apiHostFabric });

//   await FabricConnector.getOrCreateWebServices();
//   await FabricConnector.registerWebServices(expressAppFabric);

//   const channelName = "mychannel";
//   const contractName = "basic";
//   const signingCredential: FabricSigningCredential = {
//     keychainId: keychainIdFabric,
//     keychainRef: keychainEntryKeyFabric,
//   };

//   //BESU
//   const besuTestLedger = new BesuTestLedger();
//   await besuTestLedger.start();

//   test.onFinish(async () => {
//     await besuTestLedger.stop();
//     await besuTestLedger.destroy();
//     await pruneDockerAllIfGithubAction({ logLevel });
//   });

//   const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
//   const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

//   const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
//   const besuKeyPair = {
//     privateKey: besuTestLedger.getGenesisAccountPrivKey(),
//   };

//   const web3 = new Web3(rpcApiHttpHost);
//   const testEthAccount = web3.eth.accounts.create(uuidv4());

//   const keychainEntryKeyBesu = uuidv4();
//   const keychainEntryValueBesu = testEthAccount.privateKey;
//   const keychainPluginBesu = new PluginKeychainMemory({
//     instanceId: uuidv4(),
//     keychainId: uuidv4(),
//     // pre-provision keychain with mock backend holding the private key of the
//     // test account that we'll reference while sending requests with the
//     // signing credential pointing to this keychain entry.
//     backend: new Map([[keychainEntryKeyBesu, keychainEntryValueBesu]]),
//     logLevel,
//   });
//   keychainPluginBesu.set(
//     HelloWorldContractJson.contractName,
//     JSON.stringify(HelloWorldContractJson),
//   );
//   const factory = new PluginFactoryLedgerConnector({
//     pluginImportType: PluginImportType.Local,
//   });

//   const BesuConnector: PluginLedgerConnectorBesu = await factory.create({
//     rpcApiHttpHost,
//     rpcApiWsHost,
//     logLevel,
//     instanceId: uuidv4(),
//     pluginRegistry: new PluginRegistry({ plugins: [keychainPluginBesu] }),
//   });

//   const expressAppBesu = express();
//   expressAppBesu.use(bodyParser.json({ limit: "250mb" }));
//   const serverBesu = http.createServer(expressAppBesu);

//   const wsApi = new SocketIoServer(serverBesu, {
//     path: Constants.SocketIoConnectionPathV1,
//   });

//   const listenOptionsBesu: IListenOptions = {
//     hostname: "localhost",
//     port: 0,
//     server: serverBesu,
//   };
//   const addressInfoBesu = (await Servers.listen(
//     listenOptionsBesu,
//   )) as AddressInfo;
//   test.onFinish(async () => await Servers.shutdown(serverBesu));
//   const addressBesu: string = addressInfoBesu.address;
//   const portBesu: number = addressInfoBesu.port;
//   const apiHostBesu = `http://${addressBesu}:${portBesu}`;
//   t.comment(
//     `Metrics URL: ${apiHostBesu}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
//   );

//   const wsBasePath = apiHostFabric + Constants.SocketIoConnectionPathV1;
//   t.comment("WS base path: " + wsBasePath);
//   const besuApiClientOptions = new BesuApiClientOptions({
//     basePath: apiHostBesu,
//   });
//   await BesuConnector.getOrCreateWebServices();
//   await BesuConnector.registerWebServices(expressAppBesu, wsApi);

//   // // apis' config
//   const testApiConfig: APIConfig[] = [];
//   testApiConfig.push({ type: LedgerType.Fabric2, basePath: apiHostFabric });
//   testApiConfig.push({ type: LedgerType.Besu2X, basePath: apiHostBesu });

//   //add connector reference to the registry
//   const connectorRegistryTest = new PluginRegistry();
//   connectorRegistryTest.add(FabricConnector);
//   connectorRegistryTest.add(BesuConnector);

//   //apiClients
//   const besuApiClient = new BesuApiClient(besuApiClientOptions);
//   const fabricApiClient = new DefaultApi(FabricApiConfig);

//   //add apiClients
//   const apiClientsTest: any[] = [];
//   apiClientsTest.push(fabricApiClient);
//   apiClientsTest.push(besuApiClient);

//   // TODO instantiate cctxviz

//   {
//     const res = await fabricApiClient.runTransactionV1({
//       signingCredential,
//       channelName,
//       contractName,
//       invocationType: FabricContractInvocationType.Call,
//       methodName: "GetAllAssets",
//       params: [],
//     } as RunTransactionRequest);
//     t.ok(res);
//     t.ok(res.data);
//     t.equal(res.status, 200);
//     t.doesNotThrow(() => JSON.parse(res.data.functionOutput));
//   }

//   t.end();
// });
