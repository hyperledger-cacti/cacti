# Pull Request Guidelines

This document defines the quality standards every pull request to
Hyperledger Cacti must meet before a maintainer will review it. Read
it alongside [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[PR Template](./.github/PULL_REQUEST_TEMPLATE.md).
---

## 1. One Logical Unit of Work

A pull request must change one logical concern. A bug fix, a
new feature, a refactoring, and a documentation update are each
separate concerns and must not be bundled together.

**What counts as one logical unit:**

- A fix to a single method in a single connector (e.g. `transact()`
  in `cactus-plugin-ledger-connector-ethereum`)
- A new endpoint added to one plugin, together with its tests
- A documentation-only update scoped to one package

**What does not count as one logical unit:**

- A connector bug fix combined with unrelated test tooling changes
- A feature implementation mixed with README updates for other
  packages
- Dependency bumps interleaved with API changes

**Cross-cutting exception:** changes that are inherently cross-cutting
(e.g. a shared type rename that touches many packages) are the only
exception. They are allowed only if the change is mechanical
and explicitly justified in the PR description.

### Concrete Examples

✅ **Good —
[PR #3951](https://github.com/hyperledger-cacti/cacti/pull/3951)**
(`cactus-plugin-satp-hermes`, fix session utils and session hashes)

A targeted bug fix scoped to session utility functions. Four files
changed, 21 lines added, 5 removed. One problem diagnosed, one fix
applied, one test area updated — nothing more. Easy to review,
easy to verify, and easy to revert if a regression appears.

✅ **Good —
[PR #4082](https://github.com/hyperledger-cacti/cacti/pull/4082)**
(`cactus-plugin-satp-hermes`, missing gateway persistence file)

Adds the single missing `GatewayPersistence` class that was
blocking the persistence feature. Two files changed: a `.gitignore`
pattern and the new 256-line `gateway-persistence.ts`. One missing
implementation, one PR — nothing unrelated is touched.

✅ **Good —
[PR #4156](https://github.com/hyperledger-cacti/cacti/pull/4156)**
(`cactus-plugin-satp-hermes`, persist oracle logs)

Adds oracle log persistence end-to-end: new DB migration, a
repository implementation, wiring into the gateway, and a focused
unit test — all within `cactus-plugin-satp-hermes`. Ten files
changed, one feature delivered. Nothing outside the package is
touched, and the test exercises exactly the code that was added.

❌ **Bad —
[PR #3922](https://github.com/hyperledger-cacti/cacti/pull/3922)**
(`cactus-plugin-satp-hermes`, Rafael Belchior, 671 files changed)

Titled "update satp to 0.0.3-beta", the squashed commit message
itself lists over ten distinct concerns bundled together:

- Full gateway refactor
- New `bungee` plugin skeleton
- SATP core v2.0 OpenAPI spec updates
- Protobuf structure changes
- `test-tooling` type fixes (`NodeJS.ReadableStream`)
- Multiple unrelated package.json and `yarn.lock` rewrites

671 files changed, 116 000+ lines. No reviewer can reason about the
correctness of a gateway refactor while simultaneously auditing a new
plugin skeleton, generated OpenAPI changes, and type fixes in a
shared tooling package. This should have been at minimum four
sequential PRs.

❌ **Bad —
[`8a940fd`](https://github.com/hyperledger-cacti/cacti/commit/8a940fdc13ec1c74a64f71576fce971708db23c7)**
(`cactus-plugin-satp-hermes`, add adapter layer, Rafael Belchior)

Although the commit focused in one functionality, its size makes it very hard to review: 132 files changed, 24 000+ lines. A single commit that bundled:

- The new adapter layer feature
- CI configuration updates
- General code robustness fixes
- Examples build fixes
- Database configuration centralisation
- Dev container updates
- Test suite fixes

Each of these is an independent deliverable. A reviewer cannot reason
about the adapter layer implementation while simultaneously verifying
that the database config change is safe, the CI update is correct,
and the devcontainer change is necessary. This should have been broken
into at least four sequential PRs.

---

## 2. Small and Simple

Keep diffs as small and as simple as possible.

- If a feature is large, break it into a series of incremental PRs:
  scaffold and core logic, minimal tests, minimal documentation → commprehensive tests and documentation → examples, test ledgerfs.
- PRs that span many dozens of files or hundreds of lines across
  unrelated concerns will be closed; the contributor will be asked to
  decompose them before re-opening.

See also
[CONTRIBUTING.md — Small, Focused Pull Requests](./CONTRIBUTING.md#small-focused-pull-requests)
for further elaboration on this principle.

---

## 3. Well-Tested and Documented

Tests and documentation must accompany changes to behaviour or public
API. Quality matters far more than quantity.

- **Write targeted tests** that exercise the changed behaviour and
  would fail if the change were reverted.
- **Avoid AI-generated coverage bloat.** Twenty trivially passing
  tests generated by an LLM that add no diagnostic value are worse
  than one focused integration test that proves the behaviour works
  end-to-end.
- **Update documentation** (README, inline comments, OpenAPI spec)
  when the public API changes.

> **✅ Good:** A new option added to `transact()` is accompanied by
> one focused integration test that proves the option has the intended
> effect and would fail without the implementation.
>
> **❌ Bad:** The same option is accompanied by 20 unit tests
> each asserting trivially obvious
> properties that would pass even if the implementation were wrong.

A PR that lacks meaningful test coverage for its changes will be sent
back before review begins.

---

## 4. PR Template Checklist

Every item in the [PR Template](./.github/PULL_REQUEST_TEMPLATE.md)
must be checked before you mark the PR as ready for review.


## 5. CONTRIBUTING.md Compliance

Read [CONTRIBUTING.md](./CONTRIBUTING.md) in full before opening a
PR. It covers:

- How to fork, branch, and rebase
- How to write and sign commits
- How to respond to review feedback
- The PR checklist for both contributors and maintainers
- Git best practices specific to this repository

Non-compliance with CONTRIBUTING.md will block merge.

---

## 6. Commit Type and Title Discipline

Use Conventional Commit types based on user impact, not file location.

- Use `fix:` only for user-facing bug fixes in main code/packages.
- Use `feat:` only for user-facing features in main code/packages.
- Use `build:` only for build-system/package build changes (not docs,
  examples, or tests).
- For non-user-facing work, use appropriate types such as `docs:`,
  `test:`, `ci:`, `chore:`, `refactor:`.

Do **not** use `fix:`/`feat:` for documentation, CI, test-only, or other
internal maintenance work (for example, avoid `fix(docs)` and `fix(ci)`).
These commit types are release-significant and feed changelog semantics.

If a PR closes/fixes an issue, keep naming aligned:

- Issue title
- PR title
- Main commit title (typically the squash commit title)

They should describe the same change using the same Conventional Commit intent.

## 7. Signed commits
Have git sign-off at the end of the commit message (`Signed-off-by: Name <email>`) to certify the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). Use the `-s` flag with `git commit`. See [signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) for more information. **AI agents must not add Signed-off-by tags** — only the human submitter may certify the DCO (see [AI Guidelines §7](./AI_GUIDELINES.md)).

## 8. Character limits

Pull Request Title and Commit Subject must not exceed 72 characters (including spaces and special characters). Commit Message per line must not exceed 80 characters (including spaces and special characters).

---

## 9. Linked Issue and Traceability

Every PR description (and ideally the commit body) **must** contain a
keyword that links the PR to an issue:

| Keyword | When to use |
|---------|-------------|
| `Closes #N` / `Fixes #N` / `Resolves #N` | The PR fully resolves the issue. GitHub closes the issue on merge. |
| `Addresses #N` / `Refs #N` | The PR makes partial progress. The issue stays open. |

The referenced issue must carry the `Triage_Ready` label — meaning a
maintainer has approved the design. PRs that reference
an issue still marked `Triage_Needed`, or that reference no issue at all might be closed immediatly.

### Examples of compliant commit bodies:

```
fix(connector-besu): handle null receipt in transact()

Resolves #1234

Signed-off-by: Your Name <you@example.com>
```

```
feat(satp-hermes): add oracle log persistence

Addresses #5678 — persistence of oracle logs is wired in;
step 3 of the broader oracle observability epic remains open.

Signed-off-by: Your Name <you@example.com>
```

---

## Quick Reference

| Rule | Severity | Consequence |
|------|----------|-------------|
| 1. One logical unit of work | Hard blocker | PR closed immediately |
| 2. Small and simple | Hard blocker | PR closed immediately |
| 3. Well-tested and documented | Required | Sent back before review |
| 4. PR template checklist | Required | Sent back before review |
| 5. CONTRIBUTING.md compliance | Required | Blocks merge |
| 6. Commit type and title discipline | Required | Sent back before review |
| 7. Signed commits (DCO) | Required | Blocks merge |
| 8. Character limits (72 / 80 chars) | Required | Sent back before review |
| 9. Linked `Triage_Ready` issue | Required | Flagged; PR cannot merge |

---

## PR Author Checklist

The [PR Template](./.github/PULL_REQUEST_TEMPLATE.md) includes this
checklist. Every item must be ticked before you mark the PR ready for review.

- [ ] This PR is linked to a `Triage_Ready` issue (see §9 above).
- [ ] `yarn tsc` passes with no errors.
- [ ] `yarn lint` passes and produces no unstaged file changes.
- [ ] Git hooks are installed and were not bypassed (`yarn install` runs
      `husky` via the `prepare` script; do **not** use `HUSKY=0` or
      `--no-verify`).
- [ ] I added or updated tests where appropriate.
- [ ] I updated documentation (README, OpenAPI spec, inline comments)
      where appropriate.
- [ ] My commits are signed off (`git commit -s`) per the
      [DCO](https://developercertificate.org/).
- [ ] My commit messages follow
      [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary).
- [ ] The PR title matches my latest commit subject exactly.
- [ ] If AI tools were used, the commit includes an `Assisted-by` tag per
      [AI Guidelines §2.2](./AI_GUIDELINES.md#22-disclosure).

---

## Related Documents

- [CONTRIBUTING.md](./CONTRIBUTING.md) — full contributor workflow
- [CONVENTIONS.md §8](./CONVENTIONS.md#8-commit--pr-conventions) —
  commit and PR conventions
- [AI_GUIDELINES.md §2.2](./AI_GUIDELINES.md#22-disclosure) —
  AI disclosure requirements
- [AI_GUIDELINES.md §2.6](./AI_GUIDELINES.md#26-triage-gate-for-agents) —
  triage gate rule for AI agents
- [PR Template](./.github/PULL_REQUEST_TEMPLATE.md) — the checklist
  you fill in when opening a PR
