---
name: refactor-plan
description: "Generate a structured refactoring plan for a Cacti package or module. Analyzes current code structure, identifies improvement opportunities, and produces a phased plan with risk assessment."
---

# Refactor Plan Skill

Generate a structured, risk-assessed refactoring plan for a package or module.

## When to Use

- Before starting a significant refactoring effort
- When code complexity exceeds maintainability thresholds
- When migrating between patterns or architectures
- When consolidating related functionality across packages

## Analysis Steps

### 1. Current State Assessment

Read the target code and evaluate:

- **Size**: Line counts for files and functions. Flag functions > 50 lines.
- **Complexity**: Nesting depth, cyclomatic complexity, branching density.
- **Coupling**: External dependencies, tight coupling between modules.
- **Cohesion**: How well each module focuses on a single responsibility.
- **Type safety**: Usage of `any`, `unknown`, and proper type narrowing.
- **Test coverage**: Which public functions have corresponding tests.

### 2. Identify Improvement Opportunities

Common refactoring targets in Cacti:

- **Extract interface**: Create `I`-prefixed interfaces for dependency
  injection and testing.
- **Consolidate duplicates**: Merge identical logic across modules.
- **Simplify conditionals**: Replace nested if/else with early returns,
  guard clauses, or strategy pattern.
- **Reduce coupling**: Introduce dependency injection, event-driven
  patterns, or facade classes.
- **Improve naming**: Rename to follow Cacti conventions (`I` prefix,
  `isI` type guards).
- **Barrel file cleanup**: Ensure `public-api.ts` exports are accurate
  and minimal.
- **Package boundary**: Move code to the correct package to avoid
  circular dependencies.

### 3. Risk Assessment

For each proposed change, evaluate:

- **Breaking changes**: Will this change public API signatures?
- **Downstream impact**: Which packages depend on the changed code?
- **Test coverage**: Are there tests to catch regressions?
- **Rollback difficulty**: How easy is it to revert if something breaks?

### 4. Phase Planning

Break the refactoring into phases that:

- Each phase is independently mergeable
- Tests pass at the end of every phase
- Breaking changes are isolated and documented
- Higher-risk changes come later after confidence is built

## Output Format

```markdown
# Refactoring Plan: [Package/Module]

## Current State
- **Files**: [count] | **Functions**: [count] | **Lines**: [total]
- **Key concerns**: [summary of issues found]

## Proposed Changes

### Phase 1: [Safe, Non-Breaking Changes]
| # | Change | Files | Risk | Tests |
|---|--------|-------|------|-------|
| 1 | [description] | [files] | Low | [existing/needed] |

### Phase 2: [Structural Improvements]
| # | Change | Files | Risk | Tests |
|---|--------|-------|------|-------|
| 1 | [description] | [files] | Medium | [existing/needed] |

### Phase 3: [Higher-Risk Changes]
| # | Change | Files | Risk | Tests |
|---|--------|-------|------|-------|
| 1 | [description] | [files] | High | [existing/needed] |

## Dependency Map
[which packages are affected by each phase]

## Rollback Strategy
[how to revert each phase independently]
```
