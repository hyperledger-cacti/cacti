# Cacti Development Tools

> Collection of build scripts, CI utilities, custom validation checks, and Docker test ledger environments used across the Cacti monorepo.

## Overview
This directory contains various tooling essential for developing, building, and maintaining the Hyperledger Cacti monorepo. It includes continuous integration scripts, custom code quality checks, and pre-configured Docker environments for testing against different blockchain ledgers.

**Target Audience:**
- [x] Developers
- [ ] Operators

## Directory Index

- **CI & Build**: 
  - `ci.sh`: Main CI execution script.
  - `commit-type-lint.sh`: Validates commit message formats.
  - `lint-actions.sh`: Lints GitHub Actions workflows.
  - `release.sh`: Release management script.
- **Custom Checks**: Package validation suite. See [Custom Checks](./custom-checks/README.md).
- **Docker Test Ledgers**: Pre-configured blockchain test environments. See [Docker](./docker/).
- **Security**: 
  - `supply-chain-attack-*`: Audit and scan scripts for dependencies.
- **Monorepo Utilities**: 
  - `sort-package-json.ts`, `sync-npm-deps-to-tsc-projects.ts`, `bump-openapi-spec-dep-versions.ts`: Utilities for maintaining monorepo consistency.
