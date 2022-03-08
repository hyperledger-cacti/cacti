import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { isStdLibRecord } from "./is-std-lib-record";
import { sortPackageJson } from "sort-package-json";

export interface ICheckPackageJsonSort {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}

/**
 * Sorts and checks that all the package.json files within the Cactus project
 * Note: this only sorts and checks the package.json files that are within the
 * `packages` folder for this proeject
 *
 * @returns An array with the first item being a boolean indicating
 * 1) success (`true`) or 2) failure (`false`)
 */
export async function checkPackageJsonSort(
  req: ICheckPackageJsonSort,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-package-json-sort.ts]";
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
  sortPackageJson(pkgJsonPaths);

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
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}
