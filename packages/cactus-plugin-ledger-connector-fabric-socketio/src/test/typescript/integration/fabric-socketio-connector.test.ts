/**
 * Functional test of basic operations on connector-fabric-socketio (packages/cactus-plugin-ledger-connector-fabric-socketio)
 * Assumes sample CC was is deployed on the test ledger.
 * Tests include sending and evaluation transactions, and monitoring for events.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
const ledgerUserName = "appUser";
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";

// Log settings
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import {
  enrollAdmin,
  enrollUser,
  getUserCryptoFromWallet,
} from "./fabric-setup-helpers";

import fs from "fs";
import path from "path";
import os from "os";
import "jest-extended";
import { Server as HttpsServer } from "https";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "fabric-socketio-connector.test",
  level: testLogLevel,
});

// Path to sample CA used by the test - creating new EC certs for each run is to verbose for our purpose
const sampleFabricCAPath = path.join(
  process.cwd(),
  "packages",
  "cactus-plugin-ledger-connector-fabric-socketio",
  "sample-config",
  "CA",
);
const connectorCertPath = path.join(sampleFabricCAPath, "connector.crt");
const connectorPrivKeyPath = path.join(sampleFabricCAPath, "connector.priv");

/**
 * Main test suite
 */
describe("Fabric-SocketIO connector tests", () => {
  let ledger: FabricTestLedgerV1;
  let connectorCertValue: string;
  let connectorPrivKeyValue: string;
  let tmpWalletDir: string;
  let connectorServer: HttpsServer;
  let apiClient: SocketIOApiClient;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  /**
   * @param connectionProfile - Fabric connection profile JSON
   * @param connectorCert - connector-fabric-socketio server certificate
   * @param connectorPrivKey - connector-fabric-socketio server private key
   * @param walletDir - connector-fabric-socketio internal wallet path
   * @param adminName - ledger admin username
   * @param adminSecret - ledger admin secret
   * @returns fabric-socketio conenctor config JSON
   */
  function createFabricConnectorConfig(
    connectionProfile: Record<string, any>,
    connectorCert: string,
    connectorPrivKey: string,
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

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

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

    // Get admin credentials
    const [adminName, adminSecret] = ledger.adminCredentials;

    // Setup wallet
    log.info("Create temp dir for wallet - will be removed later...");
    tmpWalletDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-test-wallet"));
    expect(tmpWalletDir).toBeTruthy();
    await enrollAdmin(connectionProfile, tmpWalletDir, adminName, adminSecret);
    await enrollUser(
      connectionProfile,
      tmpWalletDir,
      ledgerUserName,
      adminName,
    );

    // Read connector private key and certificate
    connectorCertValue = fs.readFileSync(connectorCertPath, "ascii");
    connectorPrivKeyValue = fs.readFileSync(connectorPrivKeyPath, "ascii");

    // Get connector config
    log.info("Export connector config before loading the module...");
    process.env["NODE_CONFIG"] = createFabricConnectorConfig(
      connectionProfile,
      connectorCertValue,
      connectorPrivKeyValue,
      tmpWalletDir,
      adminName,
      adminSecret,
    );

    // Load connector module
    const connectorModule = await import("../../../main/typescript/index");

    // Run the connector
    connectorServer = await connectorModule.startFabricSocketIOConnector();
    expect(connectorServer).toBeTruthy();
    const connectorAddress = connectorServer.address();
    if (!connectorAddress || typeof connectorAddress === "string") {
      throw new Error("Unexpected fabric connector AddressInfo type");
    }
    log.info(
      "Fabric-SocketIO Connector started on:",
      `${connectorAddress.address}:${connectorAddress.port}`,
    );

    // Create ApiClient instance
    const apiConfigOptions = {
      validatorID: "fabric-socketio-test",
      validatorURL: `https://localhost:${connectorAddress.port}`,
      validatorKeyValue: connectorCertValue,
      logLevel: sutLogLevel,
      maxCounterRequestID: 1000,
      syncFunctionTimeoutMillisecond: 10000,
      socketOptions: {
        rejectUnauthorized: false,
        reconnection: false,
        timeout: 60000,
      },
    };
    log.debug("ApiClient config:", apiConfigOptions);
    apiClient = new SocketIOApiClient(apiConfigOptions);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (ledger) {
      log.info("Stop the fabric ledger...");
      await ledger.stop();
      await ledger.destroy();
    }

    if (apiClient) {
      log.info("Close ApiClient connection...");
      apiClient.close();
    }

    if (connectorServer) {
      log.info("Stop the fabric connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    if (tmpWalletDir) {
      log.info("Remove tmp wallet dir", tmpWalletDir);
      fs.rmSync(tmpWalletDir, { recursive: true });
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Test Helpers
  //////////////////////////////////

  /**
   * Calls `GetAllAssets` from `basic` CC on the ledger using apiClient.sendSyncRequest
   * @returns List of assets
   */
  async function getAllAssets() {
    const contract = {
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
    };
    const method = {
      type: "evaluateTransaction",
      command: "GetAllAssets",
    };
    const args = { args: [] };

    const results = await apiClient.sendSyncRequest(contract, method, args);

    expect(results).toBeTruthy();
    expect(results.status).toBe(200);
    expect(results.data).toBeTruthy();
    expect(results.data.length).toBeGreaterThanOrEqual(5); // we assume at least 5 assets in future tests
    return results.data as { ID: string }[];
  }

  /**
   * Calls `GetAllAssets` from `basic` CC on the ledger using apiClient.sendSyncRequest
   *
   * @param assetID - Asset to read from the ledger.
   * @returns asset object
   */
  async function readAsset(assetID: string) {
    const contract = {
      channelName: ledgerChannelName,
      contractName: ledgerContractName,
    };
    const method = {
      type: "evaluateTransaction",
      command: "ReadAsset",
    };
    const args = { args: [assetID] };

    const results = await apiClient.sendSyncRequest(contract, method, args);

    expect(results).toBeTruthy();
    expect(results.status).toBe(200);
    expect(results.data).toBeTruthy();
    return results.data;
  }

  /**
   * Calls connector function `sendSignedProposal`, assert correct response, and returns signed proposal.
   * @param txProposal - Transaction data we want to send (CC function name, arguments, chancode ID, channel ID)
   * @returns Signed proposal that can be feed into `sendSignedProposal`
   */
  async function getSignedProposal(txProposal: {
    fcn: string;
    args: string[];
    chaincodeId: string;
    channelId: string;
  }) {
    const [certPem, privateKeyPem] = await getUserCryptoFromWallet(
      ledgerUserName,
      tmpWalletDir,
    );
    const contract = { channelName: ledgerChannelName };
    const method = { type: "function", command: "sendSignedProposal" };
    const argsParam = {
      args: {
        transactionProposalReq: txProposal,
        certPem,
        privateKeyPem,
      },
    };

    const response = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParam,
    );
    expect(response).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.signedCommitProposal).toBeTruthy();
    expect(response.data.commitReq).toBeTruthy();
    expect(response.data.txId).toBeTruthy();

    const { signedCommitProposal, commitReq } = response.data;

    // signedCommitProposal must be Buffer
    signedCommitProposal.signature = Buffer.from(
      signedCommitProposal.signature,
    );
    signedCommitProposal.proposal_bytes = Buffer.from(
      signedCommitProposal.proposal_bytes,
    );

    return { signedCommitProposal, commitReq };
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Read all assets, get single asset, comapre that they return the same asset value without any errors.
   */
  test("Evaluate transaction returns correct data (GetAllAssets and ReadAsset)", async () => {
    const allAssets = await getAllAssets();
    const firstAsset = allAssets.pop();
    if (!firstAsset) {
      throw new Error("Unexpected missing firstAsset");
    }
    const readSingleAsset = await readAsset(firstAsset.ID);
    expect(readSingleAsset).toEqual(firstAsset);
  });

  /**
   * Send transaction proposal to be signed with keys attached to the request (managed by BLP),
   * and then send signed transaction to the ledger.
   */
  test("Signining proposal and sending it to the ledger works", async () => {
    // Get asset data to be transfered
    const allAssets = await getAllAssets();
    const assetId = allAssets[1].ID;
    const newOwnerName = "SignAndSendXXX";

    // Prepare signed proposal
    const txProposal = {
      fcn: "TransferAsset",
      args: [assetId, newOwnerName],
      chaincodeId: ledgerContractName,
      channelId: ledgerChannelName,
    };
    const signedProposal = await getSignedProposal(txProposal);

    // Send transaction
    const contract = { channelName: ledgerChannelName };
    const method = { type: "sendSignedTransaction" };
    const args = { args: [signedProposal] };

    const response = await apiClient.sendSyncRequest(contract, method, args);
    expect(response).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.status).toEqual("SUCCESS");
  });

  /**
   * Send transaction proposal to be signed with keys from connector wallet (managed by the connector).
   * Verify correct response from the call.
   */
  test("Signining proposal with connector wallet keys work", async () => {
    // Get asset data to be transfered
    const allAssets = await getAllAssets();
    const assetId = allAssets[2].ID;
    const newOwnerName = "SignWithConnectorXXX";

    // Prepare signed proposal
    const contract = { channelName: ledgerChannelName };
    const method = { type: "function", command: "sendSignedProposal" };
    const argsParam = {
      args: {
        transactionProposalReq: {
          fcn: "TransferAsset",
          args: [assetId, newOwnerName],
          chaincodeId: ledgerContractName,
          channelId: ledgerChannelName,
        },
      },
    };

    const response = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParam,
    );
    expect(response).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.signedCommitProposal).toBeTruthy();
    expect(response.data.commitReq).toBeTruthy();
    expect(response.data.txId).toBeTruthy();
  });

  /**
   * Start monitoring for fabric events.
   * Send new transaction to the ledger (async)
   * Finish after receiving event for matching transaction function.
   * This function needs separate timeout, in case of error (no event was received).
   */
  test(
    "Monitoring for transaction sending works",
    async () => {
      // Get asset data to be transfered
      const allAssets = await getAllAssets();
      const assetId = allAssets[3].ID;
      const newOwnerName = "MonitorChangedXXX";
      const txFunctionName = "TransferAsset";

      // Start monitoring
      const monitorPromise = new Promise<void>((resolve, reject) => {
        apiClient.watchBlocksV1().subscribe({
          next(event) {
            expect(event.status).toBe(200);

            const matchingEvents = event.blockData.filter(
              (e) => e.func === txFunctionName,
            );

            if (matchingEvents.length > 0) {
              resolve();
            }
          },
          error(err) {
            log.error("watchBlocksV1() error:", err);
            reject(err);
          },
        });
      });

      // Get signed proposal
      const signedProposal = await getSignedProposal({
        fcn: txFunctionName,
        args: [assetId, newOwnerName],
        chaincodeId: ledgerContractName,
        channelId: ledgerChannelName,
      });

      // Send transaction (async)
      const contract = { channelName: ledgerChannelName };
      const method = { type: "sendSignedTransaction" };
      const args = { args: [signedProposal] };
      apiClient.sendAsyncRequest(contract, method, args);

      expect(monitorPromise).toResolve();
    },
    60 * 1000,
  );
});
