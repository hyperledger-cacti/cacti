# Fabric Go CLI Sample

## Overview

This module provides the Go command-line client used by the Weaver Fabric samples. It exercises Fabric network configuration, chaincode operations, data sharing, asset transfer, and asset exchange flows.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

Install the Go version declared in [`go.mod`](./go.mod), then download module dependencies:

```sh
go mod download
```

## Configuration

Copy [`.env.template`](./.env.template) to an untracked environment file and configure the target Fabric and Weaver services.

## API Summary

The module is a Cobra command-line application. Commands are implemented under [`cmd/`](./cmd/) and the entry point is [`fabric-cli.go`](./fabric-cli.go).

## Usage

Build the CLI with:

```sh
make build
./bin/fabric-cli --help
```

Use `make build-local` when developing against the Weaver modules in this repository.

## Testing

```sh
go test ./...
```
