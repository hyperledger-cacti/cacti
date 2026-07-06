---
name: package-removal
description: "10-step checklist for safely removing one or more packages from the Cacti monorepo. Covers inventory, dependency scan, TypeScript import audit, CI workflow cleanup, tsconfig references, test-tooling helpers, directory deletion, lockfile regeneration, tracking-doc update, and verification pass."
---

# Cacti Package Removal Skill

Safe, complete procedure for removing one or more packages from the
Hyperledger Cacti Yarn 4 monorepo without leaving stale imports, dangling
CI jobs, or broken `tsconfig.json` references.

## Repo Facts

- Yarn 4 monorepo, `nodeLinker: pnpm` — no root `node_modules/.bin/`; use
  `yarn <binary>` in husky hooks, never `npx`.
- `lerna.json` autodiscovers packages via globs (`packages/cactus-*`) — no
  edits needed when removing packages.
- Root `tsconfig.json` has **explicit** project references — always remove
  entries for deleted packages.
- macOS `grep` fails with "maximum repetition exceeds 255" on long
  `|`-alternation patterns — run **one package name per `grep` call**.

## Input

You will receive:
- **Package name(s)**: one or more `packages/<pkg-name>` directories to remove
- **Context** (optional): issue number, cleanup tracking doc path, branch name

## Procedure

### Step 1 — Inventory

List every directory targeted for removal and confirm current state:

```bash
find packages/ -maxdepth 1 -name "<pattern>" -type d | sort
ls packages/<pkg-name>/
```

A prior partial cleanup may have removed source files but left `dist/` and
`node_modules/`; that is fine — `rm -rf` in Step 7 handles it.

### Step 2 — Cross-package `package.json` dependency check

For **each** removed package name, run separately (one term per call):

```bash
find packages/ examples/ extensions/ -name "package.json" \
  -not -path "*/node_modules/*" \
  -exec grep -l "<pkg-name>" {} \;
```

Any hit **outside** the package's own directory is a **blocker** — remove
that dependency declaration before proceeding.

### Step 3 — TypeScript import check

Run once per package name, separately:

```bash
grep -r "<pkg-name>" packages/ --include="*.ts" --exclude-dir=node_modules
grep -r "<pkg-name>" examples/ --include="*.ts" --exclude-dir=node_modules
grep -r "<pkg-name>" extensions/ --include="*.ts" --exclude-dir=node_modules
```

Any `import`/`require` in a surviving package is a **blocker** — resolve it
first.

### Step 4 — CI workflow audit

```bash
grep -rl "<pkg-name>" .github/
```

Run once per package name. For each match:

| Match type | Action |
|---|---|
| Job block in a grouped workflow (e.g. `keychain-packages-workflow.yaml`) | Delete the entire job block for the removed package; keep blocks for retained packages |
| `workflow_call` reference in a parent workflow (e.g. `packages-workflow.yaml`) | Leave it — an empty grouped workflow is harmless |
| Standalone workflow file dedicated to the removed package | Delete the entire file |

### Step 5 — Root `tsconfig.json` project references

```bash
grep "<pkg-name>" tsconfig.json
```

If found, remove the corresponding `{ "path": "./packages/<pkg-name>/tsconfig.json" }` entry.

### Step 6 — `cactus-test-tooling` helpers

Check whether `packages/cactus-test-tooling/src/main/typescript/` contains a
package-specific Docker/container helper, then verify surviving consumers:

```bash
grep -r "<HelperClassName>" packages/ --include="*.ts" --exclude-dir=node_modules \
  | grep -v "cactus-test-tooling\|<removed-pkg>"
```

| Result | Action |
|---|---|
| No surviving consumer | Delete the subdirectory; remove its `export { … }` from `packages/cactus-test-tooling/src/main/typescript/public-api.ts` |
| Has a surviving consumer | **Keep it** — do not touch the helper or its export |

> **Example:** `CactusKeychainVaultServer` had no surviving consumer → removed.
> `VaultTestServer` was used by `cactus-plugin-ledger-connector-fabric` → kept.

### Step 7 — Delete package directories

```bash
rm -rf packages/<pkg-name>
```

This removes everything including leftover `dist/`, `node_modules/`, and
`.tgz` pack artifacts.

### Step 8 — Regenerate `yarn.lock`

```bash
yarn install --mode=update-lockfile
```

Removes stale `workspace:` entries for deleted packages from `yarn.lock`
without re-linking all dependencies.

### Step 9 — Update `docs/docs/cleanup-4025.md`

1. Add removed packages to the **"Packages Approved for Removal"** table
   with today's date.
2. In the Review Tables, flip each removed package's `keep?` cell from
   `−` → `❌` and set action columns to `N/A`.
3. Update **Decision Summary** counts: `Remove/Archive` +N, `No Vote` −N.
4. Append a completion line to the footer:
   ```
   **<Label> Completed:** YYYY-MM-DD — `<branch-name>`
   ```

### Step 10 — Verification pass

All checks must return empty/clean output before the task is complete:

```bash
# No live TypeScript imports
grep -r "<pkg-name>" packages/ --include="*.ts" --exclude-dir=node_modules

# No package.json dependency declarations
find packages/ examples/ extensions/ -name "package.json" \
  -not -path "*/node_modules/*" -exec grep -l "<pkg-name>" {} \;

# No CI workflow references
grep -rl "<pkg-name>" .github/

# No yarn.lock workspace entries
grep "<pkg-name>" yarn.lock
```

Acceptable remaining hits: `CHANGELOG.md` files (auto-generated git history),
`docs/` tracking documents, and `dist/` build artifacts (stale until next
`yarn tsc`).

### Step 11 - Extra verifications
Verify references to package being removed, for instance in the docs, CONTRIBUTING.md, `tools/custom-checks/check-dependency-version-consistency`, `jest.config.js`, `openapi-generator-ignore`, `package.json`. Notably, the reference to the package being removed should be removed from the root `tsconfig.ts` as well as from the tsconfig from packages depending on it. Do not remove references from the changelog.

## Output Format

After completing all steps, provide:
- **Summary**: which packages were removed and any blockers resolved
- **Verification**: results of the Step 10 checks
- **Residual risk**: anything deferred or not verified (e.g. integration tests
  not run locally)

## Constraints

- Run `grep` with **one package name per call** — never combine multiple
  names in a `|`-alternation pattern on macOS.
- Never edit files under `generated/` directly.
- Do not remove `cactus-test-tooling` helpers that have surviving consumers.
- Treat any Step 2 or Step 3 blocker as a hard stop — resolve it before
  deleting the package directory.
- Do not `git commit` or `git push` — report what changed and let the user
  review, stage, and commit.
- After completing, hand off to the `code-reviewer` agent to audit: no stale
  imports, no stale `package.json` deps, CI jobs removed, `tsconfig.json`
  references cleaned, `yarn.lock` updated, tracking doc updated.
