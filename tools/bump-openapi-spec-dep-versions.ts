import { fileURLToPath } from "url";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs-extra";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import prettier from "prettier";
import { OpenAPIV3_1 } from "openapi-types";

import { getLatestSemVerGitTagV1 } from "./get-latest-sem-ver-git-tag";

const TAG = "[tools/bump-openapi-spec-dep-versions.ts]";
export interface IBumpOpenAPISpecDepVersionsV1Request {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
  readonly targetVersion: string;
}

export interface IBumpOpenAPISpecDepVersionsV1Response {
  readonly specFilePaths: string[];
  readonly specFileReports: ISpecFileReportV1[];
}

export interface ISpecFileReportV1 {
  readonly specFilePath: string;
  readonly replacementCount: number;
  readonly replacements: ISpecRefReplacementV1[];
}

export interface ISpecRefReplacementV1 {
  readonly propertyPath: string;
  readonly oldValue: string;
  readonly newValue: string;
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  const req = await createRequest(argv, env);
  await bumpOpenApiSpecDepVersions(req);
};

if (isRunningDirectlyViaCLI) {
  main(process.argv, process.env);
}

async function createRequest(
  argv: string[],
  env: NodeJS.ProcessEnv,
): Promise<IBumpOpenAPISpecDepVersionsV1Request> {
  if (!argv) {
    throw new RuntimeError(`Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`Process env cannot be falsy.`);
  }

  const { latestSemVerTag } = await getLatestSemVerGitTagV1({
    // We have to exclude "v2.0.0-alpha-prerelease" because it was not named
    // according to the specs and is considered newer by the parser than
    // alpha.1 but we actually issued alpha.1 later
    excludedTags: ["v2.0.0-alpha-prerelease"],
    omitFetch: false,
  });

  const optDescTargetVersion =
    "The version to bump to, such as 1.0.0 or 2.0.0-alpha.1, etc. Defaults " +
    "to the current latest version tag found in git where a version tag is " +
    "defined as anything **starting with** the character v and then " +
    "containing 3 numbers that are separated by dots";

  const parsedCfg = await yargs(hideBin(argv))
    .env("CACTI_")
    .option("target-version", {
      alias: "v",
      type: "string",
      description: optDescTargetVersion,
      defaultDescription: "Defaults to the latest release git tag (vX.Y.Z.*",
      default: latestSemVerTag,
    }).argv;

  // These explicit casts are safe because we provided the coercion functions
  // for both parameters.
  const targetVersion = (await parsedCfg.targetVersion) as string;

  const req: IBumpOpenAPISpecDepVersionsV1Request = {
    argv,
    env,
    targetVersion,
  };

  return req;
}

async function bumpOpenApiSpecDepVersionsOneFile(
  filePathAbs: string,
  filePathRel: string,
  newVersion: string,
): Promise<ISpecRefReplacementV1[]> {
  const openApiJson: OpenAPIV3_1.Document = await fs.readJSON(filePathAbs);
  if (!openApiJson) {
    throw new RuntimeError(`Expected ${filePathRel} to be truthy.`);
  }
  if (typeof openApiJson !== "object") {
    throw new RuntimeError(`Expected ${filePathRel} to be an object`);
  }
  if (!openApiJson.info) {
    openApiJson.info = { title: filePathRel, version: "0.0.0" };
  }

  const replacements = [];

  if (openApiJson.info.version !== newVersion) {
    const oldVersion = openApiJson.info.version;
    openApiJson.info.version = newVersion;

    console.log(`${TAG} Bumped to ${newVersion} in ${filePathRel}`);

    replacements.push({
      newValue: newVersion,
      oldValue: oldVersion,
      propertyPath: ".info.version",
    });
  }

  // We have to format the JSON string first in order to make it consistent
  // with the input that the CLI invocations of prettier receive, otherwise
  // the end result of the library call here and the CLI call there can vary.
  const specAsJsonString = JSON.stringify(openApiJson, null, 2);

  // Format the updated JSON object
  const prettierCfg = await prettier.resolveConfig(".prettierrc.js");
  if (!prettierCfg) {
    throw new RuntimeError(`Could not locate .prettierrc.js in project dir`);
  }
  const prettierOpts = { ...prettierCfg, parser: "json" };
  const prettyJson = await prettier.format(specAsJsonString, prettierOpts);

  if (replacements.length > 0) {
    console.log(`${TAG} writing changes to disk or ${filePathRel}`);
    await fs.writeFile(filePathAbs, prettyJson);
  }
  return replacements;
}

export async function bumpOpenApiSpecDepVersions(
  req: IBumpOpenAPISpecDepVersionsV1Request,
): Promise<IBumpOpenAPISpecDepVersionsV1Response> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
  console.log(`${TAG} SCRIPT_DIR: ${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR: ${PROJECT_DIR}`);

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

  const DEFAULT_GLOB = "**/src/main/json/openapi.tpl.json";

  const oasPaths = await globby(DEFAULT_GLOB, globbyOpts);

  console.log(`${TAG} Looking up openapi.json spec files: ${DEFAULT_GLOB}`);
  console.log(`${TAG} Detected ${oasPaths.length} openapi.json spec files`);
  console.log(`${TAG} Expected Target Version: ${req.targetVersion}`);
  console.log(`${TAG} File paths found:`, JSON.stringify(oasPaths, null, 4));

  let replacementCountTotal = 0;
  const specFileReportPromises = oasPaths.map(async (pathRel) => {
    const filePathAbs = path.join(PROJECT_DIR, pathRel);

    const replacements = await bumpOpenApiSpecDepVersionsOneFile(
      filePathAbs,
      pathRel,
      req.targetVersion,
    );

    const specFileReport: ISpecFileReportV1 = {
      replacementCount: replacements.length,
      replacements,
      specFilePath: pathRel,
    };

    replacementCountTotal += specFileReport.replacementCount;

    return specFileReport;
  });

  const specFileReports = await Promise.all(specFileReportPromises);
  const report = {
    replacementCountTotal,
    specFilePaths: oasPaths,
    specFileReports,
  };

  const reportJson = JSON.stringify(report, null, 4);

  const rootDistDirPath = path.join(PROJECT_DIR, "./build/");
  await fs.mkdirp(rootDistDirPath);

  const dateAndTime = new Date().toJSON().slice(0, 24).replaceAll(":", "-");
  const filename = `cacti_bump-openapi-spec-dep-versions_${dateAndTime}.json`;
  const specFileReportPathAbs = path.join(PROJECT_DIR, "./build/", filename);

  console.log(`${TAG} Total number of replacements: ${replacementCountTotal}`);
  console.log(`${TAG} Saving final report to: ${specFileReportPathAbs}`);
  await fs.writeFile(specFileReportPathAbs, reportJson);

  return report;
}
