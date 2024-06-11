#!/usr/bin/env node

/**
 * Simple command line tool to check ledger connection of running ethereum connector.
 * Will try to get latest block from the ledger.
 *
 * Usage:
 *  After installing the connector package...
 *    `npm install -g` in it's dir or directly from NPM - `npm install @hyperledger/cactus-plugin-ledger-connector-ethereum`
 *  ...you can start the command line tool with npx:
 *    `npx cacti-ethereum-connector-status <URL>:<PORT>`
 *
 * TODO:
 * - Add healthcheck endpoint to ethereum connector and query it instead of reading the latest block.
 */

import {
  EthereumApiClient,
  EthereumApiClientOptions,
} from "../main/typescript/public-api";

import minimist from "minimist";
import path from "path";
import axios from "axios";
import chalk from "chalk";

type AuthOptions = {
  apiKey?: string;
  accessToken?: string;
  username?: string;
  password?: string;
};

async function main(url: string, auth: AuthOptions = {}) {
  try {
    console.log(`Check Ethereum connector ${url}...`);
    const config = new EthereumApiClientOptions({
      basePath: url,
      ...auth,
    });
    const ethereumApiClient = new EthereumApiClient(config);

    // Get latest block
    const connectorResponse = await ethereumApiClient.invokeWeb3EthMethodV1({
      methodName: "getBlock",
      params: ["latest"],
    });

    // Check response
    if (
      !connectorResponse ||
      !connectorResponse.data ||
      !connectorResponse.data.data ||
      connectorResponse.data.status !== 200
    ) {
      console.log(connectorResponse.data);
      throw new Error("Invalid response from the connector");
    }

    const blockData = connectorResponse.data.data;
    console.log(
      chalk.green(`OK - Latest block #${blockData.number} ${blockData.hash}`),
    );
  } catch (error: unknown) {
    let errorMessage = `Error: ${error}`;
    if (axios.isAxiosError(error)) {
      errorMessage = `${error.name}: ${error.message}`;
    }

    console.error(chalk.red(errorMessage));
    process.exit(2);
  }
}

function showHelp() {
  const scriptName = path.basename(__filename);
  console.log(
    chalk.yellow(
      `Usage: ${scriptName} <CONNECTOR_URL>:<PORT> [-h|--help] [--apiKey <KEY>] [--accessToken <KEY>] [--username <USERNAME> --password <PASSWORD>]`,
    ),
  );
  process.exit(1);
}

if (require.main === module) {
  const argv = minimist(process.argv.slice(2));
  if (
    argv["h"] ||
    argv["help"] ||
    argv["_"].length !== 1 ||
    (argv["username"] && !argv["password"]) ||
    (argv["password"] && !argv["username"])
  ) {
    showHelp();
  }
  const connectorUrl = argv["_"][0];

  // Ensure valid URL was provided.
  // Without it the connector request will hang indefinitely.
  try {
    new URL(connectorUrl);
  } catch (err) {
    console.error(chalk.red(err));
    showHelp();
  }

  main(connectorUrl, {
    apiKey: argv["apiKey"],
    accessToken: argv["accessToken"],
    username: argv["username"],
    password: argv["password"],
  });
}
