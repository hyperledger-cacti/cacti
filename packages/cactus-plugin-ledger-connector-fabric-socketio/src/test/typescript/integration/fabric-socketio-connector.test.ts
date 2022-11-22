/**
 * Functional test of basic operations on connector-fabric-socketio (packages/cactus-plugin-ledger-connector-fabric-socketio)
 * Assumes sample CC was is deployed on the test ledger.
 * Tests include sending and evaluation transactions, and monitoring for events.
 *
 * You can speed up development or troubleshooting by using same ledger repeatadely.
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

// Ledger settings
const imageName = "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
const imageVersion = "2021-09-02--fix-876-supervisord-retries";
const fabricEnvVersion = "2.2.0";
const fabricEnvCAVersion = "1.4.9";
const ledgerUserName = "appUser";
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";
const leaveLedgerRunning = false; // default: false
const useRunningLedger = false; // default: false

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
  SelfSignedPkiGenerator,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import { signProposal } from "../../../main/typescript/connector/sign-utils";

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

/**
 * Main test suite
 */
describe("Fabric-SocketIO connector tests", () => {
  let ledger: FabricTestLedgerV1;
  let connectorCertValue: string;
  let connectorPrivKeyValue: string;
  let tmpWalletDir: string;
  let connectorModule: typeof import("../../../main/typescript/index");
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

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    // Prepare local filesystem wallet path
    if (leaveLedgerRunning || useRunningLedger) {
      tmpWalletDir = path.join(os.tmpdir(), "fabric-test-wallet-common");
      log.warn("Using common wallet path when re-using the same ledger.");
      try {
        fs.mkdirSync(tmpWalletDir);
      } catch (err) {
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

    // Enroll admin and user
    await enrollAdmin(connectionProfile, tmpWalletDir, adminName, adminSecret);
    await enrollUser(
      connectionProfile,
      tmpWalletDir,
      ledgerUserName,
      adminName,
    );

    // Generate connector private key and certificate
    const pkiGenerator = new SelfSignedPkiGenerator();
    const pki = pkiGenerator.create("localhost");
    connectorCertValue = pki.certificatePem;
    connectorPrivKeyValue = pki.privateKeyPem;
    const jwtAlgo = "RS512";

    // Get connector config
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

    // Load connector module
    connectorModule = await import("../../../main/typescript/index");

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

    if (ledger && !leaveLedgerRunning && !useRunningLedger) {
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

    if (tmpWalletDir && !leaveLedgerRunning && !useRunningLedger) {
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

  /**
   * Calls connector function `generateUnsignedProposal`, assert correct response, and returns unsigned proposal.
   * @param txProposal - Transaction data we want to send (CC function name, arguments, chancode ID, channel ID)
   * @returns Unsigned proposal that can be signed locally and feed into `sendSignedProposalV2`
   */
  async function getUnsignedProposal(txProposal: unknown, certPem: string) {
    const contract = { channelName: ledgerChannelName };
    const method = { type: "function", command: "generateUnsignedProposal" };
    const argsParam = {
      args: {
        transactionProposalReq: txProposal,
        certPem,
      },
    };

    log.info("Sending generateUnsignedProposal");

    const response = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParam,
    );
    expect(response).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.proposal).toBeTruthy();
    expect(response.data.proposalBuffer).toBeTruthy();
    expect(response.data.proposalBuffer.type).toEqual("Buffer");
    expect(response.data.proposalBuffer.data).toBeTruthy();
    expect(response.data.txId).toBeTruthy();

    const proposalBuffer = Buffer.from(response.data.proposalBuffer);
    expect(proposalBuffer).toBeTruthy();

    log.info("Received correct response from generateUnsignedProposal");

    return {
      proposal: response.data.proposal,
      proposalBuffer,
      txId: response.data.txId,
    };
  }

  /**
   * Calls connector function `generateUnsignedTransaction`, assert correct response, and returns unsigned transaction (commit) proposal.
   * @param txProposal - Transaction data we want to send (CC function name, arguments, chancode ID, channel ID)
   * @param proposalResponses - Proposal resonses of endorsment step from `sendSignedProposalV2` call.
   * @returns Unsigned commit proposal that can be signed locally and feed into `sendSignedTransactionV2`
   */
  async function getUnsignedCommitProposal(
    txProposal: unknown,
    proposalResponses: unknown,
  ) {
    const contract = { channelName: ledgerChannelName };
    const method = { type: "function", command: "generateUnsignedTransaction" };
    const argsParam = {
      args: {
        proposal: txProposal,
        proposalResponses: proposalResponses,
      },
    };

    log.info("Sending generateUnsignedTransaction");

    const response = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParam,
    );

    expect(response).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.txProposalBuffer).toBeTruthy();
    expect(response.data.txProposalBuffer.type).toEqual("Buffer");
    expect(response.data.txProposalBuffer.data).toBeTruthy();

    const commitProposalBuffer = Buffer.from(response.data.txProposalBuffer);
    expect(commitProposalBuffer).toBeTruthy();

    log.info("Received correct response from generateUnsignedTransaction");

    return commitProposalBuffer;
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Test signProposal helper function from fabric-socketio connector module.
   */
  test("Signing proposal creates a signature", async () => {
    const [, privateKeyPem] = await getUserCryptoFromWallet(
      ledgerUserName,
      tmpWalletDir,
    );

    const proposal = Buffer.from("test test test test");
    const signedProposal = signProposal(proposal, privateKeyPem);

    expect(signedProposal).toBeTruthy();
    expect(signedProposal.proposal_bytes).toBeTruthy();
    expect(signedProposal.signature).toBeTruthy();
  });

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
   * Get block by number.
   */
  test("Get block by it's number works (both decoded and encoded)", async () => {
    const contract = { channelName: ledgerChannelName };
    const method = { type: "function", command: "getBlock" };
    const argsParam = {
      blockNumber: 0,
    };

    // Get decoded block
    const response = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParam,
    );
    expect(response).toBeTruthy();
    expect(response.status).toEqual(200);
    expect(response.data).toBeTruthy();
    expect(response.data.header).toBeTruthy();
    expect(response.data.data).toBeTruthy();
    expect(response.data.metadata).toBeTruthy();

    // Get encoded block
    const argsParamEncoded = {
      ...argsParam,
      skipDecode: true,
    };

    const responseEncoded = await apiClient.sendSyncRequest(
      contract,
      method,
      argsParamEncoded,
    );
    expect(responseEncoded).toBeTruthy();
    expect(responseEncoded.status).toEqual(200);
    expect(responseEncoded.data).toBeTruthy();
    expect(responseEncoded.data.type).toEqual("Buffer");
    expect(responseEncoded.data.data).toBeTruthy();
  });

  /**
   * Test entire process of sending transaction to the ledger without sharing the key with the connector.
   * All proposals are signed on BLP (in this case, jest test) side.
   * This test prepares proposal, signs it, sends for endorsment, prepares and sign commit proposal, sends commit transaction.
   */
  test("Sending transaction signed on BLP side (without sharing the private key) works", async () => {
    const [certPem, privateKeyPem] = await getUserCryptoFromWallet(
      ledgerUserName,
      tmpWalletDir,
    );

    // Prepare raw transaction proposal
    const allAssets = await getAllAssets();
    const assetId = allAssets[1].ID;
    const newOwnerName = "UnsignedSendTestXXX";
    const txProposal = {
      fcn: "TransferAsset",
      args: [assetId, newOwnerName],
      chaincodeId: ledgerContractName,
      channelId: ledgerChannelName,
    };
    log.debug("Raw transaction proposal:", txProposal);

    // Get unsigned proposal
    const { proposal, proposalBuffer } = await getUnsignedProposal(
      txProposal,
      certPem,
    );

    // Prepare signed proposal
    const signedProposal = signProposal(proposalBuffer, privateKeyPem);

    // Call sendSignedProposalV2
    const contractSignedProposal = { channelName: ledgerChannelName };
    const methodSignedProposal = {
      type: "function",
      command: "sendSignedProposalV2",
    };
    const argsSignedProposal = {
      args: {
        signedProposal,
      },
    };

    log.info("Sending sendSignedProposalV2");
    const responseSignedProposal = await apiClient.sendSyncRequest(
      contractSignedProposal,
      methodSignedProposal,
      argsSignedProposal,
    );

    expect(responseSignedProposal).toBeTruthy();
    expect(responseSignedProposal.status).toBe(200);
    expect(responseSignedProposal.data).toBeTruthy();
    expect(responseSignedProposal.data.endorsmentStatus).toBeTrue();
    expect(responseSignedProposal.data.proposalResponses).toBeTruthy();
    log.info("Received correct response from sendSignedProposalV2");
    const proposalResponses = responseSignedProposal.data.proposalResponses;

    // Get unsigned commit (transaction) proposal
    const commitProposalBuffer = await getUnsignedCommitProposal(
      proposal,
      proposalResponses,
    );

    // Prepare signed commit proposal
    const signedCommitProposal = signProposal(
      commitProposalBuffer,
      privateKeyPem,
    );

    // Call sendSignedTransactionV2
    const contractSignedTransaction = { channelName: ledgerChannelName };
    const methodSignedTransaction = {
      type: "function",
      command: "sendSignedTransactionV2",
    };
    const argsSignedTransaction = {
      args: {
        signedCommitProposal: signedCommitProposal,
        proposal: proposal,
        proposalResponses: proposalResponses,
      },
    };

    log.info("Sending sendSignedTransactionV2");
    const responseSignedTransaction = await apiClient.sendSyncRequest(
      contractSignedTransaction,
      methodSignedTransaction,
      argsSignedTransaction,
    );

    expect(responseSignedTransaction).toBeTruthy();
    expect(responseSignedTransaction.status).toBe(200);
    expect(responseSignedTransaction.data).toBeTruthy();
    expect(responseSignedTransaction.data.status).toEqual("SUCCESS");
    log.info("Received correct response from sendSignedTransactionV2");
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
