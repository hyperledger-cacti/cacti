# SATP Simple Asset Fabric Sample

## Overview

This Fabric chaincode sample implements bond and token assets used by SATP-oriented Weaver demonstrations and tests.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

Install the Go version declared in [`go.mod`](./go.mod), then run `go mod download`.

## API Summary

The chaincode entry point is [`main.go`](./main.go). Asset operations are implemented by the bond, token, and asset-management source files in this directory.

## Usage

Build against published dependencies with `make build`, or use `make build-local` to resolve Weaver dependencies from this repository.

## Testing

Run `make test` for published dependencies or `make test-local` for the local Weaver modules.
