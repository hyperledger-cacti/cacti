# Contributing to SATP Hermes

Thank you for your interest in contributing to the SATP (Secure Asset Transfer Protocol) Hermes plugin! :tada:

This document provides package-specific contribution guidelines. For general Hyperledger Cacti contribution guidelines, please refer to the [main CONTRIBUTING.md](../../CONTRIBUTING.md).

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Package Structure](#package-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Documentation](#documentation)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## Overview

The SATP Hermes plugin implements the IETF Secure Asset Transfer Protocol for cross-chain asset transfers. The plugin follows the gateway paradigm described in the [Hermes research paper](https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337).

Key areas for contribution:
- Protocol implementation (SATP stages 0-3)
- Ledger adapters (Fabric, Besu, Ethereum, etc.)
- Crash recovery mechanisms
- Gateway-to-Gateway communication
- Application-to-Gateway APIs
- Smart contract development (Solidity)
- Documentation and examples

## Getting Started

### Prerequisites

1. **Node.js** (v18 or later) and **Yarn** (v3+)
2. **Docker** and **Docker Compose** for running test ledgers
3. **Foundry** for Solidity smart contract development:
   ```sh
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
4. **Protocol Buffers** compiler (`buf`) for gRPC code generation

### Initial Setup

From the **repository root**:
```sh
# Install dependencies
yarn run configure

# Build the entire project
yarn build

# Or build just this package
yarn workspace @hyperledger/cactus-plugin-satp-hermes build
```

## Development Setup

### Database Setup

The plugin uses SQLite (development) or PostgreSQL (production) for session storage:

```sh
# Start development database (Docker)
yarn workspace @hyperledger/cactus-plugin-satp-hermes db:start

# Run migrations
yarn workspace @hyperledger/cactus-plugin-satp-hermes db:migrate

# Seed test data (optional)
yarn workspace @hyperledger/cactus-plugin-satp-hermes db:seed

# Full reset
yarn workspace @hyperledger/cactus-plugin-satp-hermes db:reset
```

### Code Generation

The package uses code generation for:
- **OpenAPI SDK** (TypeScript client from OpenAPI spec)
- **Protocol Buffers** (gRPC/Connect services)
- **Solidity ABIs** (smart contract interfaces)

```sh
# Run all code generation
yarn workspace @hyperledger/cactus-plugin-satp-hermes codegen

# Individual generators
yarn workspace @hyperledger/cactus-plugin-satp-hermes codegen:openapi
yarn workspace @hyperledger/cactus-plugin-satp-hermes codegen:proto
yarn workspace @hyperledger/cactus-plugin-satp-hermes codegen:abi
```

## Package Structure

```
cacti-plugin-satp-hermes/
├── src/
│   ├── main/
│   │   ├── typescript/        # Main TypeScript source code
│   │   │   ├── gateway/       # Gateway implementation
│   │   │   ├── core/          # Core protocol logic
│   │   │   ├── services/      # Service layer
│   │   │   ├── adapters/      # Ledger adapters
│   │   │   └── generated/     # Generated code (do not edit)
│   │   ├── solidity/          # Smart contracts
│   │   │   ├── contracts/     # Main contracts
│   │   │   └── generated/     # Generated ABIs
│   │   └── yml/               # OpenAPI specifications
│   │       └── bol/           # Bill of Lading API
│   ├── test/
│   │   ├── typescript/
│   │   │   ├── unit/          # Unit tests
│   │   │   └── integration/   # Integration tests
│   │   ├── solidity/          # Solidity tests (Foundry)
│   │   └── cucumber/          # BDD feature tests
│   ├── knex/                  # Database migrations and seeds
│   └── examples/              # Example configurations
├── docs/
│   └── diagrams/              # Mermaid diagram sources
├── assets/
│   └── diagrams/              # Generated diagram images
├── jest.config-unit.ts        # Unit test configuration
├── jest.config-integration.ts # Integration test configuration
├── buf.yaml                   # Protocol Buffers configuration
├── foundry.toml               # Foundry (Solidity) configuration
└── typedoc.json               # Documentation configuration
```

## Development Workflow

### Building

```sh
# Full build (includes codegen)
yarn workspace @hyperledger/cactus-plugin-satp-hermes build

# TypeScript compilation only
yarn workspace @hyperledger/cactus-plugin-satp-hermes tsc

# Watch mode for development
yarn workspace @hyperledger/cactus-plugin-satp-hermes watch
```

### Linting and Formatting

```sh
# Run all linters
yarn workspace @hyperledger/cactus-plugin-satp-hermes lint

# Format code
yarn workspace @hyperledger/cactus-plugin-satp-hermes lint-code

# Lint OpenAPI spec
yarn workspace @hyperledger/cactus-plugin-satp-hermes lint:oapi

# Lint Protocol Buffers
yarn workspace @hyperledger/cactus-plugin-satp-hermes lint:protobuf
```

### Running the Gateway

```sh
# Start a local gateway instance
yarn workspace @hyperledger/cactus-plugin-satp-hermes start-gateway

# With Docker
yarn workspace @hyperledger/cactus-plugin-satp-hermes docker:build:dev
yarn workspace @hyperledger/cactus-plugin-satp-hermes docker:run:dev
```

## Testing

### Test Categories

| Category | Command | Description |
|----------|---------|-------------|
| Unit | `test:unit` | Fast, isolated tests |
| Integration | `test:integration` | Full system tests with Docker |
| Adapter | `test:integration:adapter` | Ledger adapter tests |
| Bridge | `test:integration:bridge` | Cross-chain bridge tests |
| Gateway | `test:integration:gateway` | Gateway communication tests |
| Recovery | `test:integration:recovery` | Crash recovery tests |
| Rollback | `test:integration:rollback` | Transaction rollback tests |
| Solidity | `forge:test` | Smart contract tests |

### Running Tests

```sh
# All tests
yarn workspace @hyperledger/cactus-plugin-satp-hermes test

# Unit tests only
yarn workspace @hyperledger/cactus-plugin-satp-hermes test:unit

# All integration tests
yarn workspace @hyperledger/cactus-plugin-satp-hermes test:integration

# Specific integration test categories
yarn workspace @hyperledger/cactus-plugin-satp-hermes test:integration:gateway
yarn workspace @hyperledger/cactus-plugin-satp-hermes test:integration:bridge
yarn workspace @hyperledger/cactus-plugin-satp-hermes test:integration:recovery

# Solidity tests
yarn workspace @hyperledger/cactus-plugin-satp-hermes forge:test
```

### Writing Tests

- **Unit tests**: Place in `src/test/typescript/unit/`
- **Integration tests**: Place in `src/test/typescript/integration/`
- **Solidity tests**: Place in `src/test/solidity/`

Follow the [Test Case Core Principles](../../CONTRIBUTING.md#test-case-core-principles) from the main CONTRIBUTING.md.

## Documentation

### Generating Documentation

```sh
# Generate TypeDoc documentation
yarn workspace @hyperledger/cactus-plugin-satp-hermes docs:build

# Serve documentation locally
yarn workspace @hyperledger/cactus-plugin-satp-hermes docs:serve

# Generate architecture diagrams
yarn workspace @hyperledger/cactus-plugin-satp-hermes docs:diagrams
```

### Diagram Guidelines

- Use **Mermaid** for all diagrams
- Place diagram sources in `docs/diagrams/` as `.mmd` files
- Generated images go to `assets/diagrams/`

## Code Style

### TypeScript

- Follow the project-wide ESLint and Prettier configurations
- Use strict TypeScript with proper type annotations
- Document public APIs with JSDoc comments

### Solidity

- Follow Foundry conventions
- Use NatSpec comments for contract documentation
- Test contracts thoroughly with Foundry tests

### Protocol Buffers

- Follow the `buf` linting rules defined in `buf.yaml`
- Use clear, descriptive message and field names

## Submitting Changes

1. **Fork** the repository and create a feature branch
2. **Implement** your changes following the guidelines above
3. **Test** your changes:
   - Run unit tests: `yarn workspace @hyperledger/cactus-plugin-satp-hermes test:unit`
   - Run relevant integration tests
   - Add new tests for new functionality
4. **Lint** your code: `yarn workspace @hyperledger/cactus-plugin-satp-hermes lint`
5. **Commit** with a [Conventional Commits](https://www.conventionalcommits.org/) message:
   ```
   feat(satp-hermes): add new ledger adapter for XYZ
   ```
6. **Push** and open a Pull Request

### PR Checklist

- [ ] Tests pass locally (`test:unit` and relevant `test:integration:*`)
- [ ] Code is linted (`lint`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow Conventional Commits
- [ ] PR description explains the changes

## Getting Help

- **Discord**: [Hyperledger Cacti Channel](https://discord.com/channels/905194001349627914/908379338716631050)
- **GitHub Issues**: [Create an issue](https://github.com/hyperledger-cacti/cacti/issues/new)
- **Documentation**: [Cacti Docs](https://hyperledger-cacti.github.io/cacti/)

## Maintainers

See the [package.json](./package.json) contributors section for the list of maintainers.

---

Thank you for contributing to SATP Hermes! Your contributions help make cross-chain interoperability a reality.
