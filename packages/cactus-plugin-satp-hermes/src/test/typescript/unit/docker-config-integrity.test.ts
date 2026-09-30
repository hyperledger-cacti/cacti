/**
 * Split-config no-op guard tests.
 *
 * The package's docker integration tests were split (2026-09-17) into two
 * suites with their own jest configs:
 *   - jest.config-integration-docker-local.ts    (docker-local/ tests)
 *   - jest.config-integration-docker-upstream.ts (docker-upstream/ tests)
 * and the legacy single jest.config-integration-docker.ts was deleted.
 *
 * These guards prevent the silent no-op failure mode where a config exists
 * but its testMatch globs resolve to nothing (e.g. the test directory gets
 * renamed), or package.json scripts reference config files that no longer
 * exist, or stale references to the deleted legacy config survive in
 * package.json / README / BUILD.md.
 *
 * These tests are part of the standard unit suite, so CI runs them on every PR.
 */

import fs from "fs";
import path from "path";

////////////////////////////////////////////////////////////////////////////////

// __dirname = <repo>/packages/cactus-plugin-satp-hermes/src/test/typescript/unit
const PACKAGE_ROOT = path.resolve(__dirname, "../../../..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");

const DOCKER_LOCAL_CONFIG = "jest.config-integration-docker-local.ts";
const DOCKER_UPSTREAM_CONFIG = "jest.config-integration-docker-upstream.ts";
const LEGACY_DOCKER_CONFIG = "jest.config-integration-docker.ts";

const LOCAL_CONFIG_PATH = path.join(PACKAGE_ROOT, DOCKER_LOCAL_CONFIG);
const UPSTREAM_CONFIG_PATH = path.join(PACKAGE_ROOT, DOCKER_UPSTREAM_CONFIG);
const LEGACY_CONFIG_PATH = path.join(PACKAGE_ROOT, LEGACY_DOCKER_CONFIG);

/** Directories skipped when walking the package for testMatch resolution. */
const WALK_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "cache",
  "reports",
  "build",
  ".git",
]);

////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts the string patterns of the `testMatch: [...]` array from a jest
 * config's source text. Fails the test (via the caller's assertion on the
 * returned length) if the config shape changed and testMatch cannot be
 * found — a silent pass here would be worthless.
 */
function extractTestMatchPatterns(configPath: string): string[] {
  const raw = fs.readFileSync(configPath, "utf-8");
  const arrayMatch = raw.match(/testMatch:\s*\[([^\]]*)\]/);
  if (!arrayMatch) {
    return [];
  }
  const patterns: string[] = [];
  for (const m of arrayMatch[1].matchAll(/["']([^"']+)["']/g)) {
    patterns.push(m[1]);
  }
  return patterns;
}

/**
 * Narrow glob-to-regex translator supporting the shape used by these jest
 * configs (a leading recursive glob, a literal directory path and a
 * "*.test.ts" leaf): the recursive glob matches anything, a single star
 * matches within one path segment. Trade-off: the recursive glob translates
 * to ".*" (may cross "/"), which can only over-match — acceptable for a
 * >=1-file existence guard, and the literal directory names in the patterns
 * remain exact so renamed/moved test dirs are still detected.
 */
function testMatchGlobToRegExp(glob: string): RegExp {
  const DOUBLE_STAR_SLASH = "\u0000";
  const DOUBLE_STAR = "\u0001";
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // "**/" must also match ZERO directories (jest semantics), hence the
    // optional group rather than a bare ".*".
    .replace(/\*\*\//g, DOUBLE_STAR_SLASH)
    .replace(/\*\*/g, DOUBLE_STAR);
  const regexSrc = escaped
    .replace(new RegExp(DOUBLE_STAR_SLASH, "g"), "(?:.*/)?")
    .replace(new RegExp(DOUBLE_STAR, "g"), ".*")
    .replace(/\*/g, "[^/]*");
  return new RegExp(`^${regexSrc}$`);
}

/** Lists files under `root` (relative paths), skipping build/vendor dirs. */
function listFilesRecursive(
  root: string,
  acc: string[] = [],
  relativeTo: string = root,
): string[] {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (WALK_SKIP_DIRS.has(entry.name)) {
        continue;
      }
      listFilesRecursive(path.join(root, entry.name), acc, relativeTo);
    } else if (entry.isFile()) {
      acc.push(path.relative(relativeTo, path.join(root, entry.name)));
    }
  }
  return acc;
}

/**
 * Resolves a config's testMatch patterns against the files that actually
 * exist in the package. Returns the matching file list (may be empty — the
 * caller asserts).
 */
function resolveTestMatch(configPath: string): string[] {
  const patterns = extractTestMatchPatterns(configPath);
  expect(patterns.length).toBeGreaterThanOrEqual(1);
  const regexes = patterns.map(testMatchGlobToRegExp);
  const files = listFilesRecursive(PACKAGE_ROOT);
  const matched = files.filter((file) =>
    regexes.some((regex) => regex.test(file)),
  );
  return matched.filter((file) => fs.existsSync(path.join(PACKAGE_ROOT, file)));
}

////////////////////////////////////////////////////////////////////////////////

describe("split docker jest configs are not silent no-ops", () => {
  it("both split configs exist on disk", () => {
    if (!fs.existsSync(LOCAL_CONFIG_PATH)) {
      throw new Error(
        `${DOCKER_LOCAL_CONFIG} is missing at ${LOCAL_CONFIG_PATH}`,
      );
    }
    if (!fs.existsSync(UPSTREAM_CONFIG_PATH)) {
      throw new Error(
        `${DOCKER_UPSTREAM_CONFIG} is missing at ${UPSTREAM_CONFIG_PATH}`,
      );
    }
  });

  it("docker-local config testMatch resolves to at least one existing test file", () => {
    const patterns = extractTestMatchPatterns(LOCAL_CONFIG_PATH);
    if (patterns.length < 1) {
      throw new Error(
        `no testMatch patterns found in ${DOCKER_LOCAL_CONFIG} — config shape changed`,
      );
    }
    const matched = resolveTestMatch(LOCAL_CONFIG_PATH);
    if (matched.length < 1) {
      throw new Error(
        `testMatch ${JSON.stringify(patterns)} of ${DOCKER_LOCAL_CONFIG} resolved to 0 existing files`,
      );
    }
    for (const file of matched) {
      expect(fs.existsSync(path.join(PACKAGE_ROOT, file))).toBe(true);
    }
  });

  it("docker-upstream config testMatch resolves to at least one existing test file", () => {
    const patterns = extractTestMatchPatterns(UPSTREAM_CONFIG_PATH);
    if (patterns.length < 1) {
      throw new Error(
        `no testMatch patterns found in ${DOCKER_UPSTREAM_CONFIG} — config shape changed`,
      );
    }
    const matched = resolveTestMatch(UPSTREAM_CONFIG_PATH);
    if (matched.length < 1) {
      throw new Error(
        `testMatch ${JSON.stringify(patterns)} of ${DOCKER_UPSTREAM_CONFIG} resolved to 0 existing files`,
      );
    }
    for (const file of matched) {
      expect(fs.existsSync(path.join(PACKAGE_ROOT, file))).toBe(true);
    }
  });

  it("package.json test:integration:docker-* scripts reference exactly these configs", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
    );
    const scripts: Record<string, string> = pkgJson.scripts ?? {};

    const localScript = scripts["test:integration:docker-local"];
    expect(
      `test:integration:docker-local -> ${localScript ?? "MISSING"}`,
    ).toContain(DOCKER_LOCAL_CONFIG);

    const upstreamScript = scripts["test:integration:docker-upstream"];
    expect(
      `test:integration:docker-upstream -> ${upstreamScript ?? "MISSING"}`,
    ).toContain(DOCKER_UPSTREAM_CONFIG);

    // Neither split script may point at the deleted legacy config.
    expect(localScript ?? "").not.toContain(LEGACY_DOCKER_CONFIG);
    expect(upstreamScript ?? "").not.toContain(LEGACY_DOCKER_CONFIG);
  });

  it("no package.json script references a jest config file that does not exist", () => {
    // Generic dangling-reference guard: any `--config=<file>` referenced by
    // any script must resolve to a real file at the package root.
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
    );
    const scripts: Record<string, string> = pkgJson.scripts ?? {};
    const dangling: string[] = [];
    for (const [scriptName, scriptValue] of Object.entries(scripts)) {
      if (typeof scriptValue !== "string") {
        continue;
      }
      for (const m of scriptValue.matchAll(/--config=([^\s"']+\.t[sj])/g)) {
        if (!fs.existsSync(path.join(PACKAGE_ROOT, m[1]))) {
          dangling.push(`${scriptName} -> ${m[1]}`);
        }
      }
    }
    expect({ danglingScriptConfigReferences: dangling }).toEqual({
      danglingScriptConfigReferences: [],
    });
  });

  it("deleted legacy jest.config-integration-docker.ts stays gone and unreferenced", () => {
    // (1) The legacy config file itself must not reappear.
    expect(fs.existsSync(LEGACY_CONFIG_PATH)).toBe(false);

    // (2) No stale textual references in package.json, package README or
    // root BUILD.md. (The literal "jest.config-integration-docker.ts" cannot
    // false-positive on the split names: those are "…docker-local.ts" /
    // "…docker-upstream.ts".)
    const filesToCheck = [
      path.join(PACKAGE_ROOT, "package.json"),
      path.join(PACKAGE_ROOT, "README.md"),
      path.join(REPO_ROOT, "BUILD.md"),
    ];
    for (const filePath of filesToCheck) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      expect({
        file: filePath,
        staleLegacyConfigRefs: raw.includes(LEGACY_DOCKER_CONFIG)
          ? [LEGACY_DOCKER_CONFIG]
          : [],
      }).toEqual({
        file: filePath,
        staleLegacyConfigRefs: [],
      });
    }
  });
});
