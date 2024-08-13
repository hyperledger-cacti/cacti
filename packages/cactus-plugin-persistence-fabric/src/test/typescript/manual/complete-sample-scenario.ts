/**
 * Complete example of setting up and using the persistence plugin. This script will:
 *  - Start the test Fabric ledger with basic asset contract already deployed on it.
 *  - Begin monitoring ledger changes.
 *  - Run `CreateAsset` method few times to trigger more transactions.
 *
 * Each step is commented in detail to serve as a tutorial.
 */

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { cleanupApiServer, setupApiServer } from "./common-setup-methods";
import {
  FabricApiClient,
  FabricContractInvocationType,
  FabricSigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "debug";

// Ledger settings
const imageName = DEFAULT_FABRIC_2_AIO_IMAGE_NAME;
const imageVersion = FABRIC_25_LTS_AIO_IMAGE_VERSION;
const fabricEnvVersion = FABRIC_25_LTS_AIO_FABRIC_VERSION;
const ledgerChannelName = "mychannel";
const ledgerContractName = "basic";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "complete-sample-scenario",
  level: testLogLevel,
});

let ledger: FabricTestLedgerV1;

//////////////////////////////////
// Environment Setup
//////////////////////////////////

/**
 * Create and start the test ledger to be used by sample scenario.
 *
 * @returns Fabric `connectionProfile`
 */
async function setupTestLedger(): Promise<any> {
  log.info("Start FabricTestLedgerV1...");
  log.debug("Version:", fabricEnvVersion);
  ledger = new FabricTestLedgerV1({
    emitContainerLogs: false,
    publishAllPorts: true,
    logLevel: testLogLevel,
    imageName,
    imageVersion,
    envVars: new Map([["FABRIC_VERSION", fabricEnvVersion]]),
  });
  log.debug("Fabric image:", ledger.getContainerImageName());
  await ledger.start({ omitPull: false });

  // Get connection profile
  log.info("Get fabric connection profile for Org1...");
  const connectionProfile = await ledger.getConnectionProfileOrg1();
  log.debug("Fabric connection profile for Org1 OK: %o", connectionProfile);

  return connectionProfile;
}

/**
 * Stop the test ledger containers (if created).
 * Remember to run it before exiting!
 */
export async function cleanupTestLedger() {
  if (ledger) {
    log.info("Stop the fabric ledger...");
    await ledger.stop();
    await ledger.destroy();
  }
}

/**
 * Called when exiting this script
 */
async function cleanupEnvironment() {
  await cleanupApiServer();
  await cleanupTestLedger();
}

//////////////////////////////////
// Helper Methods
//////////////////////////////////

/**
 * Run `CreateAsset` method of a `basic` contract deployed on a test fabric ledger.
 *
 * @param newAssetId new asset ID (must be unique).
 * @param apiClient Fabric API client to already running connector instance.
 * @param signingCredential Identity to use when sending new transaction to a ledger.
 */
async function runCreateAssetTransaction(
  newAssetId: string,
  apiClient: FabricApiClient,
  signingCredential: FabricSigningCredential,
) {
  const createAssetResponse = await apiClient.runTransactionV1({
    signingCredential,
    channelName: ledgerChannelName,
    invocationType: FabricContractInvocationType.Send,
    contractName: ledgerContractName,
    methodName: "CreateAsset",
    params: [newAssetId, "green", "111", "someOwner", "299"],
  });
  log.info(
    `Transaction with ID ${createAssetResponse.data.transactionId} sent.`,
  );

  return createAssetResponse.data;
}

//////////////////////////////////
// Main Logic
//////////////////////////////////

async function main() {
  // Start the test ethereum ledger which we'll monitor and run some sample operations.
  const connectionProfile = await setupTestLedger();

  // Enroll admin and user
  const enrollAdminOut = await ledger.enrollAdmin();
  log.debug("Enrolled admin OK.");
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  log.debug("Enrolled user OK.");

  // Set up the ApiServer with Fabric Connector and Fabric Persistence plugins.
  // It returns the persistence plugin, which we can use to run monitoring operations.
  const { persistence, apiClient, signingCredential } = await setupApiServer(
    9950, // run at that port
    ledgerChannelName,
    connectionProfile,
    userIdentity,
  );
  console.log("Environment is running...");

  // Start monitoring for ledger state changes.
  // Any updates will be pushed to the database, and all errors will be printed to the console.
  // Press Ctrl + C to stop.
  persistence.startMonitor((err) => {
    console.error("Persistence monitor error:", err);
  });

  // Run few `basic` contract methods to trigger more transactions.
  await runCreateAssetTransaction("1234a", apiClient, signingCredential);
  await runCreateAssetTransaction("1234b", apiClient, signingCredential);
  await runCreateAssetTransaction("1234c", apiClient, signingCredential);

  // Feel free to include any custom code here for more complete test!
  // Remember to press Ctrl + C to exit.
}

// The following code is used to exit (and cleanup all the acquired resources) in case CTRL + C was pressed.
process.once("uncaughtException", async () => {
  await cleanupEnvironment();
  process.exit();
});

process.once("SIGINT", () => {
  console.log("SIGINT received...");
  throw new Error();
});

// Run the main application loop
main();
