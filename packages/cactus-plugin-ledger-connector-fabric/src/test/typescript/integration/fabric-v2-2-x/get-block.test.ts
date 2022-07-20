/**
 * Functional test of GetBlockEndpointV1 on connector-fabric (packages/cactus-plugin-ledger-connector-fabric)
 * Assumes sample CC was already deployed on the test ledger.
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
} from "../../../../main/typescript/public-api";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "get-block.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Get Block endpoint tests", () => {
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
   * Run get block endpoint using block number, do basic response checks.
   * Can be reused throughout the tests.
   *
   * @param blockNumber string number of the block
   * @param skipDecode true to return encoded, false to return decoded
   * @returns block object / block buffer
   */
  async function getBlockByNumber(
    blockNumber = "0",
    skipDecode = false,
  ): Promise<any> {
    const getBlockReq = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query: {
        blockNumber,
      },
      skipDecode,
    };

    const getBlockResponse = await apiClient.getBlockV1(getBlockReq);

    expect(getBlockResponse).toBeTruthy();
    expect(getBlockResponse.status).toEqual(200);
    expect(getBlockResponse.data).toBeTruthy();

    if (!skipDecode) {
      // Decoded check
      if (!("decodedBlock" in getBlockResponse.data)) {
        throw new Error(
          "Wrong response received - expected decoded, received encoded.",
        );
      }
      expect(getBlockResponse.data.decodedBlock).toBeTruthy();
      return getBlockResponse.data.decodedBlock;
    } else {
      // Encoded check
      if (!("encodedBlock" in getBlockResponse.data)) {
        throw new Error(
          "Wrong response received - expected encoded, received decoded.",
        );
      }
      expect(getBlockResponse.data.encodedBlock).toBeTruthy();
      return getBlockResponse.data.encodedBlock;
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
    expect(createAssetResponse.data.success).toBeTrue();
    const txId = createAssetResponse.data.transactionId;
    expect(txId).toBeTruthy();

    log.debug("Crated new transaction, txId:", txId);
    return txId;
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * GetBlock endpoint using block number
   */
  test("Get first block by it's number, both decoded and encoded.", async () => {
    // Check decoded
    const decodedFirstBlock = await getBlockByNumber("0", false);
    log.debug("Received decodedFirstBlock:", decodedFirstBlock);
    expect(decodedFirstBlock.header).toBeTruthy();
    expect(decodedFirstBlock.header.number.low).toBe(0);
    expect(decodedFirstBlock.header.number.high).toBe(0);
    expect(decodedFirstBlock.data).toBeTruthy();
    expect(decodedFirstBlock.metadata).toBeTruthy();

    // Check encoded
    const encodedFirstBlock = await getBlockByNumber("0", true);
    log.debug("Received encodedFirstBlock:", encodedFirstBlock);
    const blockBuffer = Buffer.from(encodedFirstBlock);
    expect(blockBuffer).toBeTruthy();
  });

  /**
   * GetBlock endpoint using transactionId
   */
  test("Get a block by transactionId it contains", async () => {
    // Run some transaction
    const txId = await sendTransactionOnFabric("getBlockTx");

    // Get block using transactionId we've just sent
    const getBlockByTxId = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query: {
        transactionId: txId,
      },
    };

    const getBlockResponse = await apiClient.getBlockV1(getBlockByTxId);
    if (!("decodedBlock" in getBlockResponse.data)) {
      // narrow the type
      throw new Error(
        "Wrong response received - expected decoded, received encoded.",
      );
    }
    const { decodedBlock } = getBlockResponse.data;
    expect(decodedBlock).toBeTruthy();
    expect(decodedBlock.header).toBeTruthy();
    expect(decodedBlock.data).toBeTruthy();
    expect(decodedBlock.metadata).toBeTruthy();
  });

  /**
   * GetBlock endpoint using block hash
   */
  test("Get block by it's hash.", async () => {
    // Run transaction to ensure more than one block is present
    await sendTransactionOnFabric("txForNewBlock");

    // Get second block by it's number
    const decodedSecondBlock = await getBlockByNumber("1", false);
    expect(decodedSecondBlock.header).toBeTruthy();
    const firstBlockHashJSON = decodedSecondBlock.header.previous_hash;
    expect(firstBlockHashJSON).toBeTruthy();

    // Get using default JSON hash representation
    log.info("Get by JSON hash:", firstBlockHashJSON);
    const getBlockByJsonHashReq = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query: {
        blockHash: {
          buffer: firstBlockHashJSON,
        },
      },
    };
    const getBlockByJsonHashResponse = await apiClient.getBlockV1(
      getBlockByJsonHashReq,
    );
    if (!("decodedBlock" in getBlockByJsonHashResponse.data)) {
      // narrow the type
      throw new Error(
        "Wrong response received - expected decoded, received encoded.",
      );
    }
    const { decodedBlock } = getBlockByJsonHashResponse.data;
    expect(decodedBlock).toBeTruthy();
    expect(decodedBlock.header).toBeTruthy();
    expect(decodedBlock.header.number.low).toBe(0);
    expect(decodedBlock.header.number.high).toBe(0);
    expect(decodedBlock.data).toBeTruthy();
    expect(decodedBlock.metadata).toBeTruthy();

    // Get using HEX encoded hash representation
    const firstBlockHashHex = Buffer.from(firstBlockHashJSON).toString("hex");
    log.info("Get by HEX hash:", firstBlockHashHex);
    const getBlockByHexHashReq = {
      channelName: ledgerChannelName,
      gatewayOptions,
      query: {
        blockHash: {
          encoding: "hex",
          buffer: firstBlockHashHex,
        },
      },
    };
    const getBlockByHexHashResponse = await apiClient.getBlockV1(
      getBlockByHexHashReq,
    );
    if (!("decodedBlock" in getBlockByHexHashResponse.data)) {
      // narrow the type
      throw new Error(
        "Wrong response received - expected decoded, received encoded.",
      );
    }
    const decodedBlockHex = getBlockByHexHashResponse.data.decodedBlock;
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
