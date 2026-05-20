# Cacti Cleanup — Package Audit (LFX 2026 PoC)

This is a small proof-of-concept submitted alongside the LFX 2026 mentorship
proposal *"Improve usability, maintainability, and contributor experience of
Hyperledger Cacti"* ([mentorship-program#62](https://github.com/LF-Decentralized-Trust-Mentorships/mentorship-program/issues/62)).

It is **not** a feature, and intentionally not a UI. It demonstrates how the
mentee proposes to start the project: the audit step (Phase 1 in the
implementation plan), implemented as runnable code rather than prose.

## What it does

`audit-packages.ts` walks every workspace declared in `lerna.json` and, for
each one, captures the cleanup signals that the maintainer-led "Cacti
Cleanup" initiative explicitly targets:

| Signal | Why it matters |
|---|---|
| README presence + byte size | The most recent commit on this branch (`e7cc7a6`) literally backfills missing keychain/common READMEs — this measures how much of that work is left. |
| Stub-README detection (< 2 KB) | Distinguishes "exists" from "useful". |
| Dedicated docs page under `docs/docs/cactus/packages/<name>.md` | Today only 12 of ~48 workspaces have one. The audit makes the gap concrete. |
| Namespace classification (`cactus-*` vs `cacti-*` vs weaver) | Surfaces the post-merger naming bifurcation called out in `README.md`. |
| `@deprecated`, `TODO`, `FIXME` density in `src/` | Direct technical-debt markers. `cactus-core/src/main/typescript/web-services/stringify-big-int-replacer.ts` is the canonical example the script picks up. |

It then writes two artifacts under `tools/cleanup-audit/out/`:

- `audit.json` — the full machine-readable record, one entry per workspace.
- `audit.md` — a human-readable summary plus a Top-15 prioritized list ranked
  by a `cleanupScore` heuristic. This is the kind of artifact a mentee would
  attach to a meta-issue at the start of the program and re-run at the end to
  measure progress.

## Why this is the right "core execution logic"

Every later phase of the implementation plan (doc restructure, deletion PRs,
plugin scaffolder, CI consolidation) depends on knowing **which packages need
attention first**. Without this baseline, "improve documentation" or
"remove deprecated modules" are vibes, not commitments. With it, every PR can
quote a row from `audit.md` and a delta against the baseline.

The script is deliberately small (~150 LOC), uses only dependencies already
present at the repo root (`fs-extra`, `globby`), follows the same ESM +
`lerna.json` import pattern as `tools/sort-package-json.ts`, and is shaped so
it can later be wired into a `code-quality-checks.yaml` job that fails when
`cleanupScore` regresses.

## Running it locally

From the repo root, with dependencies already installed (`yarn install`):

```bash
yarn ts-node tools/cleanup-audit/audit-packages.ts
```

Or, equivalently, with the binary that ships with `ts-node`:

```bash
node --loader ts-node/esm tools/cleanup-audit/audit-packages.ts
```

Output:

```
[tools/cleanup-audit/audit-packages] found 56 workspaces
[tools/cleanup-audit/audit-packages] wrote tools/cleanup-audit/out/audit.json
[tools/cleanup-audit/audit-packages] wrote tools/cleanup-audit/out/audit.md
```

Open `tools/cleanup-audit/out/audit.md` to read the prioritized cleanup list.

## What this PoC is *not*

- It is not the cleanup itself — it surfaces work, it does not perform it.
- It is not a quality verdict on any package. The `cleanupScore` is a
  heuristic prioritization aid, intended for maintainer-driven triage.
- It is not yet wired into CI. That step belongs in Phase 4 of the plan and
  needs maintainer signoff on the scoring weights first.

## Next steps if accepted

1. Discuss scoring weights with mentors (Open Question #3 in the plan).
2. Add a `--baseline <file>` flag so re-runs can emit a *delta* report.
3. Extend the signal set: README link-rot, OpenAPI ↔ proto operation parity,
   workflow-touch frequency from `git log`.
4. Wire into `code-quality-checks.yaml` as a non-blocking informational job.
