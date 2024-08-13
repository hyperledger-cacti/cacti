/**
 * This script demonstrates how to connect the Cacti fabric connector and persistence plugins
 * to an existing Fabric ledger and Supabase database backend.
 * Detailed steps are provided to ensure the reader can follow along and customize the code as needed.
 *
 * ## Usage
 *
 * Must be run with the following environment variables set:
 *  - `FABRIC_CONNECTION_PROFILE_PATH` => Full path to fabric ledger connection profile JSON file.
 *  - `FABRIC_CHANNEL_NAME` => Name of the channel we want to connect to (to store it's data).
 *  - `FABRIC_WALLET_PATH`  => Full path to wallet containing our identity (that can connect and observe specified channel).
 *  - `FABRIC_WALLET_LABEL` => Name (label) of our identity in a wallet provided in FABRIC_WALLET_PATH
 *  - `SUPABASE_CONNECTION_STRING` (optional)  => PostgreSQL connection string to supabase instance where we'll store the ledger data. If not provided,
 *    it will try to use a localhost instance (user should run `supabase-all-in-one` container before running a script).
 */

import { exit } from "node:process";
import { readFileSync } from "node:fs";
import { Wallets } from "fabric-network";
import { cleanupApiServer, setupApiServer } from "./common-setup-methods";

/**
 * Simple helper method for reading environment variable and exiting if that variable was not found.
 */
function getRequiredEnvVariable(envVariableName: string) {
  const value = process.env[envVariableName] ?? "";
  if (!value) {
    console.error(`Missing environment variable ${envVariableName}!`);
    exit(1);
  }
  return value;
}

// Read the required environment variables
const FABRIC_CONNECTION_PROFILE_PATH = getRequiredEnvVariable(
  "FABRIC_CONNECTION_PROFILE_PATH",
);
const FABRIC_CHANNEL_NAME = getRequiredEnvVariable("FABRIC_CHANNEL_NAME");
const FABRIC_WALLET_PATH = getRequiredEnvVariable("FABRIC_WALLET_PATH");
const FABRIC_WALLET_LABEL = getRequiredEnvVariable("FABRIC_WALLET_LABEL");

/**
 * Main application function.
 * Will read all the required configuration data, create an ApiServer and run the block monitoring.
 */
async function main() {
  // First, we read and parse the connection profile JSON file.
  const connectionProfileString = readFileSync(
    FABRIC_CONNECTION_PROFILE_PATH,
    "utf-8",
  );
  console.log(`Connection profile path: ${FABRIC_CONNECTION_PROFILE_PATH}`);
  if (!connectionProfileString) {
    throw new Error("Could not read fabric connection profile (empty file)");
  }
  const connectionProfile = JSON.parse(connectionProfileString);

  // Now we open the filesystem wallet and extract the signing identity (it will be needed to access the ledger
  // in order to read it's data).
  const wallet = await Wallets.newFileSystemWallet(FABRIC_WALLET_PATH);
  console.log(`Wallet path: ${FABRIC_WALLET_PATH}`);
  const userIdentity = await wallet.get(FABRIC_WALLET_LABEL);
  if (!userIdentity) {
    throw new Error(
      `Missing identity of user ${FABRIC_WALLET_LABEL} in specified wallet!`,
    );
  }

  // Set up the ApiServer with Fabric Connector and Fabric Persistence plugins.
  // It returns the persistence plugin, which we can use to run monitoring operations.
  const { persistence } = await setupApiServer(
    9930, // run at that port
    FABRIC_CHANNEL_NAME,
    connectionProfile,
    userIdentity as any,
  );
  console.log("Environment is running...");

  // Start monitoring for ledger state changes.
  // Any updates will be pushed to the database, and all errors will be printed to the console.
  // Press Ctrl + C to stop.
  persistence.startMonitor((err) => {
    console.error("Persistence monitor error:", err);
  });
}

// The following code is used to exit (and cleanup all the acquired resources) in case CTRL + C was pressed.
process.once("uncaughtException", async () => {
  await cleanupApiServer();
  process.exit();
});

process.once("SIGINT", () => {
  console.log("SIGINT received...");
  throw new Error();
});

// Run the main application loop
main();
