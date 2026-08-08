<!-- --8<-- [start:content] -->
# Manage Package Dependencies

This guide explains how to properly add and manage NPM dependencies within the Cacti monorepo to ensure reproducible builds and prevent version drift.

## Prerequisites

- A working Cacti development environment.
- Yarn package manager installed.

## Steps

### 1. Adding Dependencies using Yarn Workspaces

When adding a new dependency, you must know which package of the monorepo will be using it, and then run the `yarn workspace` command. You provide the target package name and the dependency you wish to install.

Example command to add the `got` library to the `@hyperledger-cacti/cactus-common` package:

```bash
yarn workspace @hyperledger-cacti/cactus-common add got --save-exact
```

*See the [Yarn Workspaces Documentation] for official Yarn documentation.*

### 2. Enforcing Version Locking

> Always specify the `--save-exact` flag when installing new dependencies to ensure reproducible builds.

As a best practice, any given revision (commit hash) stored in version control should produce the exact same build artifacts, regardless of when or where the build was performed. This can only be achieved if npm dependency versions are explicitly locked down, instead of being automatically upgraded by npm during installation (which makes the build time-dependent and machine-dependent).

**Bottom line:** Do not use the `^`, `~`, or `*` syntax elements while declaring your npm dependencies in `package.json`.

For further details on this practice, please read about [Reproducible Builds].

### 3. Updating Your IDE Environment

After adding new dependencies, your IDE may require a restart to correctly pick up the newly installed typings or module definitions. You might need to Reload the VS Code Window (see the VS Code Setup recipe for more details).

## Expected Outcome

You will have correctly added a new dependency to a specific package within the Cacti monorepo, pinning its version strictly to maintain determinism and build reproducibility across the project.

## Related

- [Contributing Guidelines][contributing]
- [Conventions][conventions]
- [VS Code Setup](./vscode-setup.md)
<!-- --8<-- [end:content] -->

[contributing]: ../../CONTRIBUTING.md
[conventions]: ../../CONVENTIONS.md
[Yarn Workspaces Documentation]: https://classic.yarnpkg.com/en/docs/workspaces/
[Reproducible Builds]: https://reproducible-builds.org/

