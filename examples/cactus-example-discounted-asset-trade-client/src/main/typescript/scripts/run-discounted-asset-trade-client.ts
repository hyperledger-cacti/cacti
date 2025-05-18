#!/usr/bin/env node

/**
 * Client App for interacting with discounted asset trade application.
 * Make sure example app is running before starting this client!
 * Client will establish connection with sample app and present menu with possible actions.
 */

import * as log from "loglevel";
import inquirer from "inquirer";
import axios from "axios";
import {
  AnoncredAgent,
  createAliceAgent,
  createNewConnectionInvitation,
  getAgentCredentials,
  waitForConnection,
} from "../public-api";

// Logger setup
const logLevel = process.env.LOG_LEVEL ?? "INFO";
log.setDefaultLevel(logLevel as log.LogLevelDesc);
console.log("Running with log level", logLevel);

// Constants
const FROM_ETH_ACCOUNT_ADDR = "0xec709e1774f0ce4aba47b52a499f9abaaa159f71";
const ESCROW_ETH_ACCOUNT_ADDR = "0x36e146d5afab61ab125ee671708eeb380aea05b6";
const TO_ETH_ACCOUNT_ADDR = "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55";

/**
 * Main menu actions
 */
enum PromptOptions {
  StartTrade = "Start the trade",
  GetCredentials = "Get this agent credentials",
  GetAssets = "Get assets",
  Exit = "Exit",
}

/**
 * Connection ID to identify this agent on BLP side.
 * Must be set during this script startup.
 */
let blpConnectionId: string | undefined;

/**
 * Creates an invitation, sends it to BLP, awaits for connection to be established.
 * Sets global blpConnectionId on success.
 *
 * @param clientAgent this app agent
 */
async function connectAgentToBLP(clientAgent: AnoncredAgent) {
  log.debug("Connecting to the discounted asset trade sample app agent...");

  // Create invitation
  const { outOfBandRecord, invitationUrl } =
    await createNewConnectionInvitation(clientAgent);
  const isConnectedPromise = waitForConnection(clientAgent, outOfBandRecord.id);

  // Send request to the BLP agent
  log.debug("Invitation link:", invitationUrl);
  const connectResponse = await axios.post(
    "http://localhost:5034/api/v1/bl/indy/connect",
    {
      invitationUrl,
    },
  );
  log.debug("Indy connect response:", connectResponse.data);

  blpConnectionId = connectResponse.data.blpConnectionId;
  if (!blpConnectionId) {
    throw new Error("No this agents connectionId received from the BLP!");
  }

  // Wait for connection
  await isConnectedPromise;
  log.info(
    "Connected to the discounted asset trade sample app agent! ID:",
    blpConnectionId,
  );
}

/**
 * Sends trade request to the discounted asset trade sample app.
 */
async function sendTradeRequest() {
  if (!blpConnectionId) {
    throw new Error("No this agents connectionId received from the BLP!");
  }

  const connectResponse = await axios.post(
    "http://localhost:5034/api/v1/bl/trades/",
    {
      businessLogicID: "guks32pf",
      tradeParams: [
        "0xec709e1774f0ce4aba47b52a499f9abaaa159f71",
        "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55",
        "Brad",
        "Cathy",
        "asset2",
        blpConnectionId,
      ],
      authParams: ["<<company name>>"],
    },
  );
  log.info("Trade request sent! Response:", connectResponse.data);
}

/**
 * Print this agent credentials from a wallet (in a simplified form).
 *
 * @param agent this app agent
 */
async function printAgentCredentials(agent: AnoncredAgent) {
  const credentials = await getAgentCredentials(agent);
  log.info(JSON.stringify(credentials, undefined, 2));
}

/**
 * Gets asset summary from BLP (both ethereum and fabric).
 */
async function getAssetsFromSampleApp() {
  // Read ethereum balances
  const fromAccountResponse = await axios.get(
    `http://localhost:5034/api/v1/bl/balance/${FROM_ETH_ACCOUNT_ADDR}`,
  );
  log.info("\n# Ethereum fromAccount:");
  log.info(fromAccountResponse.data);

  const escrowAccountResponse = await axios.get(
    `http://localhost:5034/api/v1/bl/balance/${ESCROW_ETH_ACCOUNT_ADDR}`,
  );
  log.info("\n# Ethereum escrowAccount:");
  log.info(escrowAccountResponse.data);

  const toAccountResponse = await axios.get(
    `http://localhost:5034/api/v1/bl/balance/${TO_ETH_ACCOUNT_ADDR}`,
  );
  log.info("\n# Ethereum toAccount:");
  log.info(toAccountResponse.data);

  // Read fabric assets
  const fabricResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/fabric-asset/",
  );
  log.info("\n# Fabric:");
  log.info(fabricResponse.data);
}

/**
 * Show menu prompt and wait for action select.
 *
 * @returns action selected
 */
async function getPromptChoice() {
  return inquirer.prompt({
    type: "list",
    prefix: "",
    name: "menu",
    message: "Action:",
    choices: Object.values(PromptOptions),
  });
}

/**
 * Main application loop, will print menu with actions.
 *
 * @param agent this app agent
 */
async function menuLoop(agent: AnoncredAgent) {
  let isRunning = true;

  while (isRunning) {
    try {
      const choice = await getPromptChoice();

      switch (choice.menu) {
        case PromptOptions.StartTrade:
          await sendTradeRequest();
          break;
        case PromptOptions.GetCredentials:
          await printAgentCredentials(agent);
          break;
        case PromptOptions.GetAssets:
          await getAssetsFromSampleApp();
          break;
        case PromptOptions.Exit:
          isRunning = false;
          break;
      }
    } catch (error) {
      if (error.isTtyError) {
        log.error("Prompt couldn't be rendered in the current environment:");
        isRunning = false;
      }
      if (axios.isAxiosError(error)) {
        log.error(
          `Request error: ${error.name} ${error.message} - ${JSON.stringify(
            error.response?.data,
          )}`,
        );
      } else {
        log.error("Menu action error:", error);
      }
    }
  }
}

/**
 * Main application logic.
 */
async function run() {
  const aliceAgent = await createAliceAgent();
  log.debug("Alice (client) agent created");

  try {
    await connectAgentToBLP(aliceAgent);

    log.debug("Running menu loop...");
    await menuLoop(aliceAgent);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log.error(
        `Request error: ${error.name} ${error.message} - ${JSON.stringify(
          error.response?.data,
        )}`,
      );
    } else {
      log.error("Client app error:", error);
    }
  } finally {
    log.info("Exiting the client app...");
    aliceAgent.shutdown();
  }
}

// Run the main logic
run();
