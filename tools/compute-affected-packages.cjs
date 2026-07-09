#!/usr/bin/env node
/**
 * Computes affected workspace packages for a PR/commit.
 *
 * Usage:
 *   node tools/compute-affected-packages.cjs <baseRef> <forceAll>
 *
 * Arguments (positional, both optional):
 *   <baseRef>  Git ref to diff HEAD against. Default: "origin/main".
 *              The CI workflow passes e.g. "origin/main" or "origin/dev"
 *              based on `github.base_ref`.
 *   <forceAll> Literal string "true" / "false". When "true", bypasses
 *              diffing entirely and returns every workspace package.
 *              Used by scheduled / workflow_dispatch runs where there is
 *              no PR base to diff against.
 *
 * Algorithm:
 * 1. Scans packages/ examples/ extensions/ for package.json files.
 * 2. Builds a reverse dependency graph (who depends on whom), including
 *    dependencies, devDependencies, peerDependencies and optionalDependencies.
 * 3. Diffs HEAD against the base ref (three-dot, i.e. since merge-base):
 *    - If anything under .github/ changed -> every package is affected.
 *      This is intentional: a CI change can alter how every package is
 *      built/tested, so we re-run the whole matrix to be safe.
 *    - If every changed file is documentation -> no packages affected.
 *    - Else, if the entire diff is comments/whitespace -> no packages.
 * 4. Finds directly changed packages by path-prefix and recursively adds
 *    their dependents.
 * 5. Outputs a JSON array of affected package directories (for the CI matrix).
 */
const os = require("os");

const fs = require("fs");

const path = require("path");

const { execSync } = require("child_process");

const WORKSPACE_DIR = ["packages", "examples", "extensions"]; // change if needed

// --- 1. Collect all workspace package.json files ---
function getAllPackages() {
  const packages = {};
  for (const dir of WORKSPACE_DIR) {
    const dirs = fs.readdirSync(dir);

    for (const name of dirs) {
      const pkgPath = path.join(dir, name, "package.json");
      if (!fs.existsSync(pkgPath)) continue;

      const json = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      packages[json.name] = {
        name: json.name,
        dir: path.join(dir, name),
        pkg: json,
      };
    }
  }

  return packages;
}

// --- 2. Build reverse dependency graph: package -> dependents[] ---
function buildDependentsGraph(packages) {
  const dependents = {};

  for (const pkg of Object.values(packages)) {
    dependents[pkg.name] = new Set();
  }

  // All dependency kinds are considered so that a change to a workspace
  // package re-tests every consumer regardless of how it is depended on.
  const DEP_KINDS = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const pkg of Object.values(packages)) {
    for (const kind of DEP_KINDS) {
      for (const depName of Object.keys(pkg.pkg[kind] || {})) {
        if (packages[depName]) {
          dependents[depName].add(pkg.name);
        }
      }
    }
  }
  return dependents;
}

function detectChangedPackages(packages, baseRef) {
  try {
    // Strip an `origin/` prefix when fetching by remote-ref name.
    execSync(`git fetch origin ${baseRef.replace("origin/", "")}`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Failed to fetch base branch:", baseRef);
    throw err;
  }

  const tmpFile = path.join(os.tmpdir(), `changed-files-${process.pid}.txt`);

  // Three-dot form (`A...B`) is used deliberately: it diffs the merge-base
  // of A and B against B, so we only see changes contributed by HEAD and
  // not unrelated commits that have landed on the base branch since fork.
  execSync(`git diff --name-only ${baseRef}...HEAD > "${tmpFile}"`, {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const changedFiles = fs
    .readFileSync(tmpFile, "utf8")
    .split("\n")
    .filter(Boolean);
  fs.unlinkSync(tmpFile);

  // CI / workflow changes can alter how every package is built or tested
  // (composite actions, jest-runner, codegen steps, etc.). Re-run the whole
  // matrix to be safe. This rule intentionally takes precedence over the
  // docs/comment-only short-circuits below.
  //
  // Not every `.github/` file has package-wide impact though. Weaver-scoped
  // workflows, publish/deploy pipelines, and pure lint/analysis workflows
  // don't touch how `packages/*` are built or tested — those fall through
  // to the normal path-based detection below.
  const AFFECTS_ALL_GITHUB_DIRS = [".github/actions/", ".github/codeql/"];

  const NON_PACKAGES_WORKFLOWS = [
    // Weaver-scoped (any workflow with "weaver" in the filename)
    /^\.github\/workflows\/[^/]*weaver[^/]*\.ya?ml$/,
    // Publish workflows
    /^\.github\/workflows\/.*publish.*\.ya?ml$/,
    // Deploy workflows
    /^\.github\/workflows\/deploy_/,
    // GHCR image builds — internally gate on their own file changes
    /^\.github\/workflows\/ghcr-workflow\.yaml$/,
    // Lint / meta / analysis (no build impact)
    /^\.github\/workflows\/semantic-pull-request\.yaml$/,
    /^\.github\/workflows\/scorecard\.yml$/,
    /^\.github\/workflows\/commitlint-pull-request\.yaml$/,
    /^\.github\/workflows\/code-quality-checks\.yaml$/,
    /^\.github\/workflows\/ai-config-lint\.yaml$/,
    /^\.github\/workflows\/actionlint\.yaml$/,
    /^\.github\/workflows\/codeql-analysis\.yml$/,
    /^\.github\/workflows\/gg-shield-action\.yaml$/,
    /^\.github\/workflows\/coverage_ts\.yaml$/,
  ];

  const affectsPackages = (f) => {
    if (AFFECTS_ALL_GITHUB_DIRS.some((d) => f.startsWith(d))) return true;
    if (f.startsWith(".github/workflows/")) {
      return !NON_PACKAGES_WORKFLOWS.some((re) => re.test(f));
    }
    return false; // other .github/ files (issue templates, CODEOWNERS, dependabot.yml, etc.)
  };

  if (changedFiles.some(affectsPackages)) {
    console.warn(".github/ change affecting packages detected -> all packages affected.");
    return Object.keys(packages);
  }

  // Docs-only detection
  const isDocFile = (f) =>
    f.endsWith(".md") ||
    f.endsWith(".mdx") ||
    f.includes("/docs/") ||
    f.startsWith("docs/") ||
    f.startsWith("documentation/");

  const onlyDocsFiles = changedFiles.every(isDocFile);

  // If all changed files are docs, ignore diff content entirely
  if (onlyDocsFiles) {
    console.warn("Only documentation changes detected.");
    return [];
  }

  // Full diff for comment detection (stream to file to avoid ENOBUFS).
  // Three-dot form matches the file-list diff above.
  const tmpDiffFile = path.join(os.tmpdir(), `full-diff-${process.pid}.txt`);

  execSync(`git diff ${baseRef}...HEAD > "${tmpDiffFile}"`, {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const diff = fs.readFileSync(tmpDiffFile, "utf8");
  fs.unlinkSync(tmpDiffFile);

  /**
   * Regex: identifies added/removed lines that are REAL CODE.
   *
   * A real code line starts with + or - (but not ++ or -- from diff headers)
   * and is NOT one of: blank line, single-line `//` comment, single-line
   * `/* ... *\/` comment, shell/python `#` comment, SQL `--` comment, or HTML
   * `<!-- ... -->` comment. This is a heuristic, not a parser: it will
   * over-count for some pathological inputs (e.g. a TypeScript file that
   * starts a statement with a leading `;` on its own line). The downside of
   * over-counting is only extra test runs, not test skips, so the bias is
   * acceptable.
   **/
  const realCodeChangeRegex =
    /^[-+](?![-+])(?!\s*$|\s*\/\/.*$|\s*\/\*.*\*\/\s*$|\s*#.*$|\s*--.*$|\s*<!--.*?-->\s*$).+/m;

  const normalizedDiff = diff
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n");

  const codeWasModified = realCodeChangeRegex.test(normalizedDiff);

  // If code was not modified at all, return []
  if (!codeWasModified) {
    console.warn("Only comment/whitespace changes detected.");
    return [];
  }
  // Find changed packages
  const changed = new Set();

  for (const file of changedFiles) {
    for (const pkg of Object.values(packages)) {
      if (file.startsWith(pkg.dir)) {
        changed.add(pkg.name);
      }
    }
  }

  return [...changed];
}

// --- 4. Expand to dependent packages recursively ---
function findAllAffected(changed, dependents) {
  const affected = new Set(changed);
  const queue = [...changed];

  while (queue.length) {
    const current = queue.pop();

    for (const dep of dependents[current] || []) {
      if (!affected.has(dep)) {
        affected.add(dep);
        queue.push(dep);
      }
    }
  }

  return [...affected];
}

// --- MAIN ---
const packages = getAllPackages();

// Invoked by CI as:
//   node tools/compute-affected-packages.cjs <baseRef> <forceAll>
// argv[2] = base ref to diff against, argv[3] = "true"/"false".
const baseRef = process.argv[2] || "origin/main";
const forceAll = process.argv[3] === "true";

if (forceAll) {
  console.warn("forceAll=true -> emitting every workspace package.");
  const affectedDirs = Object.values(packages).map((p) => p.dir);
  process.stdout.write(JSON.stringify(affectedDirs));
  process.exit(0);
}

console.warn("Detected packages:", Object.keys(packages));
const dependents = buildDependentsGraph(packages);
console.warn(
  "Built dependents graph.",
  Object.keys(dependents).length,
  "packages.",
);
const changed = detectChangedPackages(packages, baseRef);
console.warn("Changed packages:", changed);
console.warn(Object.keys(dependents).length, "packages changed.");
const affected = findAllAffected(changed, dependents);
console.warn("Affected packages:", affected);
console.warn(affected.length, "packages affected.");

// --- Output dirs instead of package names ---
const affectedDirs = affected.map((pkgName) => packages[pkgName].dir);

// Output JSON for GitHub matrix
console.warn("Affected package dirs:", JSON.stringify(affectedDirs));
process.stdout.write(JSON.stringify(affectedDirs));
process.exit(0);
