# CI Failure Report — {{TARGET}}

- **Target**: {{PR_OR_SHA}}
- **Workflow run**: {{RUN_URL}}
- **Commit**: `{{SHA}}` — {{COMMIT_MSG}}
- **Date**: {{DATE}}
- **Triager**: {{TRIAGER}}

## Summary

| # | Job | Bucket | Caused by PR? | Recommended fix |
|---|-----|--------|---------------|-----------------|
| 1 | `<job-name>` | <bucket> | yes / no | <one-line fix> |

**Headline**: <X failures total — Y PR-caused, Z pre-existing, W infra flakes>.

## PR-caused failures (must fix before merge)

### 1. `<job-name>`

- **Run**: <job URL>
- **Signal**:
  ```
  <error line(s) from log>
  ```
- **Root cause**: <one paragraph>
- **Fix**: <concrete change, file + diff sketch>

## Pre-existing failures (do not block PR)

### N. `<job-name>`

- **Run**: <job URL>
- **Signal**: `<error>`
- **Status**: also failing on `main` at base sha `<sha>` — pre-existing.
- **Follow-up**: <issue number or "open issue">

## Infra flakes (re-run)

| Job | Error |
|-----|-------|
| `<job>` | `Cache service responded with 400` |

## Recommended action order

1. <PR-caused fix #1>
2. <PR-caused fix #2>
3. Re-run infra-flake jobs
4. File follow-up issues for pre-existing failures

## Appendix — full failing jobs list

<details>
<summary>Raw <code>gh pr checks</code> output</summary>

```
<paste of gh pr checks ...>
```

</details>
