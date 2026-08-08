<!-- --8<-- [start:content] -->
# Set Up a Git Branch

This guide explains how to properly set up your local development environment and Git branch when starting work on a new feature or bugfix for Hyperledger Cacti. It also covers the expected directory structure and some common development commands.

## Prerequisites
- Git installed on your local machine.
- A GitHub account.
- A fork of the [Hyperledger Cacti repository][cacti-repo].

## Steps

1. **Clone your fork**
   Clone your fork of the repository to your local machine.
2. **Setup your local fork**
   Add the upstream repository to keep your local fork up-to-date (optional but recommended).
   ```bash
   # Add 'upstream' repo to list of remotes
   git remote add upstream https://github.com/hyperledger-cacti/cacti.git

   # Verify the new remote named 'upstream'
   git remote -v

   # Checkout your main branch and rebase to upstream.
   # Run those commands whenever you want to synchronize with the main branch
   git fetch upstream
   git checkout main
   git rebase upstream/main
   ```
3. **Configure Windows longpaths (Windows only)**
   If you are on Windows, ensure that long paths are enabled:
   ```bash
   git config --global core.longpaths true
   ```
4. **Create your branch**
   Checkout the main branch and create a new branch for your feature. Give it a simple, informative name.
   ```bash
   # Checkout the main branch - you want your new branch to come from main
   git checkout main

   # Create a new branch named <newfeature>
   git branch <newfeature>
   ```
5. **Checkout your branch and add/modify files**
   Navigate to your new branch and begin development.
   ```bash
   git checkout <newfeature>
   git rebase main
   ```
6. **Install git hook scripts**
   Run the following command once to install the pre-commit hooks for secret detection.
   ```bash
   yarn run tools:install-pre-commit-secret-detection
   ```
7. **Familiarize yourself with the directory structure**
   Follow the established directory structure when adding or modifying code:
   - `docs/`: Project documentation (MkDocs-based)
     - `docs/`: Documentation source files
     - `assets/`: Static assets for documentation
   - `examples/`: Example applications and demos
   - `extensions/`: Optional extensions and plugins
   - `packages/`: Core packages (monorepo structure)
     - `cactus-api-client/`: API client utilities
     - `cactus-cmd-api-server/`: API server command
     - `cactus-common/`: Common utilities and shared code
     - `cactus-core/`: Core framework functionality
     - `cactus-core-api/`: Core API definitions
     - `cacti-plugin-ledger-connector-*/`: Ledger connector plugins
     - `cacti-plugin-keychain-*/`: Keychain plugins
     - `cacti-plugin-satp-hermes/`: SATP implementation
     - `cacti-test-*/`: Test packages for integration testing
     - `cacti-copm-*/`: COPM packages
     - `cacti-plugin-weaver-*/`: Weaver integration plugins
   - `tools/`: Build and CI/CD tooling
     - `docker/`: Docker images (all-in-one ledger images)
     - `ci.sh`: Main CI script
   - `weaver/`: Weaver interoperability framework
   - `whitepaper/`: Project whitepaper

8. **Commit changes to your branch**
   Use standard commands or Commitizen to commit your changes.
   ```bash
   # Format your code
   npm run prettier
   
   # Commit and push your changes to your fork
   git add -A
   
   # Optional: use commitizen for standard commit messages
   npm run commit
   
   # Standard git commit
   git commit -s -m "<type>[optional scope]: <description>"
   
   git push origin <newfeature>
   ```
9. **Test locally**
   Run the local CI script to verify your changes before submitting a PR.
   ```bash
   ./tools/ci.sh
   ```
10. **Open a Pull Request**
    Once you've committed and pushed all of your changes to GitHub, go to the page for your fork on GitHub, select your development branch, and click the "Pull Request" button. Repeat steps 4 to 10 when preparing a new pull request.
    *Note: Once you submitted a pull request to the Cacti repository, step 8 is not necessary if you make further changes with `git commit --amend`, since your amends will be pushed automatically.*

## Expected Outcome
Your branch is successfully created, properly synchronized with upstream, code is modified following the standard directory structure, and your commits are pushed to your remote fork ready for a pull request.

## Related
- [Contributing Guidelines][contributing]
- [Build Instructions][build]
- [Conventions][conventions]
- [GitHub Standard Fork & Pull Request Workflow][github-workflow]

<!-- --8<-- [end:content] -->

[cacti-repo]: https://github.com/hyperledger-cacti/cacti
[contributing]: ../../CONTRIBUTING.md
[build]: ../../BUILD.md
[conventions]: ../../CONVENTIONS.md
[github-workflow]: https://gist.github.com/Chaser324/ce0505fbed06b947d962
