# `@hyperledger/cactus-plugin-keychain-memory-wasm` <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [1. Summary](#1-summary)
- [Usage](#usage)

## Summary

Dummy keychain implementation doing NO encryption and storing everything in-memory. Only suitable for development and testing. Same as the non-wasm version but this one has the backing implementation written in Rust and compiled down to WebAssembly.

> **Do not use this in production. It does not encrypt the stored data at all. It stores everything in plain text!**
## Usage

Can be used the same way as the non-WASM implementation in the package: `@hyperledger/cactus-plugin-keychain-memory`
The only difference is that this one is backed by code written in Rust that is compiled down to WebAssembly modules to be loaded instead of the usual TS->JS transpilation process.
