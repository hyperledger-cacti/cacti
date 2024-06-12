import { fileURLToPath } from "node:url";
import path from "node:path";
import debug from "debug";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs-extra";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import prettier from "prettier";
import { OpenAPIV3_1 } from "openapi-types";
import { bundle, loadConfig, NormalizedProblem } from "@redocly/openapi-core";
import { BundleResult } from "@redocly/openapi-core/lib/bundle";

const TAG = "tools:bundle-open-api-tpl-files";
const log = debug(TAG);

export interface IBundleOpenApiTplFilesV1Request {
  readonly argv: string[];
  readonly checkGitDiffDisabled: boolean;
  readonly specTemplateGlobs: Readonly<Array<string>>;
  readonly specTemplateIgnoreGlobs: string[];
  readonly workingDirectory: Readonly<string>;
}

export interface IBundleOpenApiTplFilesV1Response {
  readonly request: Readonly<IBundleOpenApiTplFilesV1Request>;
  readonly specFilePaths: Readonly<Array<string>>;
  readonly bundleProblems: Readonly<Record<string, NormalizedProblem[]>>;
  readonly totalBundleProblemCount: number;
  readonly timestamp: Readonly<string>;
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  const req = await createRequest(argv, env);
  await bundleOpenApiTplFiles(req);
};

if (isRunningDirectlyViaCLI) {
  main(process.argv, process.env).catch((ex: unknown) => {
    console.error("Process crashed with unknown exception:", ex);
    process.exit(1);
  });
}

async function createRequest(
  argv: string[],
  env: NodeJS.ProcessEnv,
): Promise<IBundleOpenApiTplFilesV1Request> {
  if (!argv) {
    throw new RuntimeError(`Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`Process env cannot be falsy.`);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const DEFAULT_WORKING_DIRECTORY = path.join(SCRIPT_DIR, "../");

  const DEFAULT_GLOB = "**/src/main/json/openapi.tpl.json";

  const DEFAULT_IGNORE_GLOB = "**/node_modules";

  const optCheckGitDiffDisabled =
    "This feature is not yet implemented. Check back later!";

  const optDescriptionSpecTemplateGlobs =
    "The GLOB pattern(s) to use when locating the openapi.tpl.json " +
    "files from which to render the bundled final output with " +
    "the filename of openapi.json. Defaults to: [" +
    DEFAULT_GLOB +
    "]";

  const optDescriptionSpecTemplateIgnoreGlobs =
    "The **IGNORE** GLOB pattern(s) to use when locating the " +
    "openapi.tpl.json files from which to render the bundled final output " +
    "with the filename of openapi.json. Defaults to: [" +
    DEFAULT_IGNORE_GLOB +
    "]";

  const parsedCfg = await yargs(hideBin(argv))
    .env("CACTI_")
    .usage("Usage examples:")
    .usage("---------------")
    .usage("1. Run with no debug logs:")
    .usage("   yarn tools:bundle-open-api-tpl-files")
    .usage("")
    .usage("2. Enable debug logging during execution:")
    .usage("   DEBUG=tools:* yarn tools:bundle-open-api-tpl-files")
    .option("working-directory", {
      alias: "d",
      type: "string",
      description:
        "The current working directory to search for openapi.tpl.json files for.",
      default: DEFAULT_WORKING_DIRECTORY,
    })
    .option("check-git-diff-disbled", {
      alias: "c",
      type: "boolean",
      description: optCheckGitDiffDisabled,
      default: true,
    })
    .option("spec-template-globs", {
      alias: "s",
      type: "array",
      string: true,
      description: optDescriptionSpecTemplateGlobs,
      default: [DEFAULT_GLOB],
    })
    .option("spec-template-ignore-globs", {
      alias: "i",
      type: "array",
      string: true,
      description: optDescriptionSpecTemplateIgnoreGlobs,
      default: [DEFAULT_IGNORE_GLOB],
    })
    .version("v0.0.1")
    .parse();

  const req: IBundleOpenApiTplFilesV1Request = {
    argv,
    checkGitDiffDisabled: parsedCfg.checkGitDiffDisbled,
    specTemplateGlobs: parsedCfg.specTemplateGlobs,
    specTemplateIgnoreGlobs: parsedCfg.specTemplateIgnoreGlobs,
    workingDirectory: parsedCfg.workingDirectory,
  };

  return req;
}

async function bundleOpenApiTplFilesOneFile(
  req: Readonly<IBundleOpenApiTplFilesV1Request>,
  templatePathAbsolute: string,
  templatePathRelative: string,
): Promise<BundleResult> {
  const openApiJson: OpenAPIV3_1.Document =
    await fs.readJSON(templatePathAbsolute);
  if (!openApiJson) {
    throw new RuntimeError(`Expected ${templatePathRelative} to be truthy.`);
  }
  if (typeof openApiJson !== "object") {
    throw new RuntimeError(`Expected ${templatePathRelative} to be an object`);
  }

  const templateDirPath = path.dirname(templatePathAbsolute);
  log("%s templateDirPath=%s", TAG, templateDirPath);

  const outputPathAbsolute = path.join(templateDirPath, "openapi.json");
  log("%s outputPathAbsolute=%s", TAG, outputPathAbsolute);

  log("%s Bundling %s ...", TAG, templatePathAbsolute);
  const config = await loadConfig({});
  const bundleResult = await bundle({ ref: templatePathAbsolute, config });

  if (bundleResult.problems) {
    bundleResult.problems.forEach((p) => {
      console.error("%s - %s - WARNING: %o", TAG, templatePathAbsolute, p);
    });
  }
  log("%s Bundled %s OK", TAG, templatePathAbsolute);
  if (!openApiJson.info) {
    openApiJson.info = { title: templatePathRelative, version: "0.0.0" };
  }

  // We have to format the JSON string first in order to make it consistent
  // with the input that the CLI invocations of prettier receive, otherwise
  // the end result of the library call here and the CLI call there can vary.
  const specAsJsonString = JSON.stringify(bundleResult.bundle.parsed, null, 2);

  // Format the updated JSON object
  const prettierCfg = await prettier.resolveConfig(".prettierrc.js");
  if (!prettierCfg) {
    throw new RuntimeError(`Could not locate .prettierrc.js in project dir`);
  }
  const prettierOpts = { ...prettierCfg, parser: "json" };
  const prettyJson = await prettier.format(specAsJsonString, prettierOpts);

  log(`${TAG} writing changes to disk or ${outputPathAbsolute}`);
  await fs.writeFile(outputPathAbsolute, prettyJson);
  return bundleResult;
}

export async function bundleOpenApiTplFiles(
  req: IBundleOpenApiTplFilesV1Request,
): Promise<IBundleOpenApiTplFilesV1Response> {
  if (!req) {
    throw new RuntimeError(`req parameter cannot be falsy.`);
  }
  if (!req.argv) {
    throw new RuntimeError(`req.argv cannot be falsy.`);
  }
  const cwdExists = await fs.pathExists(req.workingDirectory);
  if (!cwdExists) {
    const errorMessage =
      `req.workingDirectory ${req.workingDirectory} does not exist on the ` +
      `file-system. Could also be a permission issue where you just do not ` +
      `have access to that directory.`;
    throw new RuntimeError(errorMessage);
  }

  const globbyOpts: GlobbyOptions = {
    cwd: req.workingDirectory,
    ignore: req.specTemplateIgnoreGlobs,
  };

  const specTemplateGlobs = req.specTemplateGlobs;

  const oasPaths = await globby(specTemplateGlobs, globbyOpts);

  log(`${TAG} Globbing openapi.tpl.json files %o ${specTemplateGlobs}`);
  log(`${TAG} Detected ${oasPaths.length} openapi.tpl.json spec files`);
  log(`${TAG} Git diff check disabled: ${req.checkGitDiffDisabled}`);
  log(`${TAG} File paths found:`, JSON.stringify(oasPaths, null, 4));

  let totalBundleProblemCount = 0;
  const bundleProblems: Record<string, NormalizedProblem[]> = {};
  for (const idx in oasPaths) {
    const aPath = oasPaths[idx];
    const filePathAbs = path.join(req.workingDirectory, aPath);
    const bundleResult = await bundleOpenApiTplFilesOneFile(
      req,
      filePathAbs,
      aPath,
    );
    bundleProblems[aPath] = bundleResult.problems;
    totalBundleProblemCount += bundleResult.problems.length;
  }

  const report: IBundleOpenApiTplFilesV1Response = {
    timestamp: new Date().toISOString(),
    totalBundleProblemCount,
    request: req,
    bundleProblems,
    specFilePaths: oasPaths,
  };

  const reportJson = JSON.stringify(report, null, 4);

  const rootDistDirPath = path.join(req.workingDirectory, "./build/");
  await fs.mkdirp(rootDistDirPath);

  const dateAndTime = new Date().toJSON().slice(0, 24).replaceAll(":", "-");
  const filename = `cacti_bundle_open_api_tpl_files_${dateAndTime}.json`;
  const reportPath = path.join(req.workingDirectory, "./build/", filename);

  log(`${TAG} Saving final report to: ${reportPath}`);
  await fs.writeFile(reportPath, reportJson);

  return report;
}
