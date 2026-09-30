/**
 * Guard tests for the one-command deployment verification pipeline
 * (`docker:verify` -> docker-verify.mjs at the package root).
 *
 * The pipeline chains, fail-fast and in order:
 *   1. build            docker:build:local
 *   2. docker-local     test:integration:docker-local
 *   3. docker-upstream  test:integration:docker-upstream
 *
 * These guards ensure the wiring cannot silently rot: the package.json script
 * must exist and point at a real script file, the script's advertised chain
 * must reference real package.json scripts (which in turn reference the jest
 * configs guarded by docker-config-integrity.test.ts), the --dry-run output
 * must keep listing the exact commands in order, and unknown flags must be
 * rejected. Everything here runs offline — no docker engine is needed or
 * touched; the live phases themselves are only exercised by a human/CI run.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

////////////////////////////////////////////////////////////////////////////////

// __dirname = <repo>/packages/cactus-plugin-satp-hermes/src/test/typescript/unit
const PACKAGE_ROOT = path.resolve(__dirname, "../../../..");

const VERIFY_SCRIPT_NAME = "docker-verify.mjs";
const VERIFY_SCRIPT_PATH = path.join(PACKAGE_ROOT, VERIFY_SCRIPT_NAME);
const VERIFY_NPM_SCRIPT = "docker:verify";

/** The pipeline phases, in the order the script must advertise them. */
const PHASE_COMMANDS = [
  "npm run docker:build:local",
  "npm run test:integration:docker-local",
  "npm run test:integration:docker-upstream",
];

function readPackageJsonScripts(): Record<string, string> {
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
  );
  return pkgJson.scripts ?? {};
}

/** Runs docker-verify.mjs with the given args (offline: never runs a phase). */
function runVerifyScript(args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(process.execPath, [VERIFY_SCRIPT_PATH, ...args], {
    cwd: PACKAGE_ROOT,
    encoding: "utf-8",
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

////////////////////////////////////////////////////////////////////////////////

describe("docker:verify pipeline wiring", () => {
  it("package.json exposes docker:verify pointing at docker-verify.mjs", () => {
    const scripts = readPackageJsonScripts();
    const script = scripts[VERIFY_NPM_SCRIPT];
    expect(`${VERIFY_NPM_SCRIPT} -> ${script ?? "MISSING"}`).toContain(
      VERIFY_SCRIPT_NAME,
    );
    expect(script).toBe(`node ${VERIFY_SCRIPT_NAME}`);
  });

  it("docker-verify.mjs exists at the package root", () => {
    if (!fs.existsSync(VERIFY_SCRIPT_PATH)) {
      throw new Error(
        `${VERIFY_SCRIPT_NAME} is missing at ${VERIFY_SCRIPT_PATH}`,
      );
    }
    expect(fs.statSync(VERIFY_SCRIPT_PATH).isFile()).toBe(true);
  });

  it("every phase command resolves to a real package.json script", () => {
    const scripts = readPackageJsonScripts();
    const dangling: string[] = [];
    for (const command of PHASE_COMMANDS) {
      const scriptName = command.replace(/^npm run /, "");
      if (typeof scripts[scriptName] !== "string") {
        dangling.push(`${VERIFY_SCRIPT_NAME} phase -> ${scriptName}`);
      }
    }
    expect({ danglingPhaseScripts: dangling }).toEqual({
      danglingPhaseScripts: [],
    });
  });
});

describe("docker:verify --dry-run", () => {
  let dryRun: { status: number; stdout: string; stderr: string };

  beforeAll(() => {
    dryRun = runVerifyScript(["--dry-run"]);
  });

  it("exits 0 and never executes a phase", () => {
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain("dry run");
    // A dry run must not leak any live-run phase banners.
    expect(dryRun.stdout).not.toContain("docker:verify phase:");
  });

  it("lists the three phases with their exact underlying commands, in order", () => {
    let cursor = -1;
    for (const command of PHASE_COMMANDS) {
      expect(dryRun.stdout).toContain(command);
      const at = dryRun.stdout.indexOf(command);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("keeps the phases numbered 1..3 in pipeline order", () => {
    const numbered = dryRun.stdout
      .split("\n")
      .filter((line) => /^\s+\d+\.\s/.test(line));
    expect(numbered).toHaveLength(PHASE_COMMANDS.length);
    numbered.forEach((line, index) => {
      expect(line.trim()).toMatch(new RegExp(`^${index + 1}\\. `));
    });
  });

  it("marks phases given via --skip-* flags as skipped but still lists them", () => {
    const skipped = runVerifyScript(["--dry-run", "--skip-build"]);
    expect(skipped.status).toBe(0);
    expect(skipped.stdout).toContain("(skipped via --skip-build)");
    // The skipped phase is still shown (position preserved)...
    expect(skipped.stdout).toContain("build");
    // ...and the remaining two phases would still run.
    expect(skipped.stdout).toContain(PHASE_COMMANDS[1]);
    expect(skipped.stdout).toContain(PHASE_COMMANDS[2]);
  });
});

describe("docker:verify argument validation", () => {
  it("rejects unknown flags with a non-zero exit naming the flag", () => {
    const rejected = runVerifyScript(["--bogus-flag"]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("--bogus-flag");
  });

  it("refuses to run when every phase is skipped (nothing to verify)", () => {
    const allSkipped = runVerifyScript([
      "--skip-build",
      "--skip-local",
      "--skip-upstream",
    ]);
    expect(allSkipped.status).not.toBe(0);
    expect(allSkipped.stderr).toContain("every phase skipped");
  });
});
