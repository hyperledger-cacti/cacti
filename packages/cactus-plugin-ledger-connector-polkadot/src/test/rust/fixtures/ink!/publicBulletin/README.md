The smart contract needs to be built in order for the tests that interact with it to pass.

## Table of Contents<!-- omit in toc -->

- [Pre-build](#pre-build)
- [Build](#build)
- [Test](#test)

## Pre-build
cargo rustup update

## Build
```sh
cargo +nightly contract build
```

## Test

```sh
cargo +nightly test
```
