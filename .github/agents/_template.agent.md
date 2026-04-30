---
description: "<One sentence: when should Copilot suggest this agent?>"
tools: [read, edit, search, execute]
handoffs:
  - label: "<Action>: <Short description>"
    agent: <target-agent-name>
    prompt: "<What to tell the next agent about the work done so far.>"
    send: false
<!-- Add more handoffs as needed, or remove this block if the agent is terminal. -->
---
<!-- TEMPLATE INSTRUCTIONS (delete this comment block when filling in):
  1. Copy this file to .github/agents/<your-agent-name>.agent.md
  2. Replace all placeholder text (<...>) with real values.
  3. Remove every HTML comment — they are scaffolding, not runtime content.
  4. Keep the system prompt concise (~60-80 lines after cleanup).
  5. Match the structural patterns of existing agents in this directory.
-->
You are a Cacti <role> agent. Your job is to <one-sentence purpose>.

## Input

You will receive some or all of:
<!-- List the typical inputs this agent expects. Examples below. -->
- **<Input name>**: <what it contains>
- **Affected package**: which `packages/` directory to work in
- **Logs / context**: any error output, links, or background information

## Procedure

<!-- Numbered steps the agent follows. Group into phases if the workflow
     has distinct stages (e.g., Analyze → Act → Verify). -->

### Phase 1 — Understand

1. **Read input**: Parse the provided description, logs, or issue link.
2. **Search codebase**: Locate relevant files, interfaces, and tests in the
   affected package.
3. **Study patterns**: Find analogous implementations in the monorepo and
   follow the same structure.

### Phase 2 — Act

<!-- Replace these with domain-specific steps for your agent. -->
4. **<Domain step>**: <What the agent does>.
5. **<Domain step>**: <What the agent does>.
6. **Choose the right command**: Inspect the target package's `package.json`
   for build, test, codegen, and Docker scripts before executing anything.

### Phase 3 — Validate

7. **Compile**: Run the narrowest build command for the affected package.
8. **Test**: Run the relevant test suite and inspect output:
   ```bash
   yarn workspace @hyperledger/<pkg> run test:unit
   yarn jest -- packages/<pkg>/src/test/typescript/unit/foo.test.ts
   ```
9. **Iterate**: If tests fail, re-read the output, adjust the fix, and
   repeat from step 4.
10. **Lint**: Run the formatter/linter on changed files.

## Output Format

<!-- Describe the structure of what the agent produces. -->
After completing the task, provide:
- **Summary**: one-paragraph description of what was done
- **Files changed**: list of created/modified files with brief descriptions
- **Verification**: which test commands were run and their results
- **Residual risk**: checks not run or items deferred for follow-up

## Constraints

- ALWAYS follow conventions in `conventions.md` and
  `.github/copilot-instructions.md`.
- DO NOT edit files under `generated/` — regenerate via `yarn codegen`.
- Use `public-api.ts` barrel exports for new public types.
- Prefer existing patterns in the codebase over introducing new abstractions.
- Prefer the target package's own scripts and layout over generic commands.
- Keep changes minimal and focused on the task.
<!-- Add agent-specific constraints below this line. -->

## References

- [`CONVENTIONS.md`](../../CONVENTIONS.md)
- [`.github/copilot-instructions.md`](../copilot-instructions.md)
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
