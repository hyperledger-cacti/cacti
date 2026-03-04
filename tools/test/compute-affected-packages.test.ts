import { jest } from "@jest/globals";
import type * as FS from "fs";
import type * as CP from "child_process";

/*
SPDX-License-Identifier: Apache-2.0
*/

function mockPackages(fs: typeof FS): void {
  fs.readdirSync = jest.fn((dir: string) => {
    if (dir === "packages") return ["pkg-a", "pkg-b"];
    if (dir === "examples") return ["example-a"];
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
    if (p.includes("example-a")) {
      return JSON.stringify({
        name: "example-a",
        version: "1.0.0",
        devDependencies: { "pkg-a": "1.0.0" },
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
}: {
  changedFiles: string[];
  diff: string;
}): Promise<string[]> {
  jest.resetModules();

  // Get the mocked modules
  const fs = require("fs") as jest.Mocked<typeof FS>;
  const cp = require("child_process") as jest.Mocked<typeof CP>;

  jest.spyOn(cp, "execSync").mockImplementation(() => {
    return Buffer.from("mocked output");
  });

  mockPackages(fs);

  (
    cp.execSync as jest.MockedFunction<(command: string) => string>
  ).mockImplementation((cmd: string) => {
    if (cmd.startsWith("git fetch")) return "";
    if (cmd.startsWith("git diff --name-only")) return changedFiles.join("\n");
    if (cmd.startsWith("git diff ")) return diff;
    return "";
  });

  const writes: string[] = [];
  const origWrite = process.stdout.write;
  const originalArgv = [...process.argv];
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  try {
    process.stdout.write = ((data: string | Uint8Array) => {
      writes.push(data.toString());
      return true;
    }) as any;

    process.argv = ["node", "script", "origin/main"];

    jest.isolateModules(() => {
      require("../compute-affected-packages.cjs");
    });
  } finally {
    process.stdout.write = origWrite;
    process.argv = originalArgv;
    warnSpy.mockRestore();
  }

  return JSON.parse(writes[writes.length - 1]);
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

    const result = await runScript({ changedFiles, diff });

    expect(result).toEqual(
      expect.arrayContaining([
        "packages/pkg-b",
        "packages/pkg-a",
        "examples/example-a",
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

    const result = await runScript({ changedFiles, diff });
    expect(result).toEqual([]);
  });

  test("returns all packages when .github changes detected", async () => {
    const changedFiles = [".github/workflows/ci.yml"];
    const diff = `
      diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
      +name: CI
    `;

    const result = await runScript({ changedFiles, diff });

    expect(result).toEqual(
      expect.arrayContaining([
        "packages/pkg-a",
        "packages/pkg-b",
        "examples/example-a",
        "extensions/ext-a",
      ]),
    );
    expect(result.length).toBe(4);
  });

  test("returns empty array for whitespace/comment only changes", async () => {
    const changedFiles = ["packages/pkg-b/src/index.js"];
    const diff = `
      diff --git a/packages/pkg-b/src/index.js b/packages/pkg-b/src/index.js
      +// comment added
      +
      -// old comment
    `;

    const result = await runScript({ changedFiles, diff });
    expect(result).toEqual([]);
  });
});
