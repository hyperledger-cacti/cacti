import "jest-extended";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import express from "express";
import { DiscoveryOptions } from "fabric-network";
// BlockDecoder is not exported in ts definition so we need to use legacy import.
const { BlockDecoder } = require("fabric-common");

import {
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
import { Configuration } from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
  DefaultApi as FabricApi,
  GatewayOptions,
  FabricContractInvocationType,
  FabricSigningCredential,
  GetBlockResponseTypeV1,
  GetBlockRequestV1Query,
  CactiBlockFullEventV1,
} from "../../../../main/typescript/public-api";

/**
 * Functional test of GetBlockEndpointV1 on connector-fabric (packages/cactus-plugin-ledger-connector-fabric)
 * Assumes sample CC was already deployed on the test ledger.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const imageName = DEFAULT_FABRIC_2_AIO_IMAGE_NAME;
const imageVersion = FABRIC_25_LTS_AIO_IMAGE_VERSION;
const fabricEnvVersion = FABRIC_25_LTS_AIO_FABRIC_VERSION;
const fabricEnvCAVersion = "1.4.9";
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";

// For development on local sawtooth network
// 1. leaveLedgerRunning = true, useRunningLedger = false to run ledger and leave it running after test finishes.
// 2. leaveLedgerRunning = true, useRunningLedger = true to use that ledger in future runs.
const useRunningLedger = false;
const leaveLedgerRunning = false;

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "query-system-chain-methods.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Query system chain methods and endpoints tests", () => {
  let ledger: FabricTestLedgerV1;
  let gatewayOptions: GatewayOptions;
  let fabricConnectorPlugin: PluginLedgerConnectorFabric;
  let connectorServer: http.Server;
  let apiClient: FabricApi;

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
      useRunningLedger,
    });
    log.debug("Fabric image:", ledger.getContainerImageName());
    await ledger.start({ omitPull: false });

    // Get connection profile
    log.info("Get fabric connection profile for Org1...");
    const connectionProfile = await ledger.getConnectionProfileOrg1();
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
    const keychainEntryKey = userId;
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      logLevel: sutLogLevel,
      backend: new Map([[keychainEntryKey, JSON.stringify(userIdentity)]]),
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

    // Register services
    await fabricConnectorPlugin.getOrCreateWebServices();
    await fabricConnectorPlugin.registerWebServices(expressApp);

    // Create ApiClient
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new FabricApi(apiConfig);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (fabricConnectorPlugin) {
      log.info("Close ApiClient connections...");
      fabricConnectorPlugin.shutdown();
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

  //////////////////////////////////
  // Helpers
  //////////////////////////////////

  /**
   * Run get block endpoint using a query, do basic response checks.
   * Can be reused throughout the tests.
   *
   * @param query how to find requested block
   * @param responseType response type requested
   *
   * @returns block object / block buffer
   */
  async function getBlock(
    query: GetBlockRequestV1Query,
    responseType: GetBlockResponseTypeV1 = GetBlockResponseTypeV1.Full,
  ): Promise<any> {
    const getBlockReq = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query,
      responseType,
    };

    const getBlockResponse = await apiClient.getBlockV1(getBlockReq);
    log.debug(
      "getBlockResponse = ",
      getBlockResponse.status,
      getBlockResponse.data,
    );

    expect(getBlockResponse).toBeTruthy();
    expect(getBlockResponse.status).toEqual(200);
    expect(getBlockResponse.data).toBeTruthy();

    switch (responseType) {
      case GetBlockResponseTypeV1.Full:
        if (!("decodedBlock" in getBlockResponse.data)) {
          throw new Error(
            `Wrong response received - expected decoded, got: ${getBlockResponse.data}`,
          );
        }
        expect(getBlockResponse.data.decodedBlock).toBeTruthy();
        return getBlockResponse.data.decodedBlock;
      case GetBlockResponseTypeV1.Encoded:
        if (!("encodedBlock" in getBlockResponse.data)) {
          throw new Error(
            `Wrong response received - expected encoded, got: ${getBlockResponse.data}`,
          );
        }
        expect(getBlockResponse.data.encodedBlock).toBeTruthy();
        return getBlockResponse.data.encodedBlock;
      case GetBlockResponseTypeV1.CactiTransactions:
        if (!("cactiTransactionsEvents" in getBlockResponse.data)) {
          throw new Error(
            `Wrong response received - expected CactiTransactions, got: ${getBlockResponse.data}`,
          );
        }
        expect(getBlockResponse.data.cactiTransactionsEvents).toBeTruthy();
        return getBlockResponse.data.cactiTransactionsEvents;
      case GetBlockResponseTypeV1.CactiFullBlock:
        if (!("cactiFullEvents" in getBlockResponse.data)) {
          throw new Error(
            `Wrong response received - expected CactiFullBlock, got: ${getBlockResponse.data}`,
          );
        }
        expect(getBlockResponse.data.cactiFullEvents).toBeTruthy();
        return getBlockResponse.data.cactiFullEvents;
      default:
        // Will not compile if any type was not handled by above switch.
        const unknownType: never = responseType;
        const validTypes = Object.keys(GetBlockResponseTypeV1).join(";");
        const errorMessage = `Unknown get block response type '${unknownType}'. Accepted types for GetBlockResponseTypeV1 are: [${validTypes}]`;
        throw new Error(errorMessage);
    }
  }

  /**
   * Create new asset on the ledger to trigger new transaction creation.
   *
   * @param assetName unique asset name to create
   * @returns committed transaction id.
   */
  async function sendTransactionOnFabric(assetName: string) {
    const createAssetResponse = await apiClient.runTransactionV1({
      signingCredential: gatewayOptions.wallet
        .keychain as FabricSigningCredential,
      channelName: ledgerChannelName,
      invocationType: FabricContractInvocationType.Send,
      contractName: ledgerContractName,
      methodName: "CreateAsset",
      params: [assetName, "green", "111", "someOwner", "299"],
    });
    expect(createAssetResponse).toBeTruthy();
    expect(createAssetResponse.status).toEqual(200);
    expect(createAssetResponse.data).toBeTruthy();
    const txId = createAssetResponse.data.transactionId;
    expect(txId).toBeTruthy();

    log.debug("Crated new transaction, txId:", txId);
    return txId;
  }

  //////////////////////////////////
  // GetBlockV1 Endpoint Tests
  //////////////////////////////////

  describe("GetBlockV1 endpoint tests", () => {
    /**
     * GetBlock endpoint using block number
     */
    test("Get first block by it's number - decoded.", async () => {
      // Check decoded
      const decodedFirstBlock = await getBlock(
        { blockNumber: "0" },
        GetBlockResponseTypeV1.Full,
      );
      log.debug("Received decodedFirstBlock:", decodedFirstBlock);
      expect(decodedFirstBlock.header).toBeTruthy();
      expect(decodedFirstBlock.header.number.low).toBe(0);
      expect(decodedFirstBlock.header.number.high).toBe(0);
      expect(decodedFirstBlock.data).toBeTruthy();
      expect(decodedFirstBlock.metadata).toBeTruthy();
    });

    test("Get first block by it's number - encoded.", async () => {
      // Check decoded
      const encodedFirstBlock = await getBlock(
        { blockNumber: "0" },
        GetBlockResponseTypeV1.Encoded,
      );
      const decodedFirstBlockBuffer = Buffer.from(encodedFirstBlock, "base64");
      const decodedFirstBlock = BlockDecoder.decode(decodedFirstBlockBuffer);
      log.debug("Received decodedFirstBlock:", decodedFirstBlock);
      expect(decodedFirstBlock.header).toBeTruthy();
      expect(decodedFirstBlock.header.number.low).toBe(0);
      expect(decodedFirstBlock.header.number.high).toBe(0);
      expect(decodedFirstBlock.data).toBeTruthy();
      expect(decodedFirstBlock.metadata).toBeTruthy();
    });

    /**
     * GetBlock endpoint using transactionId
     */
    test("Get a block by transactionId it contains", async () => {
      // Run some transaction
      const assetName = `getBlockTx_${(Math.random() + 1).toString(36).substring(2)}`;
      const txId = await sendTransactionOnFabric(assetName);

      // Get block using transactionId we've just sent
      const blockByTx = await getBlock(
        { transactionId: txId },
        GetBlockResponseTypeV1.Full,
      );
      expect(blockByTx).toBeTruthy();
      expect(blockByTx.header).toBeTruthy();
      expect(blockByTx.data).toBeTruthy();
      expect(blockByTx.metadata).toBeTruthy();
    });

    test("Get a block by transactionId it contains - cacti transactions summary", async () => {
      // Run some transaction
      const assetName = `cactiTx_${(Math.random() + 1).toString(36).substring(2)}`;
      const txId = await sendTransactionOnFabric(assetName);

      // Get block using transactionId we've just sent
      const cactiTxList = await getBlock(
        { transactionId: txId },
        GetBlockResponseTypeV1.CactiTransactions,
      );
      expect(cactiTxList).toBeTruthy();
      expect(cactiTxList.length).toBeGreaterThanOrEqual(1);
      const cactiTx = cactiTxList[0];
      expect(cactiTx).toBeTruthy();
      expect(cactiTx.chaincodeId).toBeTruthy();
      expect(cactiTx.transactionId).toBeTruthy();
      expect(cactiTx.functionName).toBeTruthy();
      expect(cactiTx.functionArgs).toBeTruthy();
      expect(cactiTx.functionArgs.length).toEqual(5);
    });

    test("Get a block by transactionId it contains - cacti full block summary", async () => {
      // Run some transaction
      const assetName = `cactiTx_${(Math.random() + 1).toString(36).substring(2)}`;
      const txId = await sendTransactionOnFabric(assetName);

      // Get block using transactionId we've just sent
      const cactiFullBlock = (await getBlock(
        { transactionId: txId },
        GetBlockResponseTypeV1.CactiFullBlock,
      )) as CactiBlockFullEventV1;

      // Check block fields
      expect(cactiFullBlock).toBeTruthy();
      expect(cactiFullBlock.blockNumber).toBeDefined();
      expect(cactiFullBlock.blockHash).toBeTruthy();
      expect(cactiFullBlock.previousBlockHash).toBeTruthy();
      expect(cactiFullBlock.transactionCount).toBeGreaterThanOrEqual(1);

      // Check transaction fields
      for (const tx of cactiFullBlock.cactiTransactionsEvents) {
        expect(tx.hash).toBeTruthy();
        expect(tx.channelId).toBeTruthy();
        expect(tx.timestamp).toBeTruthy();
        expect(tx.transactionType).toBeTruthy();
        expect(tx.protocolVersion).not.toBeUndefined();
        expect(tx.epoch).not.toBeUndefined();

        // Check transaction actions fields
        for (const action of tx.actions) {
          expect(action.functionName).toBeTruthy();
          expect(action.functionArgs).toBeTruthy();
          expect(action.functionArgs.length).toEqual(5);
          expect(action.chaincodeId).toBeTruthy();
          expect(action.creator.mspid).toBeTruthy();
          expect(action.creator.cert).toBeTruthy();

          // Check transaction action endorsement fields
          for (const endorsement of action.endorsements) {
            expect(endorsement.signature).toBeTruthy();
            expect(endorsement.signer.mspid).toBeTruthy();
            expect(endorsement.signer.cert).toBeTruthy();
          }
        }
      }
    });

    /**
     * GetBlock endpoint using block hash
     */
    test("Get block by it's hash.", async () => {
      // Run transaction to ensure more than one block is present
      const assetName = `txForNewBlock_${(Math.random() + 1).toString(36).substring(2)}`;
      await sendTransactionOnFabric(assetName);

      // Get second block by it's number
      const decodedSecondBlock = await getBlock(
        { blockNumber: "1" },
        GetBlockResponseTypeV1.Full,
      );
      expect(decodedSecondBlock.header).toBeTruthy();
      const firstBlockHashJSON = decodedSecondBlock.header.previous_hash;
      expect(firstBlockHashJSON).toBeTruthy();

      // Get using default JSON hash representation
      log.info("Get by JSON hash:", firstBlockHashJSON);

      const decodedFirstBlock = await getBlock(
        {
          blockHash: {
            buffer: firstBlockHashJSON,
          },
        },
        GetBlockResponseTypeV1.Full,
      );
      expect(decodedFirstBlock).toBeTruthy();
      expect(decodedFirstBlock.header).toBeTruthy();
      expect(decodedFirstBlock.header.number.low).toBe(0);
      expect(decodedFirstBlock.header.number.high).toBe(0);
      expect(decodedFirstBlock.data).toBeTruthy();
      expect(decodedFirstBlock.metadata).toBeTruthy();

      // Get using HEX encoded hash representation
      const firstBlockHashHex = Buffer.from(firstBlockHashJSON).toString("hex");
      log.info("Get by HEX hash:", firstBlockHashHex);

      const decodedBlockHex = await getBlock(
        {
          blockHash: {
            encoding: "hex",
            buffer: firstBlockHashHex,
          },
        },
        GetBlockResponseTypeV1.Full,
      );
      expect(decodedBlockHex).toBeTruthy();
      expect(decodedBlockHex.header).toBeTruthy();
      expect(decodedBlockHex.header.number.low).toBe(0);
      expect(decodedBlockHex.header.number.high).toBe(0);
      expect(decodedBlockHex.data).toBeTruthy();
      expect(decodedBlockHex.metadata).toBeTruthy();
    });

    /**
     * Check error handling
     */
    test("Reading block with invalid number returns an error.", async () => {
      const getBlockReq = {
        channelName: ledgerChannelName,
        gatewayOptions,
        query: {
          blockNumber: "foo", // non existent block
        },
      };

      try {
        await apiClient.getBlockV1(getBlockReq);
        expect(true).toBe(false); // above call should always throw
      } catch (err) {
        expect(err).toBeTruthy();
      }
    });
  });

  //////////////////////////////////
  // GetChainInfoV1 Endpoint Tests
  //////////////////////////////////

  describe("GetChainInfoV1 endpoint tests", () => {
    test("Get test ledger chain info.", async () => {
      const chainInfoResponse = await apiClient.getChainInfoV1({
        channelName: ledgerChannelName,
        gatewayOptions,
      });

      const chainInfo = chainInfoResponse.data;
      expect(chainInfoResponse.status).toBe(200);
      expect(chainInfo).toBeTruthy;
      expect(chainInfo.height).toBeGreaterThanOrEqual(1);
      expect(chainInfo.currentBlockHash).toBeTruthy;
      expect(chainInfo.previousBlockHash).toBeTruthy;
    });
  });
});
