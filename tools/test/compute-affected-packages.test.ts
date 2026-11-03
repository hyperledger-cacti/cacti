import { jest } from "@jest/globals";
import type * as FS from "fs";
import type * as CP from "child_process";

/*
SPDX-License-Identifier: Apache-2.0
*/

function mockPackages(fs: typeof FS): void {
  fs.readdirSync = jest.fn((dir: string) => {
    if (dir === "packages") return ["pkg-a", "pkg-b"];
    if (dir === "extensions") return ["ext-a"];
    return [];
  }) as unknown as typeof fs.readdirSync;

  fs.existsSync = jest.fn((p: string) =>
    /package\.json$/.test(p),
  ) as unknown as typeof fs.existsSync;

  fs.readFileSync = jest.fn((p: string) => {
    if (p.includes("pkg-a")) {
      return JSON.stringify({
        name: "pkg-a",
        version: "1.0.0",
        dependencies: { "pkg-b": "1.0.0" },
      });
    }
    if (p.includes("pkg-b")) {
      return JSON.stringify({
        name: "pkg-b",
        version: "1.0.0",
      });
    }
    if (p.includes("ext-a")) {
      return JSON.stringify({
        name: "ext-a",
        version: "1.0.0",
        dependencies: { "pkg-b": "1.0.0" },
      });
    }
    throw new Error("Unexpected path " + p);
  }) as unknown as typeof fs.readFileSync;
}

async function runScript({
  changedFiles,
  diff,
  baseRef = "origin/main",
}: {
  changedFiles: string[];
  diff: string;
  baseRef?: string;
}): Promise<{
  affected: string[];
  gitCalls: Array<[string, string[]]>;
}> {
  jest.resetModules();

  // Get the mocked modules
  const fs = require("fs") as jest.Mocked<typeof FS>;
  const cp = require("child_process") as jest.Mocked<typeof CP>;

  mockPackages(fs);

  // The tool must invoke git via the argument-array form of execFileSync
  // (no shell), so the mock matches on the joined argv for convenience.
  const execSpy = jest.spyOn(cp, "execFileSync").mockImplementation(((
    file: string,
    args: string[],
  ) => {
    const cmd = [file, ...args].join(" ");
    if (cmd.startsWith("git fetch")) return "";
    if (cmd.startsWith("git diff --name-only")) return changedFiles.join("\n");
    if (cmd.startsWith("git diff ")) return diff;
    return "";
  }) as any);

  // The script always terminates itself with process.exit(0), which would
  // otherwise kill the jest worker running this suite.
  const exitSpy = jest
    .spyOn(process, "exit")
    .mockImplementation((() => undefined) as never);

  const writes: string[] = [];
  const origWrite = process.stdout.write;
  const originalArgv = [...process.argv];
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  try {
    process.stdout.write = ((data: string | Uint8Array) => {
      writes.push(data.toString());
      return true;
    }) as any;

    process.argv = ["node", "script", baseRef];

    jest.isolateModules(() => {
      require("../compute-affected-packages.cjs");
    });
  } finally {
    process.stdout.write = origWrite;
    process.argv = originalArgv;
    warnSpy.mockRestore();
    exitSpy.mockRestore();
  }

  const affected = JSON.parse(writes[writes.length - 1]);
  return {
    affected,
    gitCalls: execSpy.mock.calls as Array<[string, string[]]>,
  };
}

describe("compute-affected-packages CLI", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });
  test("returns affected packages including dependents for a code change", async () => {
    const changedFiles = ["packages/pkg-b/src/index.js"];
    const diff = `
      diff --git a/packages/pkg-b/src/index.js b/packages/pkg-b/src/index.js
      +const x = 1;
    `;

    const { affected: result } = await runScript({ changedFiles, diff });

    expect(result).toEqual(
      expect.arrayContaining([
        "packages/pkg-b",
        "packages/pkg-a",
        "extensions/ext-a",
      ]),
    );
    expect(new Set(result).size).toBe(result.length); // no duplicates
  });

  test("returns empty array for docs-only changes", async () => {
    const changedFiles = ["packages/pkg-a/README.md", "docs/guide.md"];
    const diff = `
      diff --git a/packages/pkg-a/README.md b/packages/pkg-a/README.md
      +# Title
      +Some documentation text.
      diff --git a/docs/guide.md b/docs/guide.md
      +# Another Title
      +More docs.
    `;

    const { affected: result } = await runScript({ changedFiles, diff });
    expect(result).toEqual([]);
  });

  test("returns all packages when .github changes detected", async () => {
    const changedFiles = [".github/workflows/ci.yml"];
    const diff = `
      diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
      +name: CI
    `;

    const { affected: result } = await runScript({ changedFiles, diff });

    expect(result).toEqual(
      expect.arrayContaining([
        "packages/pkg-a",
        "packages/pkg-b",
        "extensions/ext-a",
      ]),
    );
    expect(result.length).toBe(3);
  });

  test("returns empty array for whitespace/comment only changes", async () => {
    const changedFiles = ["packages/pkg-b/src/index.js"];
    const diff = `
      diff --git a/packages/pkg-b/src/index.js b/packages/pkg-b/src/index.js
      +// comment added
      +
      -// old comment
    `;

    const { affected: result } = await runScript({ changedFiles, diff });
    expect(result).toEqual([]);
  });

  test("passes the base ref to git as a single argument, never via a shell", async () => {
    const changedFiles = ["packages/pkg-b/src/index.js"];
    const diff = `
      diff --git a/packages/pkg-b/src/index.js b/packages/pkg-b/src/index.js
      +const x = 1;
    `;

    const { gitCalls } = await runScript({
      changedFiles,
      diff,
      // Shell metacharacters in the ref must reach git as plain data.
      baseRef: "origin/main; rm -rf /",
    });

    const fetchCall = gitCalls.find(
      ([file, args]) => file === "git" && args[0] === "fetch",
    );
    expect(fetchCall).toBeDefined();
    expect(fetchCall![1]).toEqual(["fetch", "origin", "main; rm -rf /"]);

    for (const [file, args] of gitCalls) {
      expect(file).toBe("git");
      expect(Array.isArray(args)).toBe(true);
    }
  });
});
