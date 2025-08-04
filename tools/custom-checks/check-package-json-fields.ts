/**
 * Validate if all the fields of package.json files are conformant to a common schema.
 */

import fs from "fs-extra";
import path from "path";
import Joi from "joi";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { isStdLibRecord } from "./is-std-lib-record";
import lernaCfg from "../../lerna.json" assert { type: "json" };

const CACTI_VERSION = lernaCfg.version;
const CACTI_HOMEPAGE = "https://github.com/hyperledger-cacti/cacti#readme";
const CACTI_BUGS = "https://github.com/hyperledger-cacti/cacti/issues";
const CACTI_REPO = "git+https://github.com/hyperledger-cacti/cacti.git";
const CACTI_MAIL_LIST = "cacti@lists.lfdecentralizedtrust.org";
const CACTI_PROJECT_URI = "https://www.lfdecentralizedtrust.org/projects/cacti";
// const CACTI_NODE_REQ = ">=18";
// const CACTI_NPM_REQ = ">=8";

/**
 * Common schema for all cacti packages.
 */
const schema = Joi.object({
  name: Joi.string()
    .pattern(new RegExp("^@hyperledger(-cacti)?/(cacti-|cactus-).*"))
    .lowercase()
    .required(),
  version: Joi.string().valid(CACTI_VERSION).required(),
  private: Joi.bool().valid(false),
  description: Joi.string().min(10).required(),
  keywords: Joi.array()
    .items(Joi.string())
    .has(Joi.valid("Hyperledger"))
    .has(Joi.valid("Cacti"))
    .required(),
  homepage: Joi.string().valid(CACTI_HOMEPAGE).required(),
  bugs: Joi.object()
    .valid({
      url: CACTI_BUGS,
    })
    .required(),
  repository: Joi.object()
    .valid({
      type: "git",
      url: CACTI_REPO,
    })
    .required(),
  license: Joi.string().valid("Apache-2.0").required(),
  author: Joi.object()
    .valid({
      name: "Hyperledger Cacti Contributors",
      email: CACTI_MAIL_LIST,
      url: CACTI_PROJECT_URI,
    })
    .required(),
  files: Joi.array().items(Joi.string()),
  // engines: Joi.object()
  //   .valid({
  //     node: CACTI_NODE_REQ,
  //     npm: CACTI_NPM_REQ,
  //   })
  //   .required(),
  publishConfig: Joi.object({ access: Joi.string().valid("public") })
    .unknown()
    .required(),
}).unknown();

/**
 * Common input interface for custom checks.
 */
export interface CheckCommonPackageFieldsArgs {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}

/**
 * Validate if all the fields of package.json files are conformant to a common schema.
 *
 * Note: this checks every package.json file that are included in the workspace
 * globs (see lerna.json and package.json files in the **root** directory of the
 * project)
 *
 * @returns `[isErrorFlag, errorMessages[]]`
 */
export async function checkCommonPackageFields(
  req: CheckCommonPackageFieldsArgs,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-package-json-fields.ts]";
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

  const pkgJsonGlobPatterns = lernaCfg.packages.map((it: string) =>
    "./".concat(it).concat(`/package.json`),
  );
  console.log("Globbing lerna package patterns: ", pkgJsonGlobPatterns);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules"],
  };
  const includeGlobs = lernaCfg.packages.map((x) => x.concat("/package.json"));
  const pkgJsonPaths = await globby(includeGlobs, globbyOpts);

  const errors: string[] = [];
  const checks = pkgJsonPaths.map(async (pathRel) => {
    const filePathAbs = path.join(PROJECT_DIR, pathRel);
    const pkgJson: unknown = await fs.readJSON(filePathAbs);
    if (!pkgJson) {
      errors.push(`ERROR: ${pathRel} package.json cannot be empty.`);
      return;
    }
    if (!isStdLibRecord(pkgJson)) {
      return;
    }

    const { error: validationError } = schema.validate(pkgJson);
    if (validationError) {
      const errorMessage = `ERROR: ${pathRel} field check failed. Details: ${JSON.stringify(validationError.details)}`;
      errors.push(errorMessage);
      console.error(errorMessage);
      return;
    }

    // Check Hyperledger cacti dependency versions
    // TODO - use it once all dependencies have common prefix (hyperledger-cacti, hyperledger/cacti, etc...)
    //  It could replace check-sibling-dep-version-consistency check.
    //  Must first agree that there's no need for depending on older release of cacti package within monorepo.
    // const loosePkgJson = pkgJson as any;
    // const packageDependencies = {
    //   ...loosePkgJson.devDependencies,
    //   ...loosePkgJson.dependencies,
    // };
    // const cactiDependencies = Object.entries(packageDependencies).filter(
    //   ([key, value]) => key.startsWith("@hyperledger"),
    // );
    // cactiDependencies.forEach((entry) => {
    //   if (entry[1] !== CACTI_VERSION) {
    //     errors.push(
    //       `ERROR: ${pathRel} dependency version invalid for ${entry[0]}, should be: ${CACTI_VERSION}}`,
    //     );
    //   }
    // });
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}
