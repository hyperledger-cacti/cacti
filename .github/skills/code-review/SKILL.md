---
name: code-review
description: "Apply when reviewing a pull request in Hyperledger Cacti. Covers PR scope, Conventional Commits, TypeScript conventions, public API surface, testing, security (OWASP Top 10), AI slop detection, and CI status."
---

Review every PR against this checklist. Prioritize blocking issues over nits.
Leave a comment only when you have a concrete, actionable suggestion.
Do not approve a PR — human maintainer approval is required.

## Checklist

| # | Check | Goal | Reference |
|---|-------|------|-----------|
| 1 | PR scope | One logical unit; no bundled unrelated concerns | [PULL.md §1–2](../../PULL.md) |
| 2 | Conventional Commits | Header ≤ 72 chars; correct type prefix; PR title matches linked issue | [CONVENTIONS.md §8](../../CONVENTIONS.md#8-commit--pr-conventions) |
| 3 | TypeScript conventions | `I` prefix on interfaces; no `any`/`console.log`/`eval`; Prettier format | [CONVENTIONS.md §5](../../CONVENTIONS.md#5-typescript-conventions) |
| 4 | Public API surface | New types in `public-api.ts`; no manual edits to `generated/` | [CONVENTIONS.md §4](../../CONVENTIONS.md#4-package-internal-structure) |
| 5 | Package conventions | `cacti-` prefix; `tsconfig.base.json` extended; `cactus-test-tooling` devDep only | [CONVENTIONS.md §3–4](../../CONVENTIONS.md#3-package-naming-convention) |
| 6 | Testing | Failing test for every behaviour change; port `0`; no coverage bloat | [CONVENTIONS.md §7](../../CONVENTIONS.md#7-testing-conventions), [PULL.md §3](../../PULL.md) |
| 7 | Security (OWASP Top 10) | No secrets/injection/permissive CORS/verbose errors; SHA-pinned Actions | [SECURITY.md](../../SECURITY.md) |
| 8 | AI slop | No restatement comments, single-caller abstractions, hallucinated APIs | [AI_GUIDELINES.md](../../AI_GUIDELINES.md) |
| 9 | CI status | Fetch the PR's actual check-run results; report any failing checks | PR state |

## AI Slop Details (§8)

Flag the following as requiring resolution before merge:

- **Restatement comments**: `// increment i by 1` above `i++`.
- **Single-caller abstractions**: helpers or classes created only to be called once.
- **Hallucinated APIs**: calls to methods/properties not in the installed library version.
- **Coverage bloat**: test blocks that pass even with a broken implementation.
- **Generic identifiers**: `data`, `result`, `obj`, `handler` where a domain name is possible.

## CI Status (§9)

1. Use GitHub MCP tools to fetch the PR's actual check-run results.
2. List every failing or pending check by name.
3. Report each failure as **Blocking** with the check name and a link to the run log.

## Output Format

- **Severity**: `Blocking` / `Required` / `Nit`
- **File**: path and line range (or `CI` for check-run failures)
- **Issue**: one-sentence description
- **Suggestion**: the exact change needed

Do not post a comment without a concrete suggestion.
