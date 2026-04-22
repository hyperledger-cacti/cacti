## Summary
- 

## Commit Title (Conventional Commits)
Use this format: `type(scope): description`

- [ ] `type` is one of: `feat`, `fix`, `docs`, `ci`, `build`, `refactor`, `test`, `chore`, `perf`
- [ ] `scope` is clear and specific

Example: `docs(pr-template): clarify testing and docs impact`

## Testing
Explain how to run/reproduce this change and include the exact commands:

Commands run:
- 

- [ ] Tests added/updated
- [ ] Tests pass
- [ ] If tests were not run, explanation provided

## Docs Impact
- [ ] Docs added/updated (list files/links)
- [ ] N/A (explain why)

Details:

## Breaking Changes
- [ ] Yes
- [ ] No

If yes, include:
- [ ] Migration guide provided (steps and/or link)

Details (only if yes):

## AI Usage Disclosure
- [ ] No AI tools used
- [ ] AI-assisted (list tools and how they were used)
- [ ] AI-generated content/code was reviewed and validated by the author

Details:

## Pull Request Requirements
- [ ] Rebased onto `upstream/main` branch and squashed into single commit to help maintainers review it more efficient and to avoid spaghetti git commit graphs that obfuscate which commit did exactly what change, when and, why.
- [ ] Have git sign off at the end of commit message to avoid being marked red. You can add `-s` flag when using `git commit` command. You may refer to this [link](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) for more information.
- [ ] Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Character Limit
- [ ] PR Title ≤ 72 chars
- [ ] Commit message line ≤ 80 chars

## A Must Read for Beginners
For rebasing and squashing, here's a [must read guide](https://github.com/servo/servo/wiki/Beginner's-guide-to-rebasing-and-squashing) for beginners.
