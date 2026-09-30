/**
 * One-command deployment verification for the SATP Hermes gateway.
 *
 * Chains the three steps that prove the gateway is deploy-ready, in order,
 * fail-fast, with per-phase timing and a final summary table:
 *
 *   1. build            npm run docker:build:local
 *                       (rebuilds hyperledger/cacti-satp-hermes-gateway:local-dev
 *                        from the current branch)
 *   2. docker-local     npm run test:integration:docker-local
 *                       (full oracle / E2E transfer scenarios against the
 *                        locally built image)
 *   3. docker-upstream  npm run test:integration:docker-upstream
 *                       (acceptance check against the pre-published upstream
 *                        gateway image)
 *
 * Zero runtime dependencies (node child_process only). The underlying npm
 * scripts stay the single source of truth; this file only sequences them.
 *
 * USAGE
 * -----
 *
 *   node docker-verify.mjs [--dry-run] [--skip-build] [--skip-local]
 *                          [--skip-upstream] [-h | --help]
 *
 * Typical invocations (from the package directory):
 *
 *   node docker-verify.mjs                    # full chain
 *   node docker-verify.mjs --dry-run          # print the chain, run nothing
 *   node docker-verify.mjs --skip-build       # image already built; suites only
 *
 * Exit codes: 0 = every executed phase passed, 1 = a phase failed,
 * 2 = usage error (unknown option, or every phase skipped in run mode).
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * The verification pipeline. Order matters: the suites in later phases run
 * against the image produced by the earlier build phase.
 */
const PHASES = [
  {
    skipFlag: "--skip-build",
    name: "build",
    script: "docker:build:local",
  },
  {
    skipFlag: "--skip-local",
    name: "docker-local",
    script: "test:integration:docker-local",
  },
  {
    skipFlag: "--skip-upstream",
    name: "docker-upstream",
    script: "test:integration:docker-upstream",
  },
];

/** npm must be resolved through the PATHEXT shim on Windows. */
function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function phaseCommand(phase) {
  return `npm run ${phase.script}`;
}

function usage() {
  const lines = [
    "Usage: node docker-verify.mjs [options]",
    "",
    "Deployment verification chain for the SATP Hermes gateway",
    "(fail-fast, in order):",
    "",
    ...PHASES.map(
      (phase, index) =>
        `  ${index + 1}. ${phase.name.padEnd(17)}${phaseCommand(phase)}`,
    ),
    "",
    "Options:",
    "  --dry-run        Print the exact command chain and exit, running nothing.",
    "  --skip-build     Skip phase 1 (docker:build:local).",
    "  --skip-local     Skip phase 2 (test:integration:docker-local).",
    "  --skip-upstream  Skip phase 3 (test:integration:docker-upstream).",
    "  -h, --help       Show this help.",
    "",
    "Exit codes: 0 all executed phases passed; 1 a phase failed;",
    "2 usage error (unknown option, or all phases skipped in run mode).",
  ];
  return lines.join("\n");
}

class UsageError extends Error {}

function parseArgs(argv) {
  const options = { dryRun: false, skipFlags: new Set(), help: false };
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (PHASES.some((phase) => phase.skipFlag === arg)) {
      options.skipFlags.add(arg);
    } else {
      throw new UsageError(`unknown option: ${arg}`);
    }
  }
  return options;
}

function phaseNameWidth() {
  return Math.max(...PHASES.map((phase) => phase.name.length));
}

function commandWidth() {
  return Math.max(...PHASES.map((phase) => phaseCommand(phase).length));
}

function printDryRun(options) {
  console.log("=== docker:verify (dry run: no commands will be run) ===");
  let runnableCount = 0;
  PHASES.forEach((phase, chainIndex) => {
    if (options.skipFlags.has(phase.skipFlag)) {
      console.log(
        `  ${chainIndex + 1}. ${phase.name.padEnd(phaseNameWidth() + 1)}` +
          `(skipped via ${phase.skipFlag})`,
      );
    } else {
      runnableCount += 1;
      console.log(
        `  ${chainIndex + 1}. ${phase.name.padEnd(phaseNameWidth() + 1)}` +
          phaseCommand(phase),
      );
    }
  });
  console.log(
    `=== ${runnableCount} phase(s) would run; ` +
      "re-run without --dry-run to execute them ===",
  );
}

/**
 * Runs one phase synchronously with inherited stdio so jest/docker output
 * streams straight through. Returns the child's exit code and the wall time.
 */
function runPhase(phase) {
  const command = phaseCommand(phase);
  console.log(
    `=== docker:verify phase: ${phase.name} ($ npm run ${phase.script}) ===`,
  );
  const startedAt = Date.now();
  const result = spawnSync(npmCommand(), ["run", phase.script], {
    cwd: PACKAGE_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  const durationSeconds = (Date.now() - startedAt) / 1000;
  // `status` is null when the child was killed by a signal (e.g. Ctrl-C):
  // treat that as a failure instead of coercing to 0.
  const exitCode = result.status ?? 1;
  return { command, exitCode, durationSeconds };
}

function formatDuration(seconds) {
  return `${seconds.toFixed(1)}s`;
}

/**
 * Prints the final phase -> duration -> result table. `outcomes` entries use
 * result "PASS", "FAIL", "SKIPPED" or "NOT RUN" (never attempted because an
 * earlier phase failed); null durations for phases that did not execute.
 */
function printSummary(outcomes) {
  const phaseWidth = phaseNameWidth();
  const cmdWidth = commandWidth();
  console.log("=== docker:verify summary ===");
  console.log(
    `${"PHASE".padEnd(phaseWidth)}  ${"COMMAND".padEnd(cmdWidth)}  ` +
      `${"DURATION".padEnd(8)}  RESULT`,
  );
  let passed = 0;
  let executed = 0;
  let totalSeconds = 0;
  for (const outcome of outcomes) {
    const duration =
      outcome.durationSeconds === null
        ? "-".padEnd(8)
        : formatDuration(outcome.durationSeconds).padEnd(8);
    if (outcome.result === "PASS") {
      passed += 1;
      executed += 1;
      totalSeconds += outcome.durationSeconds;
    } else if (outcome.result === "FAIL") {
      executed += 1;
      totalSeconds += outcome.durationSeconds;
    }
    console.log(
      `${outcome.phase.padEnd(phaseWidth)}  ` +
        `${outcome.command.padEnd(cmdWidth)}  ${duration}  ${outcome.result}`,
    );
  }
  console.log(
    `${"TOTAL".padEnd(phaseWidth)}  ${"".padEnd(cmdWidth)}  ` +
      `${formatDuration(totalSeconds).padEnd(8)}  ` +
      `${passed}/${executed} passed`,
  );
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`docker:verify: ${error.message}`);
    console.error(usage());
    process.exit(2);
  }
  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  if (options.dryRun) {
    printDryRun(options);
    process.exit(0);
  }

  const runnable = PHASES.filter(
    (phase) => !options.skipFlags.has(phase.skipFlag),
  );
  if (runnable.length === 0) {
    console.error(
      "docker:verify: every phase skipped — nothing to verify. " +
        "Drop at least one --skip-* flag.",
    );
    process.exit(2);
  }

  const outcomes = PHASES.map((phase) => ({
    phase: phase.name,
    command: phaseCommand(phase),
    durationSeconds: null,
    result: options.skipFlags.has(phase.skipFlag) ? "SKIPPED" : "NOT RUN",
  }));

  let failure = null;
  for (let index = 0; index < PHASES.length; index += 1) {
    const phase = PHASES[index];
    if (options.skipFlags.has(phase.skipFlag)) {
      continue;
    }
    const outcome = runPhase(phase);
    outcomes[index].durationSeconds = outcome.durationSeconds;
    if (outcome.exitCode === 0) {
      outcomes[index].result = "PASS";
      console.log(
        `=== docker:verify: phase "${phase.name}" PASSED ` +
          `(${formatDuration(outcome.durationSeconds)}) ===`,
      );
    } else {
      outcomes[index].result = "FAIL";
      failure = { phase, exitCode: outcome.exitCode };
      console.error(
        `=== docker:verify: phase "${phase.name}" FAILED with exit code ` +
          `${outcome.exitCode} after ${formatDuration(outcome.durationSeconds)} ` +
          "— stopping (fail-fast) ===",
      );
      break;
    }
  }

  printSummary(outcomes);
  if (failure) {
    process.exit(failure.exitCode > 0 ? failure.exitCode : 1);
  }
  console.log(
    `docker:verify: PASS — ${runnable.length} phase(s) verified, gateway is ` +
      "deploy-ready.",
  );
  process.exit(0);
}

main();
