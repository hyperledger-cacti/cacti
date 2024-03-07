import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import { promisify } from "util";
import { exec, ExecOptions } from "child_process";
import fs from "fs-extra";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import fastSafeStringify from "fast-safe-stringify";
import { INpmListDependencyV1, npmList } from "./npm-list";

const execAsync = promisify(exec);

async function getManifestFiles(req: {
  PROJECT_DIR: string;
}): Promise<{ readonly manifestFilePaths: string[] }> {
  const { PROJECT_DIR } = req;

  const MANIFEST_INCLUDE_GLOBS = [
    // FIXME make this compatible with the other (currently commented out)
    // manifest files for a complete picture of the dependencies involved.
    //
    "**/go.mod",
    "**/Cargo.toml",
    "**/build.gradle*",
    "yarn.lock",
    "**/package.json",
  ];

  const MANIFEST_EXCLUDE_GLOBS = ["**/node_modules/**"];

  const globbyOptions: GlobbyOptions = {
    cwd: PROJECT_DIR,
    absolute: true,
    ignore: MANIFEST_EXCLUDE_GLOBS,
  };
  const manifestFilePaths = await globby(MANIFEST_INCLUDE_GLOBS, globbyOptions);
  return { manifestFilePaths };
}

/**
 * # Software Bill of Materials Generator Script
 *
 * How does it work:
 * 1. It uses a list of glob patterns to find manifest files defining dependencies.
 * For example build.gradle, yarn.lock, etc. (For now only npm package.json files
 * are supported unfortunately)
 * 2. Once a complete list of these files have been gathered, it iterates through
 * their respective directories and runs the SBoM generator tool.
 * 3. The results of each execution are appended to a .csv file where there is
 * a field called "related to" which will contain the manifest file's relative
 * path within the project directory.
 */
const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  if (!argv) {
    throw new RuntimeError(`Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`Process env cannot be falsy.`);
  }

  const TAG = "[tools/generate-sbom.ts] ";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
  console.log(`SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`PROJECT_DIR=${PROJECT_DIR}`);

  const getManifestFilesRes = await getManifestFiles({ PROJECT_DIR });
  const globbedManifestFileCount = getManifestFilesRes.manifestFilePaths.length;
  console.log(`Found ${globbedManifestFileCount} package.json files via glob.`);

  const { dependencies } = await npmList({ PROJECT_DIR });
  const manifestFilePaths: Set<string> = new Set();
  Object.entries(dependencies).forEach(([, v]) => {
    traverseDeps(v, manifestFilePaths);
  });

  const sbomCacheDir = path.join(PROJECT_DIR, ".cacti-tools", "cache", "sbom");
  await fs.mkdirp(sbomCacheDir);
  console.log("Created SBoM cache dir at: ", sbomCacheDir);

  const sbomDir = path.join(PROJECT_DIR, "dist", "sbom");
  await fs.mkdirp(sbomDir);
  console.log("Created SBoM dir at: ", sbomDir);

  const dateAndTime = new Date().toJSON().slice(0, 24).replaceAll(":", "-");
  const filename = `cacti_sbom_nodejs_${dateAndTime}.csv`;
  const specFileReportPathAbs = path.join(sbomDir, filename);
  console.log("Streaming data to SBoM csv file at: ", specFileReportPathAbs);

  const manifestCount = manifestFilePaths.size;
  let runtimeMsSum = 0;
  let idx = 0;
  let csvHeadersEnabled = true;
  for (const manifestFilePath of manifestFilePaths) {
    idx++;
    const start = new Date();
    const pkgDirPath = path.dirname(manifestFilePath);
    const dirPath = path.relative(PROJECT_DIR, pkgDirPath);
    const manifestRelPath = path.relative(PROJECT_DIR, manifestFilePath);
    const req = {
      dirPath,
      TAG,
      csvHeadersEnabled,
      manifestFilePath,
      PROJECT_DIR,
    };
    try {
      const res = await generateSBoM(req);
      csvHeadersEnabled = false;
      const csvContent = res.stdout; // avoid empty lines in .csv file
      await fs.appendFile(specFileReportPathAbs, csvContent);
      const end = new Date();
      const runtimeMs = end.getTime() - start.getTime();
      runtimeMsSum += runtimeMs;

      const { logMessage } = createDiagnosticsMessage({
        idx,
        manifestCount,
        manifestRelPath,
        runtimeMsSum,
        runtimeMs,
      });
      console.log(logMessage);
    } catch (ex: unknown) {
      // If it was a syntax error in the package.json file
      // then we just log it as a warning and move on.
      if (ex instanceof ManifestParseError) {
        console.warn(ex);
      } else {
        const msg = `Failed to generate SBoM for ${req.manifestFilePath}`;
        const throwable = ex instanceof Error ? ex : fastSafeStringify(ex);
        throw new RuntimeError(msg, throwable);
      }
    }
  }
};

function traverseDeps(root: INpmListDependencyV1, paths: Set<string>): void {
  if (root.path) {
    paths.add(root.path.concat("/package.json"));
  } else {
    console.warn(`MISSING PATH => ${JSON.stringify(root).substring(0, 4000)}`);
  }
  if (!root.dependencies) {
    return;
  }
  Object.entries(root.dependencies).forEach(([, v]) => {
    traverseDeps(v, paths);
  });
}

function createDiagnosticsMessage(req: {
  readonly idx: number;
  readonly runtimeMs: number;
  readonly runtimeMsSum: number;
  readonly manifestCount: number;
  readonly manifestRelPath: string;
}): { logMessage: string } {
  const { idx, manifestCount, runtimeMsSum, runtimeMs, manifestRelPath } = req;
  const percentage = ((idx / manifestCount) * 100).toFixed(2);
  const progressInfo = `${percentage}%\t${idx}/\t\t${manifestCount}`;
  const avgRuntimeMs = runtimeMsSum / idx;
  const estRuntimeMin = Math.ceil((avgRuntimeMs * manifestCount) / 60000);
  const logMessage = `${progressInfo}\t\testRuntimeMin=${estRuntimeMin}\t${manifestRelPath}\t\t\t\t\truntimeMs=${runtimeMs}ms`;
  return { logMessage };
}

export async function lernaPkgList(req: {
  readonly PROJECT_DIR: string;
}): Promise<{ readonly pkgNames: string[] }> {
  const TAG = "[tools/generate-sbom.ts/lernaPkgList()]";
  const shellCmd = `./node_modules/.bin/lerna ls --json --all --no-progress --loglevel=silent`;
  const execOpts: ExecOptions = {
    cwd: req.PROJECT_DIR,
    maxBuffer: 32 * 1024 * 1024, // 32 MB of stdout will be allowed
  };

  try {
    const { stderr, stdout } = await execAsync(shellCmd, execOpts);
    if (stderr) {
      console.error(`${TAG} shell CMD: ${shellCmd}`);
      console.error(`${TAG} stderr of the above command: ${stderr}`);
    }
    const pkgs = JSON.parse(stdout);
    const pkgNames = pkgs.map((x: { name: string }) => x.name);
    return { pkgNames };
  } catch (ex: unknown) {
    const msg = `${TAG} Failed to execute shell CMD: ${shellCmd}`;
    const throwable = ex instanceof Error ? ex : fastSafeStringify(ex);
    throw new RuntimeError(msg, throwable);
  }
}

export async function generateSBoM(req: {
  readonly TAG: string;
  readonly csvHeadersEnabled: boolean;
  readonly manifestFilePath: string;
  readonly dirPath: string;
  readonly PROJECT_DIR: string;
}): Promise<{
  readonly manifestFilePath: string;
  readonly stderr: string;
  readonly stdout: string;
}> {
  const { csvHeadersEnabled, TAG, PROJECT_DIR, manifestFilePath } = req;

  const manifestRelPath = path.relative(PROJECT_DIR, manifestFilePath);
  const executable = `./node_modules/.bin/license-report`;

  const { pkgNames } = await lernaPkgList({ PROJECT_DIR });

  const csvFields = [
    "department",
    "relatedTo",
    "name",
    "licenseType",
    "link",
    "remoteVersion",
    "installedVersion",
    "definedVersion",
    "author",
  ];

  const cmdArgs = [
    "--output=csv",
    `--fields=${csvFields.join(" --fields=")} `,
    "--exclude=" + pkgNames.join(" --exclude="),
    csvHeadersEnabled ? " --csvHeaders " : "",
    `--relatedTo.value=${manifestRelPath}`,
    `--department.value='Hyperledger Cacti'`,
    `--package=${manifestFilePath}`,
  ].join(" ");

  const shellCmd = `${executable} ${cmdArgs}`;

  const execOpts: ExecOptions = {
    cwd: req.PROJECT_DIR,
    maxBuffer: 2 * 1024 * 1024, // 2 MB of stdout will be allowed
  };

  try {
    const { stderr, stdout } = await execAsync(shellCmd, execOpts);
    if (stderr) {
      console.error(`${TAG} shell CMD: ${shellCmd}`);
      console.error(`${TAG} stderr of the above command: ${stderr}`);
    }
    return { manifestFilePath, stderr, stdout };
  } catch (ex: unknown) {
    const msg = `${TAG} Failed to execute shell CMD: ${shellCmd}`;
    if (ex instanceof Error && ex.message.includes("SyntaxError: ")) {
      throw new ManifestParseError(msg, ex);
    } else {
      const throwable = ex instanceof Error ? ex : fastSafeStringify(ex);
      throw new RuntimeError(msg, throwable);
    }
  }
}

export class ManifestParseError extends RuntimeError {}

main(process.argv, process.env);
