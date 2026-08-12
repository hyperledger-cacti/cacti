# Cacti Custom Checks

> Monorepo integrity validation suite that runs as part of CI.

## Overview
This directory contains custom validation scripts that enforce consistency and integrity across the Cacti monorepo. These checks ensure that package files are sorted correctly, dependencies are consistent, and API specifications are valid.

**Target Audience:**
- [x] Developers
- [ ] Operators

## How to Run
You can run the full suite of custom checks from the root directory using:
```bash
yarn custom-checks
```

## Available Checks

- `check-package-json-sort.ts`: Ensures `package.json` files are consistently sorted.
- `check-package-json-fields.ts`: Validates required fields and their values in `package.json` files.
- `check-dependency-version-consistency.ts`: Checks that dependency versions match across the monorepo.
- `check-sibling-dep-version-consistency.ts`: Ensures consistent versions for sibling dependencies.
- `check-missing-node-deps.ts`: Identifies missing Node.js dependencies in packages.
- `check-open-api-json-specs.ts`: Validates OpenAPI specification files.
- `run-attw-on-tgz.ts`: Runs "Are the Types Wrong?" checks on generated tarballs.
