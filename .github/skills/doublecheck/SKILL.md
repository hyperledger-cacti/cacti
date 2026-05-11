---
name: doublecheck
description: "Cross-verify assertions, assumptions, and logic in code or explanations. Use as a quality gate before committing changes. Re-reads relevant code and confirms correctness."
---

# Doublecheck Skill

Verify assertions, logic, and assumptions before finalizing changes. This
skill provides a structured second-look workflow.

## When to Use

- Before committing a non-trivial change
- After completing a debugging session
- When uncertain about edge cases or correctness
- When refactoring critical path code

## Verification Checklist

### Logic Verification
1. Re-read the changed code and trace the logic step by step.
2. Confirm all conditional branches produce the correct outcome.
3. Check for off-by-one errors, null/undefined edge cases, and
   type coercion issues.
4. Verify async code handles all Promise rejection paths.

### Convention Compliance
1. Confirm `I` prefix on interfaces, `isI` prefix on type guards.
2. Verify `public-api.ts` exports are correct and complete.
3. Check no test types are exported from `public-api.ts`.
4. Confirm no files under `generated/` were modified.
5. Verify Prettier formatting: double quotes, semicolons, 2-space indent.

### Test Verification
1. Run affected tests and confirm they pass.
2. Check that tests are self-contained with injectable configuration.
3. Verify test names describe expected behavior.
4. Confirm test files use `*.test.ts` suffix and correct directory.

### Dependency Check
1. Verify no circular dependencies introduced.
2. Confirm `cactus-test-tooling` is `devDependency` only.
3. Check imported modules actually exist and are correctly referenced.

## Workflow

```
1. Gather: Read all changed files
2. Trace: Follow logic paths through the changes
3. Verify: Check each item on the checklist above
4. Report: Summarize findings as PASS/FAIL with details
```

## Output Format

```markdown
## Doublecheck Report

**Scope**: [files checked]
**Result**: ✅ PASS / ❌ FAIL

### Findings
- [PASS/FAIL] Logic verification: [details]
- [PASS/FAIL] Convention compliance: [details]
- [PASS/FAIL] Test verification: [details]
- [PASS/FAIL] Dependency check: [details]

### Issues Found (if any)
1. [specific issue and location]
```
