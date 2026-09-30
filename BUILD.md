<!-- --8<-- [start:content] -->
- [Hyperledger Cacti Build Instructions](#hyperledger-cacti-build-instructions)
- [Fast Developer Flow / Code Iterations](#fast-developer-flow--code-iterations)
- [Getting Started](#getting-started)
  - [Dev Container Quickstart (Recommended)](#dev-container-quickstart-recommended)
    - [Prerequisites](#prerequisites)
    - [Step-by-Step Setup](#step-by-step-setup)
    - [Known Issue (Important for New Contributors)](#known-issue-important-for-new-contributors)
    - [Workaround](#workaround)
  - [Nix Flake Quickstart](#nix-flake-quickstart)
    - [Prerequisites](#prerequisites-1)
    - [Step-by-Step Setup](#step-by-step-setup-1)
  - [MacOS](#macos)
  - [Linux](#linux)
  - [Windows](#windows)
  - [Random Windows specific issues not covered here](#random-windows-specific-issues-not-covered-here)
  - [Configure Cacti](#configure-cacti)
- [Build Script Decision Tree](#build-script-decision-tree)
- [Running CI Checks Locally Before Pushing](#running-ci-checks-locally-before-pushing)
  - [Quick Checklist](#quick-checklist)
  - [Individual Steps](#individual-steps)
  - [Docker Tests](#docker-tests)
    - [One-command deployment verification](#one-command-deployment-verification)
- [Configuring SSH to use upterm](#configuring-ssh-to-use-upterm)

## Hyperledger Cacti Build Instructions

This is the place to start if you want to give Cactus a spin on your local
machine or if you are planning on contributing.

> This is not a guide for `using` Cactus for your projects that have business logic
> but rather a guide for people who want to make changes to the code of Cactus.
> If you are just planning on using Cactus as an npm dependency for your project,
> then you might not need this guide at all.

The project uses Typescript for both back-end and front-end components.

## Fast Developer Flow / Code Iterations

We put a lot of thought and effort into making sure that fast developer iterations can be
achieved (please file a bug if you feel otherwise) while working **on** the framework.

If you find yourself waiting too much for builds to finish, most of the time
that can be helped by using the `npm run watch` script which can automatically
recompile packages as you modify them (and only the packages that you have
modified, not everything).

It also supports re-running the OpenAPI generator when you update any
`openapi.json` spec files that we use to describe our endpoints.

The `npm run watch` script in action:

![Fast Developer Flow / Code Iterations][build-watch-demo]

## Getting Started

### Dev Container Quickstart (Recommended)

A Dev Container is a pre-configured Docker-based development environment that automatically installs all required tools (Node.js, Yarn, Go, Rust, etc.). This avoids manual setup and ensures consistency across contributors.

#### Prerequisites

Before starting, install:

* [Git](https://github.com/git-guides/install-git)
* [Visual Studio Code](https://code.visualstudio.com/)
* [Docker Desktop](https://www.docker.com/) (must be running)
* [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for VS Code

#### Step-by-Step Setup

**1. Clone the repository**
```bash
git clone https://github.com/hyperledger-cacti/cacti.git
cd cacti
code .
```

**2. Open in Dev Container**

Once VS Code opens:
* Look for popup: **“Reopen in Container”**
* Click it

If popup does not appear:
* Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows/Linux)
* Search: `Dev Containers: Reopen in Container`
* Press `Enter`

**3. Wait for setup**

VS Code will:
* Build Docker container
* Install dependencies

This may take several minutes.

#### Known Issue (Important for New Contributors)

During testing, the DevContainer setup may fail due to a Go version mismatch:
* Current container installs Go 1.20.x
* Some dependencies require Go ≥ 1.23

This can cause container build failure.

#### Workaround

If DevContainer fails, run the project locally instead:
```bash
npm install -g yarn
yarn install
```

**Tip:** If you're new to open source, running locally is often faster and simpler than debugging container issues.

### Nix Flake Quickstart

If you have [Nix](https://nixos.org/) installed with flakes enabled, you can
set up a complete, reproducible development environment with a single command.
Nix provides the exact versions of Node.js, Go, Rust, JDK, Protobuf, and all
other required toolchains, no manual installation necessary.

#### Prerequisites

* [Nix](https://nixos.org/) with [flakes](https://wiki.nixos.org/wiki/Flakes) enabled
* [Docker](https://www.docker.com/) (daemon must be running on the host for integration tests)

> **Note:** If you are new to Nix, see the detailed
> [Nix Setup Guide][build-nix-setup] for installation and
> configuration instructions.

#### Step-by-Step Setup

**1. Clone the repository**
```bash
git clone https://github.com/hyperledger-cacti/cacti.git
cd cacti
```

**2. Enter the development shell**
```bash
nix develop
```

The first run downloads and caches all dependencies (a few minutes). Subsequent
runs are near-instantaneous.

**3. Install dependencies**
```bash
yarn install
```

**4. Configure and build the project**
```bash
yarn run configure
```

> **Tip:** If you only work on TypeScript packages and do not need Go, Rust, or
> Java, use the lighter Node-only shell instead: `nix develop .#node`

### MacOS

_Unless explicitly stated otherwise, each bullet will apply to both Intel and ARM Macs. In bullets where there is a difference in the installation process it will be noted._
* Git
  * https://github.com/git-guides/install-git#install-git-on-mac
* NodeJS v20.20.0, npm v10.8.2 (we recommend using the Node Version Manager (nvm) if available for your OS)
  * [Download nvm using script](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script)
    * _See the Section "Macs with Apple Silicon Chips" under [macOS Troubleshooting](https://github.com/nvm-sh/nvm?tab=readme-ov-file#macos-troubleshooting) for ARM Mac specific instructions_
  * [Download nvm using homebrew](https://sukiphan.medium.com/how-to-install-nvm-node-version-manager-on-macos-d9fe432cc7db)
  * Using nvm install and use specific version of node: 
    ```
    nvm install 20.20.0
    nvm use 20.20.0
    ```
* Yarn
  * `npm run enable-corepack` (from within the project directory)
* [Docker Engine is available on Mac OS through Docker Engine](https://docs.docker.com/desktop/install/mac-install/). 
  * _See the difference in system requirements for Docker Desktop for Intel and ARM Macs under System Requirements on the page above._
* Docker Compose
  * Installing Docker Desktop on Mac will include Docker Compose 
* OpenJDK (Corda support Java 8 JDK but do not currently support Java 9 or higher)
  * [Follow instructions for Mac here](https://github.com/supertokens/supertokens-core/wiki/Installing-OpenJDK-for-Mac-and-Linux)
* Go
  * [Installing Go for Mac](https://go.dev/dl/)
    * _Under featured downloads on the page above choose between the ARM64 or x86-64 option based on your machine._
  * [Adding Environment Variable and Go extensions](https://code.visualstudio.com/docs/languages/go)
* Foundry (required for SATP Hermes smart contract compilation)
  * Install Foundry:
    ```sh
    curl -L https://foundry.paradigm.xyz | bash
    ```
  * Restart your terminal or run `source ~/.zshrc`, then:
    ```sh
    foundryup
    ```
  * Verify installation:
    ```sh
    forge --version
    ```

### Linux

**Tested on Ubuntu 22.04 LTS**

* Base prerequisites (install these first, they're used by later `curl`-based installers)
  * `sudo apt-get update && sudo apt-get install -y git curl ca-certificates build-essential python3`
* NodeJS v20.20.0, npm v10.8.2 (we recommend using the Node Version Manager (nvm))
  * Install nvm:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    source ~/.bashrc
    ```
  * Install and use the required Node version:
    ```bash
    nvm install 20.20.0
    nvm use 20.20.0
    ```
* Yarn
  * `npm run enable-corepack` (from within the project directory)
* [Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
  * Post-install — allow running without sudo:
    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```
* Docker Compose
  * Included with Docker Engine on modern installations. Verify with:
    ```bash
    docker compose version
    ```
* OpenJDK (Corda support requires Java 8 JDK)
  * `sudo apt-get install -y openjdk-8-jdk`
  * Note: `openjdk-8-jdk` is not available from the default Ubuntu 24.04
    repositories. On 24.04 you'll need a supported external distribution
    (e.g. Temurin 8 from Adoptium) — see
    [Adoptium install guide](https://adoptium.net/installation/linux/).
* Go (**requires Go >= 1.20**; parts of this repo such as `weaver/common/protos-go` will fail to build with older toolchains)
  * We recommend installing from the official Go downloads page:
    [go.dev/dl](https://go.dev/dl/). The `golang-go` package on Ubuntu 22.04
    ships an older toolchain (1.18) and is not sufficient on its own.
* Foundry (required for SATP Hermes smart contract compilation)
  * Install Foundry:
    ```bash
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
    ```
  * Verify installation:
    ```bash
    forge --version
    ```

### Windows

We recommend using WSL2 (Windows Subsystem for Linux) with Ubuntu 22.04.

* Install WSL2
  * Open PowerShell as Administrator:
    ```powershell
    wsl --install -d Ubuntu-22.04
    ```
  * Restart your machine, then open Ubuntu from the Start menu

* [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
  * Enable WSL2 integration: Docker Desktop → Settings → Resources → WSL Integration
  * If you encounter socket permission errors inside WSL2, add your user to
    the `docker` group instead of loosening the socket permissions (do
    **not** `chmod 666 /var/run/docker.sock` — that grants root-equivalent
    access to any local process):
    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```

* Then follow the [Linux](#linux) instructions above inside your WSL2 terminal

### Random Windows specific issues not covered here

We recommend that you use WSL2 or any Linux VM (or bare metal).
We test most frequently on Ubuntu 22.04 LTS

### Configure Cacti 

* Clone the repository

```sh
git clone https://github.com/hyperledger-cacti/cacti.git
```


Windows specific gotcha: `File paths too long` error when cloning. To fix:
Open PowerShell with administrative rights and then run the following:

```sh
git config --system core.longpaths true
```

* Change directories to the project root

```sh
cd cacti
```

* Run this command to enable corepack (Corepack is included by default with all Node.js installs, but is currently opt-in.)

```sh
npm run enable-corepack
```

* Run the initial configuration script (can take a long time, 10+ minutes on a low-spec laptop)

```sh
yarn run configure
```

At this point you should have all packages built for development.

You can start making your changes (use your own fork and a feature branch)
or just run existing tests and debug them to see how things fit together.

For example you can *run a ledger single status endpoint test* via the
REST API with this command:

```sh
npx tap --ts --timeout=600 packages/cactus-test-plugin-htlc-eth-besu/src/test/typescript/integration/plugin-htlc-eth-besu/get-single-status-endpoint.test.ts
```

*You can also start the API server* and verify more complex scenarios with an
arbitrary list of plugins loaded into Cactus. This is useful for when you intend
to develop your plugin either as a Cactus maintained plugin or one on your own.

```sh
npm run generate-api-server-config
```

Notice how this task created a .config.json file in the project root with an
example configuration that can be used a good starting point for you to make
changes to it specific to your needs or wants.

The most interesting part of the `.config.json` file is the plugins array which
takes a list of plugin package names and their options (which can be anything
that you can fit into a generic JSON object).

Notice that to include a plugin, all you need is specify it's npm package name.
This is important since it allows you to have your own plugins in their respective,
independent Github repositories and npm packages where you do not have to seek
explicit approval from the Cactus maintainers to create/maintain your plugin at all.

Once you are satisfied with the `.config.json` file's contents you can just:

```sh
npm run start:api-server
```

After starting the API server, you will see in the logs that plugins were loaded
and that the API is reachable on the port you specified (4000 by default). The Web UI (Cockpit)
is disabled by default but can be enabled by changing the property value 'cockpitEnabled'
to true and it is reachable through port on the port your config
specified (3000 by default).

> You may need to enable manually the CORS patterns in the configuration file.
This may be slightly inconvenient, but something we are unable to compromise on
despite valuing developer experience very much. We have decided that the
software should be `secure by default` above all else and allow for
customization/degradation of security as an opt-in feature rather than starting
from that state.

At this point, with the running API server, you can
* Test the REST API directly with tools like cURL or Postman
* Develop your own applications against it with the `Cactus API Client(s)`
* Create and test your own plugins

## Build Script Decision Tree

The `npm run watch` script should cover 99% of the cases when it comes to working
on Cactus code and having it recompile, but for that last 1% you'll need to
get your hands dirty with the rest of the build scripts. Usually this is only
needed when you are adding new dependencies (npm packages) as part of something
that you are implementing.

There are a lot of different build scripts in Cactus in order to provide contributors
fine(r) grained control over what parts of the framework they wish build.

> Q: Why the complexity of so many build scripts?
>
> A: We could just keep it simple with a single build script that builds everything
always, but that would be a nightmare to wait for after having changed a single
line of code for example.

To figure out which script could work for rebuilding Cactus, please follow
the following decision tree (and keep in mind that we have `npm run watch` too)

![Build Script Decision Tree][build-decision-tree]

## Running CI Checks Locally Before Pushing

Before opening a pull request, you should run the same checks that CI will run.
This helps catch issues early and speeds up the review process.

### Quick Checklist

```sh
# 1. Build the project
yarn run configure

# 2. Run linting
yarn run lint

# 3. Run all tests (unit + integration)
yarn run test:jest:all

# 4. Run the full CI script (Linux/macOS/WSL only)
./tools/ci.sh
```

### Individual Steps

| Check | Command | Notes |
|-------|---------|-------|
| TypeScript compilation | `yarn tsc` | Compiles all packages |
| ESLint | `yarn run format:eslint` | Lints JS/TS files |
| Prettier | `yarn run format:prettier` | Formats code |
| Spell check | `yarn run spellcheck` | Checks spelling in source |
| Jest tests | `yarn run test:jest:all` | Runs all Jest test suites |
| Single test file | `yarn jest path/to/test.test.ts` | Run one specific test |

### Docker Tests

Most integration suites start and stop their own Docker containers
(all-in-one ledgers, databases, gateways) directly from the test code, so
there is no compose file or pre-provisioning to do. They only require:

1. A running Docker engine (Docker Desktop or Docker Engine).
2. `yarn configure` to have completed at least once, because test suites
   import built code from sibling workspace packages.

Suites pull any missing container images themselves, so first runs take
longer while images download.

Example — the SATP Hermes gateway docker suites in
`packages/cactus-plugin-satp-hermes`:

```sh
# Build the gateway image from the current branch (needed once, and again
# whenever the gateway source changes)
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes docker:build:local

# Full oracle / E2E transfer scenarios, against the locally built image
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:integration:docker-local

# Quick acceptance check against the pre-published upstream gateway image
yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes test:integration:docker-upstream
```

#### One-command deployment verification

`docker:verify` chains the three steps above — image build, then the
local-image suites, then the upstream-image acceptance check — fail-fast,
in order, timing each phase and printing a summary table. One command proves
the gateway is deploy-ready:

```sh
corepack yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes docker:verify
```

What each phase proves:

1. `docker:build:local` — the gateway image still builds from the current
   branch (bundle + `docker build`).
2. `test:integration:docker-local` — the full oracle / E2E transfer scenarios
   run green against that freshly built image.
3. `test:integration:docker-upstream` — the gateway interoperates with the
   pre-published upstream image (quick acceptance check).

For iteration, phases that already passed can be skipped, and the exact
chain can be previewed without running anything:

```sh
cd packages/cactus-plugin-satp-hermes

# Image already built from a previous pass; re-run only the two suites
node docker-verify.mjs --skip-build

# Print the command chain, run nothing
node docker-verify.mjs --dry-run
```

Available flags: `--dry-run`, `--skip-build`, `--skip-local`,
`--skip-upstream`, `--help`. Unknown flags are rejected with exit code 2;
a failing phase stops the chain and the process exits with that phase's
exit code.

The pipeline wiring itself is guarded by unit tests that run in the standard
unit suite (no docker needed): `docker-verify-pipeline.test.ts` asserts the
script exists, that every phase command resolves to a real package.json
script, that the dry-run output keeps listing the three commands in order
and that flags are validated. The drift-guard tests in
`docker-config-integrity.test.ts` and `ci-config-drift.test.ts` pin the
split jest configs and the CI image pre-pulls on top of that.

To run a single suite file, invoke Jest from the package directory:

```sh
cd packages/cactus-plugin-satp-hermes
NODE_OPTIONS=--max-old-space-size=4096 npx jest \
  src/test/typescript/integration/docker-local/satp-e2e-transfer-dockerization.test.ts \
  --runInBand --forceExit --config=jest.config-integration-docker-local.ts
```

What to expect:

- Gateway containers publish fixed host ports `3010`, `3011` and `4010`;
  free those ports before running. Ledger and database containers use
  auto-assigned host ports and rarely conflict.
- JUnit XML reports are written to
  `packages/cactus-plugin-satp-hermes/reports/junit/`, and the gateway
  configuration/log files mounted into the containers are written to
  `packages/cactus-plugin-satp-hermes/cache/`
  (git-ignored).
- Interrupted runs can leave containers behind; check `docker ps` and remove
  leftovers before re-running.

See the
[package README](./packages/cactus-plugin-satp-hermes/README.md#running-the-integrationdocker-tests-locally)
for the full step-by-step guide and common failure modes.

> **Tip:** If you are only modifying documentation or configuration files, you can
> skip the Docker tests. CI will run them automatically on your PR.

## Configuring SSH to use upterm
Upload your public key onto github if not done so already. A public key is necessary to join the ssh connection to use upterm. For a comprehensive guide, see the [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

Locate the `ci.yml` within `.github/workflows` and add to the `ci.yml` code listed below:
  - name: Setup upterm session
    uses: lhotari/action-upterm@v1
    with:
      repo-token: ${{ secrets.GITHUB_TOKEN }}

Keep in mind that the SSH upterm session should come after the checkout step (uses: actions/checkout@v4.1.1) to ensure that the CI doesn't hang without before the debugging step occurs. Editing the `ci.yml` will create a new upterm session within `.github/workflows` by adding a new build step. For more details, see the [Debug with SSH action](https://github.com/marketplace/actions/debug-with-ssh).

By creating a PR for the edited `ci.yml` file, this will allow the CI to run their tests. There are two ways to navigate to CIs.
  1) Go to the PR and click the `checks` tab
  2) Go to the `Actions` tab within the main Hyperledger Cactus Repository

Click on the `CI Cactus workflow`. The new job you created should be listed underneath the `build (ubuntu-22.04)` jobs. Click on the new job (the name you gave your build) and locate the SSH Session within the `Setup Upterm Session` dropdown. Copy the SSH command that starts with `ssh` and ends in `.dev` (ex. ssh **********:***********@uptermd.upterm.dev). Open your terminal and paste the SSH command to begin an upterm session.
<!-- --8<-- [end:content] -->

<!--
=============================================================================
GITHUB REFERENCE LINKS
These links are used when viewing this file directly on GitHub.
When this file is rendered via MkDocs (through a snippet wrapper), the
wrapper file provides its own set of reference links that override these.
=============================================================================
-->

[build-fast-developer-flow]: #fast-developer-flow--code-iterations
[build-watch-demo]: ./docs/docs/cactus/_images/hyperledger-cactus-watch-script-tutorial-2021-03-06.gif
[build-nix-setup]: ./docs/docs/guides/nix-setup.md
[build-decision-tree]: ./docs/docs/cactus/_images/build-script-decision-tree-2021-03-06.png
