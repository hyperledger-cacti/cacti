import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { hasProperty } from "./has-property";
import { isStdLibRecord } from "./is-std-lib-record";
import { isOpenApiV3SupportedHttpVerb } from "./open-api-http-verbs";

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
  console.log(`${TAG} openapi.json paths: (${oasPaths.length}): `);
  // const oasPaths = oasPathsEntries.map((it) => it.path);

  const defaultOpenApiSpecVersion = "3.0.3";
  const oasVersion = !!req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_SPEC_VERSION
    ? req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_SPEC_VERSION
    : defaultOpenApiSpecVersion;

  console.log(
    "%s defaultOpenApiSpecVersion=%s",
    TAG,
    defaultOpenApiSpecVersion,
  );
  console.log(
    "%s req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_SPEC_VERSION=%s",
    TAG,
    req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_SPEC_VERSION,
  );
  console.log("%s Concluded with oasVersion=%s", TAG, oasVersion);

  // Quick and dirty sem-ver parsing because we don't need to care about
  // anything after the minor number)
  const [major, minor] = oasVersion.split(".").map((x) => parseInt(x, 10));

  // License identifier field was added in 3.1.0 so we only need it if the
  // spec version is equal or newer than that.
  const needsLicenseId = major >= 3 && minor >= 1;
  console.log("%s Concluded with needsLicenseId=%s", TAG, needsLicenseId);

  const DEFAULT_LICENSE_SPDX = "Apache-2.0";
  const licenseSpdx = !!req.env
    .CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_SPDX
    ? req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_SPDX
    : DEFAULT_LICENSE_SPDX;

  console.log("%s DEFAULT_LICENSE_SPDX=%s", TAG, DEFAULT_LICENSE_SPDX);
  console.log(
    "%s  req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_SPDX=%s",
    TAG,
    req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_SPDX,
  );
  console.log("%s Concluded with licenseSpdx=%s", TAG, licenseSpdx);

  const DEFAULT_LICENSE_URL =
    "https://www.apache.org/licenses/LICENSE-2.0.html";
  const licenseUrl = !!req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_URL
    ? req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_URL
    : DEFAULT_LICENSE_URL;

  console.log("%s DEFAULT_LICENSE_URL=%s", TAG, DEFAULT_LICENSE_URL);
  console.log(
    "%s  req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_URL=%s",
    TAG,
    req.env.CACTI_CUSTOM_CHECKS_REQUIRED_OPENAPI_LICENSE_URL,
  );
  console.log("%s Concluded with licenseUrl=%s", TAG, licenseUrl);

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
      if (!hasProperty(oas.info.license, "identifier") && needsLicenseId) {
        const msg = `ERROR: ${oasPathRel} "info.license.identifier" must be set`;
        errors.push(msg);
      } else if (
        hasProperty(oas.info.license, "identifier") &&
        oas.info.license.identifier !== licenseSpdx &&
        needsLicenseId
      ) {
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

    Object.entries(paths)
      // We filter down to OpenAPI supported HTTP verbs only so that we don't
      // hit additional properties for validation by accident (such as "summary")
      .filter(([pathObjKey]) => isOpenApiV3SupportedHttpVerb(pathObjKey))
      .forEach(([pathObjKey, pathObjProp]) => {
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
          const oasExtension = verbObjProp["x-hyperledger-cacti"];
          if (!isStdLibRecord(oasExtension)) {
            const errorMessage = `ERROR: ${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cacti"`;
            errors.push(errorMessage);
            return;
          }
          if (!hasProperty(oasExtension, "http")) {
            const errorMessage = `ERROR: ${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti"."http" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cacti"`;
            errors.push(errorMessage);
            return;
          }
          const { http } = oasExtension;
          if (!hasProperty(http, "verbLowerCase")) {
            const errorMessage = `ERROR: ${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti"."http"."verbLowerCase" from the path definition of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cacti"`;
            errors.push(errorMessage);
            return;
          }
          if (!hasProperty(http, "path")) {
            const errorMessage = `ERROR: ${oasPathRel} is missing "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti"."http"."path" from the path definition object of ${pathObjKey}. Please add it. If you do not know how to, search for existing examples in other openapi.json files within the project for the string "x-hyperledger-cacti"`;
            errors.push(errorMessage);
            return;
          }
          if (http.path !== pathObjKey) {
            const errorMessage = `ERROR: ${oasPathRel} HTTP paths at "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti"."http"."path" must match "${pathObjKey}" but it is currently set to "${http.path}"`;
            errors.push(errorMessage);
            return;
          }
          if (http.verbLowerCase !== verbObjKey) {
            const errorMessage = `ERROR: ${oasPathRel} HTTP verbs at "paths"."${pathObjKey}"."${verbObjKey}"."x-hyperledger-cacti"."http"."verbLowerCase" must match "${verbObjKey}" but it is currently set to "${http.verbLowerCase}"`;
            errors.push(errorMessage);
            return;
          }
        });
      });
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}

export const E_MISSING_OAS_EXTENSION = `missing "x-hyperledger-cacti" from `;

export interface ICheckOpenApiJsonSpecsRequest {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}
