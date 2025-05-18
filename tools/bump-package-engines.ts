#!/usr/bin/env node

/**
 * Bump minimal nodejs and npm version in all cacti packages.
 * Will add engines entry if one is missing at the moment.
 * How to run:
 *  TS_NODE_PROJECT=tools/tsconfig.json node --experimental-json-modules --trace-deprecation --experimental-modules --abort-on-uncaught-exception --loader ts-node/esm --experimental-specifier-resolution=node ./tools/bump-package-engines.ts
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { sortPackageJson } from "sort-package-json";
import lernaCfg from "../lerna.json" assert { type: "json" };

// Constants
const NODE_PATH = path.resolve(process.argv[1]);
const __FILENAME = path.resolve(fileURLToPath(import.meta.url));
const __DIRNAME = path.dirname(__FILENAME);
const IS_RUN_AS_SCRIPT = NODE_PATH === __FILENAME;
const SCRIPT_DIR = __DIRNAME;
const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
const GLOBBY_OPTIONS: GlobbyOptions = {
  cwd: PROJECT_DIR,
  ignore: ["**/node_modules"],
};

/**
 * Update required engines of single package.json file.
 * Will also sort the file if needed.
 */
async function updateJsonEngines(
  packageJson: {
    engines?: {
      node?: string;
      npm?: string;
    };
  },
  nodeVersion: string,
  npmVersion: string,
) {
  const engines = packageJson.engines ?? {};
  engines.node = `>=${nodeVersion}`;
  engines.npm = `>=${npmVersion}`;
  packageJson.engines = engines;
  return sortPackageJson(packageJson);
}

/**
 * Updates minimal nodeJS and npm versions in all package json files.
 */
export async function bumpPackageEngines(
  nodeVersion: string,
  npmVersion: string,
): Promise<void> {
  const TAG = "[tools/bump-package-engines]";
  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  const includeGlobs = lernaCfg.packages.map((x) => x.concat("/package.json"));

  const pkgJsonPaths = await globby(includeGlobs, GLOBBY_OPTIONS);
  for (const pkg of pkgJsonPaths) {
    console.log(`Process ${pkg}...`);
    const json = await fs.readJSON(pkg);
    const patchedJson = await updateJsonEngines(json, nodeVersion, npmVersion);
    const patchedJsonString = JSON.stringify(patchedJson, null, 2).concat("\n");
    fs.writeFile(pkg, patchedJsonString);
  }
}

/**
 * Main logic of the script
 * @param argv script arguments array
 */
async function main(argv: string[]) {
  const parsedArgv = await yargs(hideBin(argv))
    .version(false)
    .env("CACTI_")
    .option("node", {
      type: "string",
      description: "New minimal NodeJS engine version. ",
    })
    .option("npm", {
      type: "string",
      description: "New minimal NPM engine version. ",
    })
    .demandOption(
      ["node", "npm"],
      "New versions nodejs and npm versions must be provided",
    ).argv;

  await bumpPackageEngines(parsedArgv.node, parsedArgv.npm);
}

if (IS_RUN_AS_SCRIPT) {
  main(process.argv);
}
