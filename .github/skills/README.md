# Copilot Skills Directory

Skills are **stateless knowledge modules** that provide domain-specific
patterns and procedures to GitHub Copilot. Unlike agents (which use tools
and take multi-step actions), skills inject specialized knowledge into the
conversation when invoked. Each skill lives in its own directory under
`.github/skills/<name>/` with a `SKILL.md` file.

## Skills vs Agents

| Aspect | Skill | Agent |
|--------|-------|-------|
| Location | `.github/skills/<name>/SKILL.md` | `.github/agents/<name>.agent.md` |
| Has tools? | No | Yes (`read`, `edit`, `search`, `execute`, `github`) |
| Has handoffs? | No | Yes (chains to other agents) |
| Stateful? | No (knowledge injection) | Yes (multi-step workflows) |
| Invocation | Referenced by name in conversation | `@agent-name` in chat |

## Existing Skills

| Skill | Directory | Description |
|-------|-----------|-------------|
| CodeQL Scanning | `codeql-scanning/` | Security vulnerability pattern matching (injection, XSS, prototype pollution, path traversal) |
| Doublecheck | `doublecheck/` | Cross-verification checklist for assertions, logic, and correctness |
| Refactor Plan | `refactor-plan/` | Structured refactoring plan generation with phased approach and risk assessment |

## SKILL.md Frontmatter Schema

Every `SKILL.md` begins with YAML frontmatter:

```yaml
---
name: my-skill-name
description: "One-sentence explanation of what the skill provides."
---
```

- **`name`** (string, required): Must match the directory name exactly.
- **`description`** (string, required): One-sentence explanation of what
  the skill provides.

## Directory Structure

```
.github/skills/
├── README.md              ← this file
├── _template/
│   └── SKILL.md           ← scaffold for new skills
├── codeql-scanning/
│   └── SKILL.md
├── doublecheck/
│   └── SKILL.md
└── refactor-plan/
    └── SKILL.md
```

## Creating a New Skill

1. Create a directory: `.github/skills/<kebab-case-name>/`
2. Copy `_template/SKILL.md` into it.
3. Set `name:` in frontmatter to match the directory name exactly.
4. Write the skill content covering:
   - **When to Use** — conditions that trigger the skill.
   - **Patterns / Procedures** — the domain knowledge to inject.
   - **Examples** — concrete before/after or input/output samples.
5. Run `node tools/ai-config-lint.mjs` to validate frontmatter and
   structure.
6. Test by invoking the skill in a Copilot conversation.

## References

- [CONVENTIONS.md](../../CONVENTIONS.md) — Project-wide conventions
- [Copilot instructions](../copilot-instructions.md) — Global Copilot
  configuration
- [Agents README](../agents/README.md) — Agent directory and pipelines
