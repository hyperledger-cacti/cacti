**Pull Request Requirements**
- [ ] Rebased onto `upstream/main` branch and squashed into single commit to help maintainers review it more efficiently and to avoid spaghetti git commit graphs that obfuscate which commit did exactly what change, when, and why.
- [ ] Have git sign-off at the end of the commit message (`Signed-off-by: Name <email>`) to certify the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). Use the `-s` flag with `git commit`. See [signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) for more information. **AI agents must not add Signed-off-by tags** — only the human submitter may certify the DCO (see [AI Guidelines §7](./AI_GUIDELINES.md)).
- [ ] Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification) specification for commit linting.
- [ ] If AI tools were used, include an `Assisted-by` tag in the commit message per the [AI Guidelines §2.2](./AI_GUIDELINES.md#22-disclosure) (e.g., `Assisted-by: GitHub-Copilot:claude-opus-4`). All AI-generated code must be human-reviewed before submission.

> **Note:** PRs that do not satisfy the requirements above will fail the
> DCO checker and/or the commit lint CI checks and cannot be merged.

**Character Limit**
- [ ] Pull Request Title and Commit Subject must not exceed 80 characters (including spaces and special characters).
- [ ] Commit Message per line must not exceed 102 characters (including spaces and special characters).

**A Must Read for Beginners**
For rebasing and squashing, here's a [must read guide](https://github.com/servo/servo/wiki/Beginner's-guide-to-rebasing-and-squashing) for beginners.
