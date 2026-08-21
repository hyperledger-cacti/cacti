# Fabric Interoperation Chaincode Test Utilities

## Overview

This Go module provides shared setup and mock utilities for Fabric interoperation chaincode tests.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

The module is consumed by the Weaver Fabric chaincode modules through its Go module path. For repository development, use the local `replace` directives defined by the consuming module's Makefile.

## API Summary

The maintained test helpers are implemented in [`setup.go`](./setup.go).

## Usage

Import the module from Fabric chaincode tests that require the shared mock setup.

## Testing

```sh
go test ./...
```
