# `@hyperledger-cacti/cacti-copm-test`

## Overview

Test framework for testing the COPM distributed ledger-specific plugins.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

```sh
npm install --save-dev @hyperledger-cacti/cacti-copm-test
```

## Configuration

Ledger-specific test support implements the `TestAssets` and `CopmTester`
interfaces exported by this package. The tester factory selects the
implementation for each supported network type.

## API Summary

The package exports:

- `WeaverInteropConfiguration` for Weaver interoperability settings
- `TestAssets` for issuing and inspecting test assets
- `CopmTester` for creating a ledger-specific COPM test environment and client

## Usage

## Development

To add testing for a new distributed ledger, implement the interfaces defined in src/main/typescript/interfaces
  
  - TestAssets:
    - provides methods for 
      - issueing bonds and tokens
      - checking the owner of a bond
      - checking the token balance
  - CopmTester:
    - manages instantiating the ledger-specific plugin
    - defines the parties in a test network (partyA and partyB)
    - for a party in a network:
      - returns the test-assets implementation 
      - returns the gprc client 

The CopmTester for a new network type should be returned by the copm-tester-factory function.

## Test Components and Networks

The Makefile in this directory provides targets for building test network components.  Some setup is shared between networks.

Makefile_\<ledger_type\> will build a docker weaver network of the given network type with the following commands:

- make setup
  - build all weaver components
- make pledge-network
  - makes a network for running pledge/claim (asset transfer)
- make lock-network
  - makes a network for running lock/claim (asset exchange)
  
The asset exchanges and asset transfer network modes are currently mutually exclusive.

## Testing

The package defines separate integration-test commands for each COPM operation:

```sh
yarn workspace @hyperledger-cacti/cacti-copm-test test:view
yarn workspace @hyperledger-cacti/cacti-copm-test test:pledge
yarn workspace @hyperledger-cacti/cacti-copm-test test:lock
```

These tests require their corresponding ledger and Weaver test-network
components.

## Contributing

See [CONTRIBUTING.md][package-doc-contributing-md] for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE][package-doc-license] file.

[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
