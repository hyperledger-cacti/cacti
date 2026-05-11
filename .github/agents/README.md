# Copilot Agents

Contributor guide for the `.github/agents/` directory in the Hyperledger
Cacti monorepo.

## What Are Copilot Agents?

Each `.agent.md` file defines a specialized AI assistant with a scoped system
prompt, a set of allowed tools, and optional handoff chains to other agents.
GitHub Copilot discovers every `*.agent.md` file in `.github/agents/`
automatically — no registration step is needed.

## Existing Agents

| Agent | File | Tools | Handoffs To | Use When |
|-------|------|-------|-------------|----------|
| CI Debugger | `ci-debugger.agent.md` | read, edit, search, execute, github | code-reviewer | Debugging GitHub Actions CI failures |
| Code Reviewer | `code-reviewer.agent.md` | read, search | _(none)_ | Reviewing code for convention compliance |
| Debugger | `debugger.agent.md` | read, edit, search, execute | ci-debugger | Diagnosing and fixing bugs iteratively |
| Feature Implementer | `feature-implementer.agent.md` | read, edit, search, execute | tdd-implementer, review | Implementing new features end-to-end |
| Review | `review.agent.md` | read, search, execute | security-review, debugger, code-reviewer | Tech debt + AI slop cleanup |
| Security Review | `security-review.agent.md` | read, search, execute, github | debugger, code-reviewer | Security audit + OWASP + supply chain + CI integration |
| TDD Implementer | `tdd-implementer.agent.md` | read, edit, search, execute | review, code-reviewer | Red-Green-Refactor TDD cycle |

## Handoff Graph

```text
feature-implementer → tdd-implementer → review → security-review → code-reviewer
                                          ↓               ↓
debugger ──────────→ ci-debugger ───────→ code-reviewer
```

## Frontmatter Schema

Every agent file starts with YAML frontmatter between `---` fences:

```yaml
---
description: "When Copilot should suggest this agent"
tools:
  - read
  - edit
  - search
  - execute
handoffs:
  - label: "Hand off to Code Reviewer"
    agent: "code-reviewer"
    prompt: "Review the changes for convention compliance."
    send: "context"
---
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | When Copilot should suggest this agent |
| `tools` | array | yes | Tool categories: `read`, `edit`, `search`, `execute`, `github` |
| `handoffs` | array | no | List of handoff objects (see below) |

Each handoff object contains:

- `label` — Button text shown to the user
- `agent` — Target agent name (must match a `<name>.agent.md` file)
- `prompt` — Default prompt sent to the target agent
- `send` — What context to forward (e.g. `"context"`)

## File Naming Convention

- Pattern: `<kebab-case-name>.agent.md`
- Files starting with `_` (e.g. `_template.agent.md`) are templates and are
  **not** discovered as real agents by Copilot.

## Creating a New Agent

1. **Copy the template**
   ```bash
   cp .github/agents/_template.agent.md .github/agents/<your-agent>.agent.md
   ```

2. **Fill in frontmatter** — Set `description`, `tools`, and `handoffs`.

3. **Write the system prompt** — Structure the body with these sections:
   - **Input** — What the agent receives
   - **Procedure** — Step-by-step workflow
   - **Output Format** — Expected response structure
   - **Constraints** — Guardrails and limits
   - **References** — Pointers to conventions or specs

4. **Verify handoff targets** — Every `agent:` value in `handoffs` must have
   a matching `.agent.md` file in this directory.

5. **Lint**
   ```bash
   node tools/ai-config-lint.mjs
   ```

6. **Test** — Invoke the agent through Copilot CLI and confirm it behaves
   as expected, including handoff transitions.

## References

- [CONVENTIONS.md](../../CONVENTIONS.md) — Project-wide coding conventions
- [copilot-instructions.md](../copilot-instructions.md) — Global Copilot
  workspace instructions
