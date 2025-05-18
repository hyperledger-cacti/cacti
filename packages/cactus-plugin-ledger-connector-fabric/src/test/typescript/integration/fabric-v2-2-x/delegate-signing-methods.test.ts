/**
 * Tests of fabric connector methods that use delegated signing instead of identity provided directly / through keychain.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const fabricEnvCAVersion = "1.4.9";
const ledgerChannelName = "mychannel";
const assetTradeContractName = "copyAssetTrade";
const privateAssetTradeContractName = "privateAssetTrade";
const testTimeout = 1000 * 60 * 10; // 10 minutes per test

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

import "jest-extended";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { X509Identity } from "fabric-network";
import { Server as SocketIoServer } from "socket.io";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  Containers,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  PluginLedgerConnectorFabric,
  GatewayOptions,
  FabricContractInvocationType,
  RunTransactionRequest,
  FabricApiClient,
  signProposal,
  WatchBlocksListenerTypeV1,
  FabricSigningCredential,
  CactiBlockTransactionsResponseV1,
} from "../../../../main/typescript/public-api";
import { Observable } from "rxjs";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "delegate-signing-methods.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Delegated signing tests", () => {
  let ledger: FabricTestLedgerV1;
  let gatewayOptions: GatewayOptions;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let apiClient: FabricApiClient;
  let socketioServer: SocketIoServer;
  let adminIdentity: X509Identity;

  const mockSignCallback = jest.fn(async (payload, txData) => {
    log.debug("mockSignCallback called with txData (token):", txData);
    return signProposal(adminIdentity.credentials.privateKey, payload);
  });

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Start Ledger
    log.info("Start FabricTestLedgerV1...");
    log.debug(
      "Fabric Version:",
      FABRIC_25_LTS_AIO_FABRIC_VERSION,
      "CA Version:",
      fabricEnvCAVersion,
    );
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: false,
      publishAllPorts: true,
      logLevel: testLogLevel,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([
        ["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION],
        ["CA_VERSION", fabricEnvCAVersion],
        ["CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP", "1"],
      ]),
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start();

    // Get connection profile
    log.info("Get fabric connection profile for Org1...");
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();

    // Enroll admin
    const enrollAdminOut = await ledger.enrollAdmin();
    adminIdentity = enrollAdminOut[0];
    log.error("adminIdentity", adminIdentity);

    // Create Keychain Plugin
    const keychainId = uuidv4();
    const keychainEntryKey = "admin";
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify(adminIdentity)]]),
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
      signCallback: mockSignCallback,
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
        signingCredential: gatewayOptions.wallet
          .keychain as FabricSigningCredential,
        channelName: ledgerChannelName,
        contractName: assetTradeContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "InitLedger",
        params: [],
      } as RunTransactionRequest);
      expect(initResponse).toBeTruthy();
      expect(initResponse.data).toBeTruthy();
      expect(initResponse.status).toEqual(200);
      log.info("Asset trade initialized");
    }

    // Deploy contract asset-transfer-private-data
    if (!useRunningLedger) {
      const cmd = [
        "./network.sh",
        "deployCC",
        "-ccn",
        privateAssetTradeContractName,
        "-ccp",
        "../asset-transfer-private-data/chaincode-go/",
        "-ccl",
        "go",
        "-ccep",
        "OR('Org1MSP.peer','Org2MSP.peer')",
        "-cccg",
        "../asset-transfer-private-data/chaincode-go/collections_config.json",
      ];
      const out = await Containers.exec(
        ledger.getContainer(),
        cmd,
        180000,
        sutLogLevel,
        "/fabric-samples/test-network/",
      );
      expect(out).toBeTruthy();
    }
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (fabricConnectorPlugin) {
      log.info("Close ApiClient connections...");
      fabricConnectorPlugin.shutdown();
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

    if (ledger && !leaveLedgerRunning) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  afterEach(async () => {
    mockSignCallback.mockClear();
  });

  //////////////////////////////////
  // Helpers
  //////////////////////////////////
  async function waitForTxCommit(txId: string) {
    const committedTx = await apiClient.waitForTransactionCommit(
      txId,
      apiClient.watchBlocksDelegatedSignV1({
        type: WatchBlocksListenerTypeV1.CactiTransactions,
        signerCertificate: adminIdentity.credentials.certificate,
        signerMspID: adminIdentity.mspId,
        channelName: ledgerChannelName,
      }) as Observable<CactiBlockTransactionsResponseV1>,
    );
    mockSignCallback.mockClear();
    return committedTx;
  }

  /**
   * Check call history on mock signing callback, clear it afterwards.
   * @param txData secret token sent to callback
   * @param count how many calls to callback we expect. For query use 2 (discovery, query). For transaction use 3 (discovery, endorse, commit)
   */
  async function checkMockSigningCallbacksAndClear(txData: string, count = 2) {
    expect(mockSignCallback.mock.calls).toHaveLength(count);
    expect(mockSignCallback.mock.calls.every((c) => c[1] === txData));
    mockSignCallback.mockClear();
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test(
    "Sanity check with runTransactionV1 endpoint",
    async () => {
      const newAssetOwner = `sanity-${uuidv4()}`;

      // Check current owner
      const initQueryResponse = await apiClient.runTransactionV1({
        signingCredential: gatewayOptions.wallet
          .keychain as FabricSigningCredential,
        channelName: ledgerChannelName,
        contractName: assetTradeContractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: ["asset1"],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      expect(initQueryResponse.status).toEqual(200);
      const initQueryOutput = JSON.parse(initQueryResponse.data.functionOutput);
      expect(initQueryOutput["ID"]).toEqual("asset1");
      expect(initQueryOutput["Owner"]).not.toEqual(newAssetOwner);

      // Transfer ownership
      const sendResponse = await apiClient.runTransactionV1({
        signingCredential: gatewayOptions.wallet
          .keychain as FabricSigningCredential,
        channelName: ledgerChannelName,
        contractName: assetTradeContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "TransferAsset",
        params: ["asset1", newAssetOwner],
      });
      expect(sendResponse).toBeTruthy();
      expect(sendResponse.data).toBeTruthy();
      expect(sendResponse.status).toEqual(200);

      // Confirm new owner
      const queryResponse = await apiClient.runTransactionV1({
        signingCredential: gatewayOptions.wallet
          .keychain as FabricSigningCredential,
        channelName: ledgerChannelName,
        contractName: assetTradeContractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: ["asset1"],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.status).toEqual(200);
      const queryOutput = JSON.parse(queryResponse.data.functionOutput);
      expect(queryOutput["ID"]).toEqual("asset1");
      expect(queryOutput["Owner"]).toEqual(newAssetOwner);
    },
    testTimeout,
  );

  test("Transact and query using delegated sign callback", async () => {
    const newAssetOwner = `owner-${uuidv4()}`;

    // Check current owner
    const initQueryId = `initQuery-${uuidv4()}`;
    const initQueryResponse = await apiClient.runDelegatedSignTransactionV1({
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: adminIdentity.mspId,
      channelName: ledgerChannelName,
      contractName: assetTradeContractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadAsset",
      params: ["asset1"],
      uniqueTransactionData: initQueryId,
    });
    expect(initQueryResponse).toBeTruthy();
    expect(initQueryResponse.data).toBeTruthy();
    expect(initQueryResponse.status).toEqual(200);
    const initQueryOutput = JSON.parse(initQueryResponse.data.functionOutput);
    expect(initQueryOutput["ID"]).toEqual("asset1");
    expect(initQueryOutput["Owner"]).not.toEqual(newAssetOwner);
    checkMockSigningCallbacksAndClear(initQueryId, 2);

    // Transfer ownership
    const transferQueryId = `transfer-${uuidv4()}`;
    const sendResponse = await apiClient.runDelegatedSignTransactionV1({
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: adminIdentity.mspId,
      channelName: ledgerChannelName,
      contractName: assetTradeContractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "TransferAsset",
      params: ["asset1", newAssetOwner],
      uniqueTransactionData: transferQueryId,
    });
    expect(sendResponse).toBeTruthy();
    expect(sendResponse.data).toBeTruthy();
    expect(sendResponse.status).toEqual(200);
    checkMockSigningCallbacksAndClear(transferQueryId, 3);
    const txId = sendResponse.data.transactionId;
    expect(txId).toBeTruthy();
    const committedTx = await waitForTxCommit(txId);
    log.debug("Committed transaction:", committedTx);

    // Confirm new owner
    const finalQueryId = `finalQuery-${uuidv4()}`;
    const queryResponse = await apiClient.runDelegatedSignTransactionV1({
      signerCertificate: adminIdentity.credentials.certificate,
      signerMspID: adminIdentity.mspId,
      channelName: ledgerChannelName,
      contractName: assetTradeContractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadAsset",
      params: ["asset1"],
      uniqueTransactionData: finalQueryId,
    });
    expect(queryResponse).toBeTruthy();
    expect(queryResponse.data).toBeTruthy();
    expect(queryResponse.status).toEqual(200);
    const queryOutput = JSON.parse(queryResponse.data.functionOutput);
    expect(queryOutput["ID"]).toEqual("asset1");
    expect(queryOutput["Owner"]).toEqual(newAssetOwner);
    checkMockSigningCallbacksAndClear(finalQueryId, 2);
  });

  test(
    "Private transaction and query using delegated sign callback",
    async () => {
      // Create private asset
      const assetID = uuidv4();
      const assetColor = "gray";
      const transientAssetData = {
        asset_properties: {
          objectType: "asset",
          assetID,
          color: assetColor,
          size: 3,
          appraisedValue: 500,
        },
      };

      const transferQueryId = `transferPriv-${uuidv4()}`;
      const sendResponse = await apiClient.runDelegatedSignTransactionV1({
        invocationType: FabricContractInvocationType.Sendprivate,
        signerCertificate: adminIdentity.credentials.certificate,
        signerMspID: adminIdentity.mspId,
        channelName: ledgerChannelName,
        contractName: privateAssetTradeContractName,
        methodName: "CreateAsset",
        params: [],
        uniqueTransactionData: transferQueryId,
        transientData: transientAssetData,
        endorsingOrgs: [adminIdentity.mspId],
      });
      expect(sendResponse).toBeTruthy();
      expect(sendResponse.data).toBeTruthy();
      expect(sendResponse.status).toEqual(200);
      checkMockSigningCallbacksAndClear(transferQueryId, 3);
      const txId = sendResponse.data.transactionId;
      expect(txId).toBeTruthy();
      const committedTx = await waitForTxCommit(txId);
      log.debug("Committed transaction:", committedTx);

      // Query the new asset
      const finalQueryId = `finalQuery-${uuidv4()}`;
      const queryResponse = await apiClient.runDelegatedSignTransactionV1({
        signerCertificate: adminIdentity.credentials.certificate,
        signerMspID: adminIdentity.mspId,
        channelName: ledgerChannelName,
        contractName: privateAssetTradeContractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: [assetID],
        endorsingOrgs: [adminIdentity.mspId],
        uniqueTransactionData: finalQueryId,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.status).toEqual(200);
      const queryOutput = JSON.parse(queryResponse.data.functionOutput);
      expect(queryOutput["assetID"]).toEqual(assetID);
      expect(queryOutput["color"]).toEqual(assetColor);
      checkMockSigningCallbacksAndClear(finalQueryId, 2);
    },
    testTimeout,
  );
});
