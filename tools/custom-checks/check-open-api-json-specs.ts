import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
// import * as globby from "globby";
import { RuntimeError } from "run-time-error";
import { hasProperty } from "./has-property";
import { isStdLibRecord } from "./is-std-lib-record";

/**
 * Verifies that the openapi.json files in the entire project are conformant to
 * certain boilerplate requirements and conventions that are designed to reduce
 * or completely eliminate certain types of bugs/mistakes that users/developers
 * can make (and frequently do without these checks).
 *
 * @returns An array with the first item being a boolean indicating
 * 1) success (`true`) or 2) failure (`false`)
 */
export async function checkOpenApiJsonSpecs(
  req: ICheckOpenApiJsonSpecsRequest,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-open-api-json-specs.ts]";
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

  const DEFAULT_GLOB = "**/src/main/json/openapi.json";

  const oasPaths = await globby(DEFAULT_GLOB, globbyOpts);
  console.log(`openapi.json paths: (${oasPaths.length}): `);
  // const oasPaths = oasPathsEntries.map((it) => it.path);

  const errors: string[] = [];

  const checks = oasPaths.map(async (oasPathRel) => {
    const oasPathAbs = path.join(PROJECT_DIR, oasPathRel);
    const oas: unknown = await fs.readJSON(oasPathAbs);
    if (typeof oas !== "object") {
      errors.push(`ERROR: ${oasPathRel} openapi.json cannot be empty.`);
      return;
    }
    if (!oas) {
      errors.push(`ERROR: ${oasPathRel} openapi.json cannot be empty.`);
      return;
    }
    if (!isStdLibRecord(oas)) {
      return;
    }
    if (!hasProperty(oas, "paths")) {
      return;
    }

    const defaultOpenApiSpecVersion = "3.1.0";
    const oasVersion =
      !!req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_SPEC_VERSION ||
      defaultOpenApiSpecVersion;

    const DEFAULT_LICENSE_SPDX = "Apache-2.0";
    const licenseSpdx =
      !!req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_SPDX ||
      DEFAULT_LICENSE_SPDX;

    const DEFAULT_LICENSE_URL =
      "https://www.apache.org/licenses/LICENSE-2.0.html";
    const licenseUrl =
      !!req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_URL ||
      DEFAULT_LICENSE_URL;

    if (!hasProperty(oas, "openapi")) {
      errors.push(`ERROR: ${oasPathRel} "openapi" must equal "${oasVersion}"`);
    } else if (oas.openapi !== oasVersion) {
      errors.push(`ERROR: ${oasPathRel} "openapi" must equal "${oasVersion}"`);
    }

    if (!hasProperty(oas, "info")) {
      errors.push(`ERROR: ${oasPathRel} "info" must be an object`);
    } else if (!hasProperty(oas.info, "license")) {
      errors.push(`ERROR: ${oasPathRel} "info.license" must be an object`);
    } else {
      if (!hasProperty(oas.info.license, "identifier")) {
        const msg = `ERROR: ${oasPathRel} "info.license.identifier" must be set`;
        errors.push(msg);
      } else if (oas.info.license.identifier !== licenseSpdx) {
        const msg = `ERROR: ${oasPathRel} "info.license.identifier" must be ${licenseSpdx}`;
        errors.push(msg);
      }

      if (!hasProperty(oas.info.license, "name")) {
        const msg = `ERROR: ${oasPathRel} "info.license.name" must be set`;
        errors.push(msg);
      } else if (oas.info.license.name !== licenseSpdx) {
        const msg = `ERROR: ${oasPathRel} "info.license.name" must be ${licenseSpdx}`;
        errors.push(msg);
      }

      if (!hasProperty(oas.info.license, "url")) {
        const msg = `ERROR: ${oasPathRel} "info.license.url" must be set`;
        errors.push(msg);
      } else if (oas.info.license.url !== licenseUrl) {
        const msg = `ERROR: ${oasPathRel} "info.license.url" must be ${licenseUrl}`;
        errors.push(msg);
      }
    }

    const { paths } = oas;

    if (!isStdLibRecord(paths)) {
      errors.push(`ERROR: ${oasPathRel} "paths" must be an object`);
      return;
    }

    Object.entries(paths).forEach(([pathObjKey, pathObjProp]) => {
      if (!isStdLibRecord(pathObjProp)) {
        errors.push(
          `ERROR: ${oasPathRel} "paths"."${pathObjKey}" must be an object`,
        );
        return;
      }
      Object.entries(pathObjProp).forEach(([verbObjKey, verbObjProp]) => {
        if (!isStdLibRecord(verbObjProp)) {
          errors.push(
            `ERROR: ${oasPathRel} "paths"."${pathObjKey}"."${verbObjKey}" must be an object`,
          );
          return;
        }
        const oasExtension = verbObjProp["x-hyperledger-cactus"];
        if (!isStdLibRecord(oasExtension)) {
          const errorMessage = `${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cactus"`;
          errors.push(errorMessage);
          return;
        }
        if (!hasProperty(oasExtension, "http")) {
          const errorMessage = `${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus"."http" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cactus"`;
          errors.push(errorMessage);
          return;
        }
        const { http } = oasExtension;
        if (!hasProperty(http, "verbLowerCase")) {
          const errorMessage = `${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus"."http"."verbLowerCase" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cactus"`;
          errors.push(errorMessage);
          return;
        }
        if (!hasProperty(http, "path")) {
          const errorMessage = `${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus"."http"."path" from the path definition object of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cactus"`;
          errors.push(errorMessage);
          return;
        }
        if (http.path !== pathObjKey) {
          const errorMessage = `${oasPathRel} HTTP paths at "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus"."http"."path" must match "${pathObjKey}" but it is currently set to "${http.path}"`;
          errors.push(errorMessage);
          return;
        }
        if (http.verbLowerCase !== verbObjKey) {
          const errorMessage = `${oasPathRel} HTTP verbs at "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cactus"."http"."verbLowerCase" must match "${verbObjKey}" but it is currently set to "${http.verbLowerCase}"`;
          errors.push(errorMessage);
          return;
        }
      });
    });
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}

export const E_MISSING_OAS_EXTENSION = `missing "x-hyperledger-cactus" from `;

export interface ICheckOpenApiJsonSpecsRequest {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}
