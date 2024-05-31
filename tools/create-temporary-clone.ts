import path from "node:path";
import { RuntimeError } from "run-time-error";
import fs from "fs-extra";
import { simpleGit, SimpleGit, SimpleGitOptions } from "simple-git";
import { TaskOptions } from "simple-git";
import { SimpleGitProgressEvent } from "simple-git";
import fastSafeStringify from "fast-safe-stringify";

const TAG = "tools/create-temporary-clone.ts";

export async function createTemporaryClone(req: {
  readonly osTmpRootPath: string;
  readonly cloneUrl: string;
  readonly checkoutTarget?: string;
  readonly gitCloneOptions?: Record<string, string | number | null>;
}): Promise<{ readonly clonePath: string; readonly gitCommitHash: string }> {
  const fn = `${TAG}:createTemporaryClone()`;
  const tmpDirPrefix = "cacti_tools_create_production_only_archive_";

  if (!req) {
    throw new RuntimeError(`${fn} req was falsy.`);
  }
  if (!req.cloneUrl) {
    throw new RuntimeError(`${fn} req.cloneUrl was falsy.`);
  }
  if (typeof req.cloneUrl !== "string") {
    throw new RuntimeError(`${fn} req.cloneUrl was non-string.`);
  }
  if (req.cloneUrl.length <= 0) {
    throw new RuntimeError(`${fn} req.cloneUrl was blank string.`);
  }
  if (!req.osTmpRootPath) {
    throw new RuntimeError(`${fn} req.osTmpRootPath was falsy.`);
  }
  if (typeof req.osTmpRootPath !== "string") {
    throw new RuntimeError(`${fn} req.osTmpRootPath was non-string.`);
  }
  if (req.osTmpRootPath.length <= 0) {
    throw new RuntimeError(`${fn} req.osTmpRootPath was blank string.`);
  }

  console.log("%s req.osTmpRootPath=%s", fn, req.osTmpRootPath);
  const tmpDirPathBase = path.join(req.osTmpRootPath, tmpDirPrefix);
  console.log("%s tmpDirPathBase=%s", fn, tmpDirPathBase);

  const tmpDirPath = await fs.mkdtemp(tmpDirPathBase);
  console.log("%s tmpDirPath=%s", fn, tmpDirPath);
  console.log("%s Cloning into a temporary directory at %s...", fn, tmpDirPath);

  const options: Partial<SimpleGitOptions> = {
    baseDir: tmpDirPath,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
    progress: (data: SimpleGitProgressEvent) => {
      console.log("%s SimpleGit_Progress=%s", fn, fastSafeStringify(data));
    },
  };

  // when setting all options in a single object
  const git: SimpleGit = simpleGit(options);

  // depth 1 only clones the latest commit, saves us disk space and bandwith.
  const cloneOpts: TaskOptions = {
    "--depth": 1,
    ...req.gitCloneOptions,
  };
  console.log("%s git clone options effective: %o", cloneOpts);
  const cloneResponse = await git.clone(req.cloneUrl, tmpDirPath, cloneOpts);
  console.log("%s Cloned %s OK into %o", fn, req.cloneUrl, cloneResponse);

  await git.fetch("origin", "main");

  if (req.checkoutTarget) {
    await git.fetch("origin", req.checkoutTarget);
    console.log("%s checking out target %s...", TAG, req.checkoutTarget);
    await git.checkout(req.checkoutTarget);
  }

  const gitCommitHash = await git.revparse("HEAD");
  console.log("s Current git commit hash=%s", fn, gitCommitHash);

  return { clonePath: tmpDirPath, gitCommitHash };
}
