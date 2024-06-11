import { tmpdir } from "os";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { deleteAsync } from "del";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import AdmZip from "adm-zip";

import { createTemporaryClone } from "./create-temporary-clone";

const TAG = "[tools/create-production-only-archive.ts] ";

export interface IFileDeletionV1 {
  readonly temporaryClonePath: string;
  readonly filePath: string;
  readonly fileSizeBytes: number;
  readonly includeGlobs: string[];
  readonly excludeGlobs: string[];
}

export interface ICreateProductionOnlyArchiveV1Request {
  readonly PROJECT_DIR: string;
  readonly includeGlobs: string[];
  readonly excludeGlobs: string[];
  readonly fileSystemCleanUpEnabled: boolean;
}

export interface ICreateProductionOnlyArchiveV1Response {
  readonly bundlePath: string;
  readonly bundleSizeBytes: number;
  readonly zipIsDone: boolean;
}

export const DEFAULT_DELETE_INCLUDE_GLOBS = [
  "**/node_modules/",
  "**/dist/",
  "**/build/",
  "**/out/",
  "**/.nyc_output/",
  "**/.build-cache",
  "**/src/test/**",
  "./examples/**",
  "./weaver/tests/**",
  "./weaver/samples/**",
  "./weaver/docs/**",
  "./weaver/sdks/fabric/interoperation-node-sdk/test/**",
  "./weaver/core/network/corda-interop-app/test-cordapp/**",
  "./weaver/core/identity-management/iin-agent/docker-testnet/**",
  "./weaver/core/identity-management/iin-agent/test/**",
  "./weaver/core/drivers/fabric-driver/docker-testnet-envs/**",
  "./weaver/core/relay/docker/**",
  "./weaver/core/relay/tests/**",
  ".git/**",
  ".devcontainer/**",
  ".github/**",
  ".husky/**",
  ".vscode/**",
  ".yarn/**",
  "./docs/**",
  "./images/**",
  "./tools/**",
  "./typings/**",
  "./whitepaper/**",
  ".yarnrc.yml",
  "./BUILD.md",
  "./CHANGELOG.md",
  "./CODEOWNERS",
  "./CODE_OF_CONDUCT.md",
  "./CONTRIBUTING.md",
  "./FAQ.md",
  "./GOVERNANCE.md",
  "./MAINTAINERS.md",
  "./README-cactus.md",
  "./README.md",
  "./ROADMAP.md",
  "./SECURITY.md",
  "./changelog.config.js",
  "./commitlint.config.js",
  "./.cspell.json",
  "./.dcilintignore",
  "./.dockerignore",
  "./.eslintignore",
  "./.eslintrc.js",
  "./.gitattributes",
  "./.gitguardian.yaml",
  "./.gitignore",
  "./.lintstagedrc.json",
  "./.npmignore",
  "./.nuclei-config.yaml",
  "./.prettierignore",
  "./.prettierrc.js",
  "./.readthedocs.yaml",
  "./.taprc",
  "./webpack.config.js",
  "./webpack.dev.node.js",
  "./webpack.dev.web.js",
  "./webpack.prod.node.js",
  "./webpack.prod.web.js",
  "./karma.conf.js",
  "./jest.config.js",
  "./jest.setup.console.logs.js",
];

export const DEFAULT_DELETE_EXCLUDE_GLOBS: string[] = [];

async function getDeletionList(
  req: ICreateProductionOnlyArchiveV1Request & { readonly cloneDir: string },
): Promise<{ readonly deletions: string[] }> {
  const { cloneDir, includeGlobs, excludeGlobs } = req;

  const globbyOptions: GlobbyOptions = {
    cwd: cloneDir,
    absolute: true,
    ignore: excludeGlobs,
  };
  const pathsToDelete = await globby(includeGlobs, globbyOptions);
  const out = { deletions: pathsToDelete };
  return out;
}

async function createProductionOnlyArchive(
  req: ICreateProductionOnlyArchiveV1Request,
): Promise<ICreateProductionOnlyArchiveV1Response> {
  const fnTag = `${TAG}:createProductionOnlyArchive(ICreateProductionOnlyArchiveV1Request)`;
  if (!req) {
    throw new RuntimeError(`${fnTag} req was falsy.`);
  }
  if (!req.excludeGlobs) {
    throw new RuntimeError(`${fnTag} req.excludeGlobs was falsy.`);
  }
  if (!req.includeGlobs) {
    throw new RuntimeError(`${fnTag} req.includeGlobs was falsy.`);
  }
  if (!req.PROJECT_DIR) {
    throw new RuntimeError(`${fnTag} req.PROJECT_DIR was falsy.`);
  }
  if (
    req.fileSystemCleanUpEnabled !== true &&
    req.fileSystemCleanUpEnabled !== false
  ) {
    throw new RuntimeError(`${fnTag} req.PROJECT_DIR was non-boolean.`);
  }

  const osTmpRootPath = tmpdir();
  const cloneUrl = "https://github.com/hyperledger/cacti.git";
  const tmpCloneRes = await createTemporaryClone({ cloneUrl, osTmpRootPath });
  const { clonePath, gitCommitHash } = tmpCloneRes;

  console.log("%s Clone OK: %s, git hash=%s", fnTag, clonePath, gitCommitHash);

  console.log("%s Deleting globs %o", fnTag, req.includeGlobs);

  const delResponse1 = await deleteAsync(req.includeGlobs, { cwd: clonePath });

  console.log("%s delResponse1=%o", fnTag, delResponse1);

  const deletionList = await getDeletionList({ ...req, cloneDir: clonePath });
  console.log("%s Getting deletion list OK: %o", fnTag, deletionList);

  const dateAndTime = new Date().toJSON().slice(0, 24).replaceAll(":", "-");
  const filename = `hyperledger_cacti_temporary_clone_${dateAndTime}_main_git_hash_${gitCommitHash}.zip`;
  const zipFilePath = path.join(req.PROJECT_DIR, "./.tmp/", filename);
  console.log("%s Creating .zip archive at: %s", fnTag, zipFilePath);

  const zipFile = new AdmZip();
  await zipFile.addLocalFolderPromise(clonePath, {});
  const zipIsDone = await zipFile.writeZipPromise(zipFilePath);
  console.log("%s zipIsDone=%o", fnTag, zipIsDone);

  return {
    zipIsDone,
    bundlePath: zipFilePath,
    bundleSizeBytes: -1,
  };
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  const req = await createRequest(argv, env);
  await createProductionOnlyArchive(req);
};

if (isRunningDirectlyViaCLI) {
  main(process.argv, process.env);
}

async function createRequest(
  argv: string[],
  env: NodeJS.ProcessEnv,
): Promise<ICreateProductionOnlyArchiveV1Request> {
  if (!argv) {
    throw new RuntimeError(`${TAG} Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`${TAG} Process env cannot be falsy.`);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
  console.log(`SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`PROJECT_DIR=${PROJECT_DIR}`);

  const OPT_DESC_INCLUDE_GLOBS =
    "List of include globs to use when locating files and folders for deletion." as const;

  const OPT_DESC_EXCLUDE_GLOBS =
    "List of exclude globs to use when locating files and folders for deletion." as const;

  const OPT_DESC_FILE_SYSTEM_CLEAN_UP_ENABLED =
    "When set to false, it will skip deleting the cloned files. Defaults to true." as const;

  const parsedCfg = await yargs(hideBin(argv))
    .env("CACTI_")
    .option("includeGlobs", {
      alias: "i",
      type: "array",
      string: true,
      default: DEFAULT_DELETE_INCLUDE_GLOBS,
      description: OPT_DESC_INCLUDE_GLOBS,
    })
    .option("excludeGlobs", {
      alias: "e",
      type: "array",
      string: true,
      default: DEFAULT_DELETE_EXCLUDE_GLOBS,
      description: OPT_DESC_EXCLUDE_GLOBS,
    })
    .option("fileSystemCleanUpEnabled", {
      alias: "c",
      boolean: true,
      type: "boolean",
      default: true,
      description: OPT_DESC_FILE_SYSTEM_CLEAN_UP_ENABLED,
    }).argv;

  const req: ICreateProductionOnlyArchiveV1Request = {
    PROJECT_DIR,
    includeGlobs: parsedCfg.includeGlobs,
    excludeGlobs: parsedCfg.excludeGlobs,
    fileSystemCleanUpEnabled: parsedCfg.fileSystemCleanUpEnabled,
  };

  return req;
}
