import { ExecOptions, exec } from "child_process";
import { promisify } from "util";

import fastSafeStringify from "fast-safe-stringify";
import { RuntimeError } from "run-time-error";
import { hasKey } from "./has-key";

const execAsync = promisify(exec);

export interface INpmListRequestV1 {
  readonly PROJECT_DIR: string;
}

export interface INpmListResponseV1 {
  readonly dependencies: Record<string, INpmListDependencyV1>;
}

export interface INpmListRepositoryV1 {
  readonly type: string;
  readonly url: string;
  readonly directory?: string;
}

export interface INpmListDependencyV1 {
  readonly version: string;
  readonly resolved: string;
  readonly overridden: boolean;
  readonly name: string;
  readonly description: string;
  readonly author: string | { readonly name: string; readonly email: string };
  readonly homepage: string;
  readonly license: string;
  readonly repository: INpmListRepositoryV1 | string;

  readonly _id: string;
  readonly extraneous: boolean;
  readonly path: string;

  readonly dependencies?: Record<string, INpmListDependencyV1>;
}

export async function npmList(
  req: INpmListRequestV1,
): Promise<INpmListResponseV1> {
  const TAG = "[tools/generate-sbom.ts#npmList()]";
  const shellCmd = `npm ls --all --json --long --include-workspace-root --loglevel=silent`;

  const { PROJECT_DIR } = req;

  const execOpts: ExecOptions = {
    cwd: PROJECT_DIR,
    maxBuffer: 256 * 1024 * 1024,
  };

  try {
    const { stderr, stdout } = await execAsync(shellCmd, execOpts);
    if (stderr) {
      console.error(`${TAG} shell CMD: ${shellCmd}`);
      console.error(`${TAG} stderr of the above command: ${stderr}`);
    }
    return JSON.parse(stdout);
  } catch (ex: unknown) {
    // We have to detect if npm is giving a non-zero exit code only because
    // it found some extraneous dependencies (in which case it's output of
    // the list of dependencies is still a valid JSON document that is still
    // 100% valid for our intents and purposes)
    const canHandle =
      ex instanceof Error &&
      hasKey(ex, "code") &&
      hasKey(ex, "signal") &&
      hasKey(ex, "stderr") &&
      hasKey(ex, "stdout") &&
      ex.code === 1 &&
      ex.signal === null &&
      ex.stderr === "" &&
      typeof ex.stdout === "string" &&
      ex.stdout.length > 0;

    if (canHandle) {
      return JSON.parse(ex.stdout as string);
    } else {
      const msg = `${TAG} Failed to execute shell CMD: ${shellCmd}`;
      const throwable = ex instanceof Error ? ex : fastSafeStringify(ex);
      throw new RuntimeError(msg, throwable);
    }
  }
}
