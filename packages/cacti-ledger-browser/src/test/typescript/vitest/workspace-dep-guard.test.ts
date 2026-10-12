/**
 * CI-enforceable workspace-dependency guard for `cacti-ledger-browser`.
 *
 * The app keeps a "zero workspace dependencies" posture: on 2026-09-17 the
 * working tree briefly declared `@hyperledger-cacti/cactus-plugin-satp-hermes`
 * as a runtime dependency, which would have pulled Node-only plugin code
 * into the browser bundle and coupled the standalone frontend to the
 * gateway package. The predicate below fails on any `@hyperledger-cacti/*`
 * or `@hyperledger/*` entry in `dependencies` / `peerDependencies`
 * (`devDependencies` are exempt - build/test-time tooling is fine), so the
 * violation class is now structurally impossible to reintroduce silently:
 * this suite is part of the package's `test:unit` and fails CI if the
 * dependency reappears in `package.json`.
 *
 * No network access happens in this suite (reads a local file only).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Scope prefixes that must never appear as runtime dependencies. */
const FORBIDDEN_SCOPE_PREFIXES = [
  "@hyperledger-cacti/",
  "@hyperledger/",
] as const;

/** `package.json` sections this guard covers (runtime dependency surface). */
const RUNTIME_DEP_SECTIONS = ["dependencies", "peerDependencies"] as const;

/** Minimal shape of a `package.json` relevant to the guard predicate. */
export interface PackageJsonDeps {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Return a list of `"section[\"name\"]"` violations - runtime dependency
 * entries scoped to a Hyperledger Cacti workspace package. Empty output
 * means the dependency posture rule holds.
 */
export function findForbiddenRuntimeDeps(pkgJson: PackageJsonDeps): string[] {
  const violations: string[] = [];
  for (const section of RUNTIME_DEP_SECTIONS) {
    for (const depName of Object.keys(pkgJson[section] ?? {})) {
      if (
        FORBIDDEN_SCOPE_PREFIXES.some((prefix) => depName.startsWith(prefix))
      ) {
        violations.push(`${section}["${depName}"]`);
      }
    }
  }
  return violations;
}

/**
 * The guarded manifest. `import.meta.url` is not a file:// URL under
 * vitest's module runner, so the path is resolved from the process working
 * directory - the `test:unit` script (and this suite's name assertion
 * below) guarantees it points at this package's own package.json.
 */
const pkgJsonPath = resolve(process.cwd(), "package.json");

describe("workspace-dep guard predicate", () => {
  it("detects forbidden workspace deps in a fixture (the guard is meaningful)", () => {
    const fixture: PackageJsonDeps = {
      name: "some-frontend",
      dependencies: {
        react: "18.2.0",
        // The exact violation observed on 2026-09-17:
        "@hyperledger-cacti/cactus-plugin-satp-hermes": "3.0.1",
      },
      peerDependencies: {
        "@hyperledger/cactus-common": "3.0.1",
      },
      // Exempt section - must NOT be reported:
      devDependencies: {
        "@hyperledger/cactus-test-tooling": "3.0.1",
      },
    };

    expect(findForbiddenRuntimeDeps(fixture)).toEqual([
      'dependencies["@hyperledger-cacti/cactus-plugin-satp-hermes"]',
      'peerDependencies["@hyperledger/cactus-common"]',
    ]);
  });

  it("accepts packages with no runtime workspace deps (devDependencies exempt)", () => {
    expect(
      findForbiddenRuntimeDeps({
        dependencies: { react: "18.2.0", axios: "1.18.1" },
        peerDependencies: { "react-dom": "18.2.0" },
        devDependencies: {
          // Workspace packages are fine as devDependencies (type-only,
          // build-time or test-time usage):
          "@hyperledger-cacti/cactus-plugin-satp-hermes": "3.0.1",
        },
      }),
    ).toEqual([]);

    // Sections may also be absent entirely:
    expect(findForbiddenRuntimeDeps({ name: "bare-package" })).toEqual([]);
  });

  it("flags every section+name combination, not just the first hit", () => {
    const fixture: PackageJsonDeps = {
      dependencies: {
        "@hyperledger/cactus-core": "3.0.1",
        "@hyperledger/cactus-common": "3.0.1",
      },
      peerDependencies: {
        "@hyperledger-cacti/cactus-plugin-ledger-connector-xdai": "3.0.1",
      },
    };

    const violations = findForbiddenRuntimeDeps(fixture);
    expect(violations).toHaveLength(3);
    expect(violations).toContain('dependencies["@hyperledger/cactus-core"]');
  });
});

describe("workspace-dep guard: cacti-ledger-browser/package.json", () => {
  it("reads the real package.json and finds zero runtime workspace deps", () => {
    const pkgJson = JSON.parse(
      readFileSync(pkgJsonPath, "utf8"),
    ) as PackageJsonDeps;

    // Sanity check that the guard really reads this package's manifest:
    expect(pkgJson.name).toBe("@hyperledger-cacti/cacti-ledger-browser");

    expect(findForbiddenRuntimeDeps(pkgJson)).toEqual([]);
  });
});
