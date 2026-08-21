# Simple Asset and Interoperation Fabric Sample

## Overview

This Fabric chaincode sample combines bond and token asset operations with Weaver interoperation and asset-exchange support.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

Install the Go version declared in [`go.mod`](./go.mod), then run `go mod download`.

## API Summary

The chaincode entry point is [`main.go`](./main.go). Asset and interoperability behavior is implemented by the source files in this directory and the Weaver asset-exchange library.

## Usage

Build against published dependencies with `make build`, or use `make build-local` to resolve Weaver dependencies from this repository.

## Testing

Run `make test` for published dependencies or `make test-local` for the local Weaver modules.
