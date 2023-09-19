import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { isStdLibRecord } from "./is-std-lib-record";

export interface ICheckPkgLicensesRequest {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
  readonly expectedLicenseSpdx?: string;
}

export const DEFAULT_EXPECTED_LICENSE_SPDX = "Apache-2.0" as const;

/**
 * @returns An array with the first item being a boolean indicating
 * 1) success (`true`) or 2) failure (`false`) and the second item being an
 * array of strings which contain all the errors found (if any).
 */
export async function checkPkgLicenses(
  req: ICheckPkgLicensesRequest,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-pkg-licenses.ts]";
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

  const expectedLicenseSpdx =
    req.expectedLicenseSpdx ?? DEFAULT_EXPECTED_LICENSE_SPDX;

  console.log(`${TAG} req.expectedLicenseSpdx=${req.expectedLicenseSpdx}`);
  console.log(
    `${TAG} DEFAULT_EXPECTED_LICENSE_SPDX=${DEFAULT_EXPECTED_LICENSE_SPDX}`,
  );
  console.log(`${TAG} Concluded expectedLicenseSpdx=${expectedLicenseSpdx}`);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules"],
  };
  const DEFAULT_GLOB = "**/package.json";

  console.log(`${TAG} Glob pattern=%s - options=%o`, DEFAULT_GLOB, globbyOpts);
  const pkgJsonPaths = await globby(DEFAULT_GLOB, globbyOpts);
  console.log(`${TAG} Glob found %o package.json files.`, pkgJsonPaths.length);

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
    const { license } = pkgJson;
    if (license !== expectedLicenseSpdx) {
      const eMsg = `${TAG} Error: ${pathRel} has incorrect license SPDX. Expected ${expectedLicenseSpdx}, got ${license} instead.`;
      console.log(eMsg);
      errors.push(eMsg);
    }
  });
  await Promise.all(checks);
  return [errors.length === 0, errors];
}
