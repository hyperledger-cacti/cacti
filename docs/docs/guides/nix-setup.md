# Nix Development Environment

This guide explains how to set up and use the reproducible development
environment provided by [Nix](https://nixos.org/) for the Hyperledger Cacti
monorepo.

## Why Nix?

The Cacti monorepo is a polyglot project requiring Node.js, Go, Rust,
Java/Kotlin, Protobuf, and several system level build tools. Installing and
maintaining the correct versions of all of these toolchains manually is
time consuming and error-prone.

The repository's Nix flake provides development shells selected by
`flake.lock`, reducing the need to install each toolchain manually. The
flake defines shells for Linux and macOS; Windows users run Nix inside
WSL 2. Platform support in the flake is not a guarantee that every package
build has been tested on every platform.

For a walkthrough covering environment setup, a package build, and unit
tests, see the [development environment quickstart](development-environment/README.md).

## Prerequisites

### 1. Install Nix

If you do not already have Nix installed, run the official installer:

```bash
curl -L https://nixos.org/nix/install | sh
```

Follow any on screen instructions (e.g., sourcing a shell profile or
restarting your terminal). Nix supports Linux, macOS, and
[WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) on Windows.

### 2. Enable Flakes

Cacti uses [Nix Flakes](https://wiki.nixos.org/wiki/Flakes), which must be
explicitly enabled. Add the following line to `~/.config/nix/nix.conf`
(create the file if it does not exist):

```text
experimental-features = nix-command flakes
```

> **Tip:** On multi-user Nix installations (the default on macOS), edit
> `/etc/nix/nix.conf` instead and restart the Nix daemon:
> `sudo systemctl restart nix-daemon` (Linux) or
> `sudo launchctl kickstart -k system/org.nixos.nix-daemon` (macOS).

## Entering the Development Shell

Clone the repository (if you have not already) and enter the development
shell:

```bash
git clone https://github.com/hyperledger-cacti/cacti.git
cd cacti
nix develop
```

The first invocation downloads and caches all required dependencies. This
may take a few minutes depending on your connection speed. Subsequent
invocations are near instantaneous because everything is cached locally.

Once inside the shell, a welcome banner reports the selected tool versions.
Check the active runtime and package manager with:

```bash
node --version
yarn --version
```

## Building the Project

On a fresh checkout, install dependencies explicitly before invoking the
configure script:

```bash
yarn install
yarn run configure
```

The configure script installs dependencies and Git hooks, compiles the
TypeScript backend, and runs its postbuild scripts. It does not run every
frontend, Solidity, or Weaver build. The initial `yarn install` creates the
installation state needed to start Yarn scripts with the configured linker.

> **Note:** Yarn 4.x is activated automatically via
> [Corepack](https://nodejs.org/api/corepack.html) in the shell hook. You do
> not need to install Yarn globally.

## Available Shells

The `flake.nix` provides two development shells to accommodate different
contributor workflows:

| Shell | Command | Included toolchains |
|-------|---------|---------------------|
| **Default** | `nix develop` | Node.js, Go, Rust, JDK 17, Gradle, Maven, Protobuf, Foundry, and system build tools |
| **Node-only** | `nix develop .#node` | Node.js and system build tools (gcc, make, python3) |

If you are only working on TypeScript or frontend packages and do not need
Go, Rust, or Java, the lighter `node` shell saves download time and disk
space:

```bash
nix develop .#node
```

## Exiting the Shell

To return to your regular system shell, type `exit` or press `Ctrl+D`.

## Troubleshooting

### Docker

The Nix shell provides development toolchains only. It does **not** manage
Docker. If you need Docker for integration tests, ensure the Docker daemon
is running on your host system before entering the Nix shell.

On Linux:
```bash
sudo systemctl start docker
```

On macOS or Windows: start Docker Desktop.

### macOS: Missing SDK Headers

On macOS, some native npm modules may fail to compile if the Xcode Command
Line Tools are not installed. Run:

```bash
xcode-select --install
```

### WSL2: Systemd

If you are using WSL2, ensure that
[systemd is enabled](https://learn.microsoft.com/en-us/windows/wsl/systemd)
in your distribution so that the Nix daemon can start automatically.

### Slow First Build

The first `nix develop` invocation downloads several hundred megabytes of
toolchains. This is a one-time cost. If your network is slow, consider using
a wired connection or running the command overnight.
