<!--
 SPDX-License-Identifier: CC-BY-4.0
 -->

# Development Environment Quickstart

Use the repository's Dev Container or Nix configuration to prepare a
development environment, compile the TypeScript backend, build the SATP
Hermes bundle, and run its unit tests. Choose one setup route; using Nix
inside the Dev Container is not required.

The [build guide](../../cactus/build.md) covers platform prerequisites and
other build targets. The [Nix setup guide](../nix-setup.md) provides Nix
installation and shell configuration instructions.

## Prepare the repository

Install Git and Visual Studio Code. Both setup routes require network
access and disk space for toolchains, dependencies, and build output.

Clone the repository into a persistent directory:

```bash
git clone https://github.com/hyperledger-cacti/cacti.git
cd cacti
code .
```

Open the cloned repository, not an empty parent folder. Confirm that the
VS Code Explorer shows `package.json`, `flake.nix`, and
`.devcontainer/devcontainer.json` at the repository root.

On Windows, Nix requires a Linux environment such as WSL 2. For Dev
Containers, follow the [VS Code platform setup instructions](https://code.visualstudio.com/docs/devcontainers/containers).

## Option 1: Dev Container

### Check prerequisites

Install and start Docker Engine or Docker Desktop, then install the
[Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
in VS Code. From the terminal containing the checkout, verify that the
Docker client can reach the server:

```bash
docker version
docker compose version
```

### Open the development environment

1. Open the Command Palette with `Ctrl+Shift+P`, or `Cmd+Shift+P` on macOS.
2. Select **Dev Containers: Reopen in Container**.
3. Wait for VS Code to prepare the existing `.devcontainer/devcontainer.json`.
4. Open **Terminal > New Terminal** after the editor connects.

Run development commands in this container terminal, at the repository
root. The configuration supplies Node.js and additional language tools.
It does not automatically install repository dependencies or compile Cacti.

Verify the active environment and enable the repository's package manager:

```bash
pwd
git rev-parse --show-toplevel
node --version
corepack --version
corepack enable
yarn --version
docker version
```

The working directory should be the mounted repository. Use the Yarn
version selected by the repository rather than installing a separate
global Yarn release. Continue with [Build and test](#build-and-test).

## Option 2: Nix

Install Nix and enable the `nix-command` and `flakes` experimental features
as described in the [Nix setup guide](../nix-setup.md). From the repository
root in a terminal outside the Dev Container, enter the full shell:

```bash
nix develop
```

The shell uses the toolchains selected by `flake.lock` and enables
Corepack shims. Check the active tools:

```bash
node --version
yarn --version
go version
rustc --version
java --version
```

For work requiring only Node.js and native compilation tools, use
`nix develop .#node` instead. Nix and the Dev Container can select
different tool versions; do not change them merely to match their output.
Docker remains a host prerequisite for workflows that require containers.

Continue in the Nix shell with [Build and test](#build-and-test). Enter
`exit` to leave the shell, and run `nix develop` again when starting a new
development terminal.

## Build and test

Run the following commands from the repository root in the chosen
environment. Wait for each command to succeed before continuing.

### Install dependencies and compile the backend

```bash
yarn install
yarn run configure
```

The explicit installation creates the state needed to run Yarn scripts
on a fresh checkout. The configure script installs dependencies and Git
hooks, compiles the TypeScript backend, and runs its postbuild scripts.
It does not run every frontend, Solidity, or Weaver build.

### Build the SATP Hermes bundle

```bash
yarn lerna run build:bundle --scope=@hyperledger-cacti/cactus-plugin-satp-hermes
```

The bundle is written beneath
`packages/cactus-plugin-satp-hermes/dist/bundle/ncc/`. This builds the
command line application; it does not deploy a gateway.

### Run unit tests

```bash
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:unit
```

Confirm that Jest reports passing suites and tests and the command exits
successfully. Integration tests require additional setup; consult the
[SATP Hermes README](../../cactus/packages/cactus-plugin-satp-hermes.md).

### Verify the editor workflow

Open a source file and confirm that the integrated terminal uses the
selected environment. For Dev Containers, reopen the folder in the
container and confirm that the source files remain in the persistent
checkout. Keep source changes in the mounted repository, not solely in
the container's writable layer.

Before submitting a change, follow the
[contribution guide](../../contributing/how-to-contribute.md) and
[Git branch recipe](../../recipes/git-branch-setup.md) to work from your
fork, prepare a focused branch, and run the required checks.

## Troubleshooting

### EXDEV during dependency installation

Yarn's configured `pnpm` linker uses hard links. Installation can fail
with `EXDEV: cross-device link not permitted` when the Yarn index and the
workspace are on different filesystems or mounts.

From the repository root, check the index location:

```bash
yarn config get globalFolder
```

If the index is outside the workspace filesystem, place it within the
workspace for the current terminal and retry installation:

```bash
export YARN_GLOBAL_FOLDER="$PWD/.yarn/berry"
yarn install
```

This changes the current shell environment, not `.yarnrc.yml`. Set it again
when installing from a new terminal if the filesystem boundary persists.
Do not change the linker or delete the lockfile to address this error.

### Missing Yarn installation state

If Yarn reports a missing installation map, confirm that the terminal is
at the repository root and run `yarn install` before retrying the script.
Resolve any installation failure before proceeding to the build.

### Docker server unavailable

Start Docker Engine or Docker Desktop and repeat `docker version` from
the terminal running the workflow. If it works on the host but not in
the Dev Container, inspect **Dev Containers: Show Container Log** and
check access to the Docker socket. Do not use `sudo` as a substitute for
correct daemon access configuration.

### Additional tool requirements

A successful backend build and unit test run do not validate every
language toolchain or deployment. Check the target package's requirements
before running specialized builds, including Solidity compilation or
Weaver components. See the [build guide](../../cactus/build.md) for
additional prerequisites.
