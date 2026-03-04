#!/usr/bin/env node
/**
 * Computes affected workspace packages for a PR/commit.
 * 1. Scans packages/ examples/ extensions/ for package.json files.
 * 2. Builds a reverse dependency graph (who depends on whom).
 * 3. Diffs the current HEAD against a base ref (default origin/main) and:
 *    - If .github/ changed -> all packages affected.
 *    - Ignores pure docs or comment/whitespace-only changes.
 * 4. Finds directly changed packages and recursively adds their dependents.
 * 5. Outputs a JSON array of affected package directories (for CI matrix).
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

  for (const pkg of Object.values(packages)) {
    for (const depName of Object.keys(pkg.pkg.dependencies || {})) {
      if (packages[depName]) {
        dependents[depName].add(pkg.name);
      }
    }
    for (const depName of Object.keys(pkg.pkg.devDependencies || {})) {
      if (packages[depName]) {
        dependents[depName].add(pkg.name);
      }
    }
  }
  return dependents;
}

function detectChangedPackages(packages) {
  const baseRef = process.argv[2] || "origin/main";

  try {
    execSync(`git fetch origin ${baseRef.replace("origin/", "")}`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Failed to fetch base branch:", baseRef);
    throw err;
  }

  const tmpFile = path.join(os.tmpdir(), `changed-files-${process.pid}.txt`);

  execSync(`git diff --name-only origin/main...HEAD > "${tmpFile}"`, {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const changedFiles = fs
    .readFileSync(tmpFile, "utf8")
    .split("\n")
    .filter(Boolean);
  fs.unlinkSync(tmpFile);

  if (changedFiles.some((f) => f.startsWith(".github/"))) {
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

  // Full diff for comment detection (stream to file to avoid ENOBUFS)
  const tmpDiffFile = path.join(os.tmpdir(), `full-diff-${process.pid}.txt`);

  execSync(`git diff ${baseRef} HEAD > "${tmpDiffFile}"`, {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const diff = fs.readFileSync(tmpDiffFile, "utf8");
  fs.unlinkSync(tmpDiffFile);

  /**
   * Regex: identifies added/removed lines that are REAL CODE.
   *
   * A real code line starts with + or - (but not ++ or -- from diff headers)
   **/

  const realCodeChangeRegex =
    /^[-+](?![-+])(?!\s*$|\s*\/\/.*$|\s*\/\*.*\*\/\s*$|\s*#.*$|\s*--.*$|\s*;.*$|\s*<!--.*?-->\s*$).+/m;

  const normalizedDiff = diff
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n");

  const codeWasModified = realCodeChangeRegex.test(normalizedDiff);

  // If everything changed is docs, return []
  if (onlyDocsFiles) {
    console.warn("Only documentation changes detected.");
    return [];
  }

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
console.warn("Detected packages:", Object.keys(packages));
const dependents = buildDependentsGraph(packages);
console.warn(
  "Built dependents graph.",
  Object.keys(dependents).length,
  "packages.",
);
const changed = detectChangedPackages(packages);
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
