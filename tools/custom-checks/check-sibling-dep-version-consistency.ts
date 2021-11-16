import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { isStdLibRecord } from "./is-std-lib-record";

export interface ICheckSiblingDepVersionConsistencyRequest {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
  /**
   * The version that will be used as the correct one when checking the sibling
   * package dependency version declarations.
   * If you omit this (optional) parameter then the root package.json file
   * will be parsed to obtain its value at runtime.
   */
  readonly version?: string;
}

/**
 * Verifies that each sibling dependency is up to date with the latest version
 * that was released at any given time.
 * Note: This only checks dependency versions for the packages that are hosted
 * within this monorepo (Hyperledger Cactus) not dependencies in general.
 *
 * For example if the cmd-api-server package depends on the common package and
 * currently the project is on release v1.2.3 then the dependency declaration of
 * the package.json file of the cmd-api-server package should also use this
 * v1.2.3 version not something outdated such as v0.3.1 because that may cause
 * (according to our experience) strange build issues that confuse people a lot
 * for no good reason.
 *
 * @returns An array with the first item being a boolean indicating
 * 1) success (`true`) or 2) failure (`false`)
 */
export async function checkSiblingDepVersionConsistency(
  req: ICheckSiblingDepVersionConsistencyRequest,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-sibling-dep-version-consistency.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");
  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  if (!req) {
    throw new RuntimeError(`req parameter cannot be falsy.`);
  }
  if (!req.argv) {
    throw new RuntimeError(`req.argv cannot be falsy.`);
  }
  if (!req.env) {
    throw new RuntimeError(`req.env cannot be falsy.`);
  }

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules"],
  };

  const DEFAULT_GLOB = "**/cactus-*/package.json";

  const pkgJsonPaths = await globby(DEFAULT_GLOB, globbyOpts);
  console.log(`${TAG} package.json paths: (${pkgJsonPaths.length}): `);
  
  const lernaJsonPathAbs = path.join(PROJECT_DIR, "./lerna.json");
  console.log(`${TAG} Reading root lerna.json at ${lernaJsonPathAbs}`);
  const lernaJson = await fs.readJSON(lernaJsonPathAbs);
  const correctVersion = req.version || lernaJson.version;
  console.log(`${TAG} Correct Version: ${correctVersion}`);

  const errors: string[] = [];

  const checks = pkgJsonPaths.map(async (pathRel) => {
    const filePathAbs = path.join(PROJECT_DIR, pathRel);
    const pkgJson: unknown = await fs.readJSON(filePathAbs);
    if (typeof pkgJson !== "object") {
      errors.push(`ERROR: ${pathRel} package.json cannot be empty.`);
      return;
    }
    if (!pkgJson) {
      errors.push(`ERROR: ${pathRel} package.json cannot be empty.`);
      return;
    }
    if (!isStdLibRecord(pkgJson)) {
      return;
    }

    const { dependencies, devDependencies, version } = pkgJson;

    if (version !== correctVersion) {
      const msg = `ERROR: ${pathRel} the package itself incorrectly has version ${version}. Expected ${correctVersion}`;
      errors.push(msg);
    }

    if (isStdLibRecord(dependencies)) {
      Object.entries(dependencies).forEach(([depName, depVersion]) => {
        if (!depName.startsWith("@hyperledger/cactus-")) {
          return;
        }
        if (depVersion !== correctVersion) {
          const msg = `ERROR: ${pathRel} dependencies.${depName} incorrectly has version ${depVersion}. Expected ${correctVersion}`;
          errors.push(msg);
        }
      });
    } else {
      console.log(`${TAG} ${pathRel} has no "dependencies". Skipping...`);
    }

    if (isStdLibRecord(devDependencies)) {
      Object.entries(devDependencies).forEach(([depName, depVersion]) => {
        if (!depName.startsWith("@hyperledger/cactus-")) {
          return;
        }
        if (depVersion !== correctVersion) {
          const msg = `ERROR: ${pathRel} devDependencies.${depName} incorrectly has version ${depVersion}. Expected ${correctVersion}`;
          errors.push(msg);
        }
      });
    } else {
      console.log(`${TAG} ${pathRel} has no "devDependencies". Skipping...`);
    }
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}
