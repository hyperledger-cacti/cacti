/*
 * Copyright 2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI for running the benchmark test environment manually.
 * Can be used to run the environment and artillery on two separate machines / containers.
 * The CLI will create matching artillery configuration in CWD of a caller.
 *
 * How to use:
 * > node ./packages/cactus-plugin-ledger-connector-ethereum/dist/lib/test/typescript/benchmark/cli/run-benchmark-environment.js
 */

import fs from "fs";
import yaml from "js-yaml";
import {
  cleanupBenchmarkEnvironment,
  getDefaultArtilleryConfigPath,
  getDefaultArtilleryFunctionsPath,
  setupBenchmarkEnvironment,
} from "../setup/geth-benchmark-env";

/**
 * Function with main logic, will start the environment in current window and freeze until Ctrl + C or other method is used.
 */
async function run() {
  // Start the environment
  const envConfig = await setupBenchmarkEnvironment();

  // Read, patch, and save artillery config for this environment
  const artilleryConfig = yaml.load(
    fs.readFileSync(getDefaultArtilleryConfigPath(), "utf-8"),
  ) as any;
  artilleryConfig.config.target = envConfig.target;
  artilleryConfig.config.processor = getDefaultArtilleryFunctionsPath();
  artilleryConfig.config.variables = envConfig.variables;
  const newConfig = yaml.dump(artilleryConfig);
  fs.writeFileSync(".manual-geth-artillery-config.yaml", newConfig);

  console.log("Benchmark environment started...");
  console.log(
    "To start the test run the following (in separate console window):",
  );
  console.log("> artillery run ./.manual-geth-artillery-config.yaml");
}

/**
 * Called on exit to cleanup the resources.
 * @param exitCode process exit code
 */
async function finish(exitCode = 0) {
  await cleanupBenchmarkEnvironment();
  console.log(`Done! (exit code ${exitCode})`);
  process.exit(exitCode);
}

// Cleanups
process.on("SIGTERM", async () => await finish());
process.on("SIGINT", async () => await finish());
process.on("uncaughtException", async (err) => {
  console.error(`Uncaught error: ${err.message}`);
  await finish(1);
});

// Main logic
run();
