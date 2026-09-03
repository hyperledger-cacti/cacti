# `@hyperledger-cacti/cacti-ledger-browser`

## Overview

This package provides the React-based Cacti Ledger Browser for visualizing ledger data exposed through Cacti services.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cacti-ledger-browser
```

## API Summary

The package is a browser application rather than a reusable plugin API. Its source is organized under [`src/`][package-doc-src], with runtime configuration supplied when the application is built and deployed.

This component allows viewing ledger data in Supabase or other PostgreSQL compatible database. The data is fed to supabase by persistence plugins for each ledgers.

## Summary

- [`@hyperledger/cacti-ledger-browser`](#hyperledgercacti-gui-tx-viewer)
  - [Summary](#summary)
  - [Remarks](#remarks)
  - [Getting Started](#getting-started)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Remarks

- Plugin requires running Supabase or other database and persistence plugins in order to properly view ledger data.
- Currently, fabric and ethereum based ledgers are supported.

## Getting Started

Clone the git repository on your local machine.

See [docs/docs/cactus/ledger-browser/setup.md][package-doc-docs-docs-cactus-ledger-browser-setup-md] for detailed information on how to setup and use this package.

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md][package-doc-contributing-md] to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE][package-doc-license] file.

## Acknowledgments

## Usage

Configure the application for the target Cacti API and run it through the monorepo development workflow described below.

## Testing

From the repository root, run:

```sh
yarn test:jest:all packages/cacti-ledger-browser/src/test
```

[package-doc-src]: ./src/
[package-doc-docs-docs-cactus-ledger-browser-setup-md]: ../../docs/docs/cactus/ledger-browser/setup.md
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
