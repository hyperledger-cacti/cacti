# Hyperledger Cacti — Repository Conventions

This document captures the key conventions, patterns, and structural decisions
of the Hyperledger Cacti monorepo. It is intended as a single source of truth
for AI agents, skills, and contributors who need to understand how the project
is organized and how code should be written.

For full contributor workflow details, see [CONTRIBUTING.md](./CONTRIBUTING.md).
For build setup, see [BUILD.md](./BUILD.md).

---

## 1. Repository Identity

- **Name**: Hyperledger Cacti (package scope `@hyperledger/`)
- **License**: Apache-2.0
- **Language**: TypeScript (back-end and front-end)
- **Runtime**: Node.js v20.20.0+
- **Package manager**: Yarn 4 (Corepack-managed, `yarn@4.3.1`)
- **Monorepo tool**: Lerna (npm client: yarn, workspaces enabled)
- **Current version**: 2.1.0

---

## 2. Directory Structure

```
/
├── packages/          # Core packages and plugins (monorepo workspaces)
├── examples/          # Example applications and demos
├── extensions/        # Optional extensions and plugins
├── tools/             # Build and CI/CD tooling, custom checks
├── weaver/            # Weaver interoperability framework
├── docs/              # MkDocs-based project documentation
├── whitepaper/        # Project whitepaper
├── build/             # Build artifacts (generated)
└── .github/           # GitHub workflows, issue templates, settings
```

### Workspace Glob Patterns

Defined in the root `package.json` and `lerna.json`:

- `packages/cactus-*`
- `packages/cacti-*`
- `examples/cactus-*` / `examples/cacti-*`
- `extensions/cactus-*` / `extensions/cacti-*`
- `weaver/common/protos-js`
- `weaver/sdks/fabric/interoperation-node-sdk`
- `weaver/sdks/besu/node`
- `weaver/core/drivers/fabric-driver`
- `weaver/core/identity-management/iin-agent`
- `weaver/samples/fabric/fabric-cli`
- `weaver/samples/besu/besu-cli`
- `weaver/samples/besu/simpleasset`
- `weaver/samples/besu/simplestate`

---

## 3. Package Naming Convention

| Prefix | Usage |
|--------|-------|
| `cacti-` | **New packages** (current standard) |
| `cactus-` | **Legacy packages** (still in use, do not rename) |

Pattern: `cacti-$PLUGIN_TYPE-$PLUGIN_FLAVOR`

Examples:
- `cacti-plugin-satp-hermes`
- `cacti-plugin-ledger-connector-stellar`
- `cacti-copm-core`

Test packages: `cacti-test-$PLUGIN_TYPE-$PLUGIN_FLAVOR`
(e.g., `cactus-test-plugin-htlc-eth-besu`)

npm scope: `@hyperledger/<package-name>`

---

## 4. Package Internal Structure

Every package follows this directory layout:

```
<package-name>/
├── package.json
├── tsconfig.json
├── CHANGELOG.md
├── README.md
├── src/
│   ├── main/
│   │   ├── typescript/       # Production source code
│   │   │   ├── public-api.ts # Public API barrel file
│   │   │   └── index.ts      # Entry point
│   │   ├── json/             # OpenAPI specs (openapi.json)
│   │   ├── solidity/         # Smart contracts (if applicable)
│   │   └── yml/              # OpenAPI YAML specs (if applicable)
│   └── test/
│       └── typescript/
│           ├── unit/          # Unit tests
│           └── integration/   # Integration tests
└── dist/                      # Generated output (not committed)
```

### Key Files

- **`public-api.ts`**: Every package has a `public-api.ts` barrel file at
  `src/main/typescript/public-api.ts`. This is the public API surface.
  Test types must NOT be exported from this file.
- **`index.ts`** / **`index.web.ts`**: Entry points for Node.js and browser
  environments respectively.
- **`tsconfig.json`**: Must extend `../../tsconfig.base.json` with composite
  compilation enabled.

### tsconfig.json Template

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist/lib/",
    "declarationDir": "dist/lib",
    "rootDir": "./src",
    "tsBuildInfoFile": "../../.build-cache/<package-name>.tsbuildinfo"
  },
  "include": ["./src"],
  "references": []
}
```

The package must also be registered in the root `tsconfig.json` references
array. Build order is sequential — more specialized packages go later.

---

## 5. TypeScript Conventions

### Compiler Settings (tsconfig.base.json)

- **Target**: ES2022
- **Module**: CommonJS
- **Module resolution**: Node
- **Strict mode**: Enabled
- **Declarations**: Generated (`.d.ts`)
- **Incremental**: Yes

### Code Style (Prettier)

- 2-space indent (no tabs)
- Semicolons always
- Double quotes
- Print width: 80
- Trailing commas: all

### Interface Naming

- Interfaces are prefixed with `I` (e.g., `ICactusPlugin`, `IPluginFactoryOptions`)
- Options interfaces named `I<Thing>Options`
- Type guards follow `isI<Thing>` pattern (e.g., `isICactusPlugin`)

### Plugin Architecture

The core plugin system is defined in `cactus-core-api`:

- `ICactusPlugin` / `ICactusPluginOptions` — base plugin interface
- `IPluginLedgerConnector` — ledger connector contract
- `IPluginWebService` — REST endpoint contract
- `IPluginGrpcService` — gRPC endpoint contract
- `IPluginCrpcService` — CRPC endpoint contract
- `IPluginKeychain` — keychain contract
- `IPluginObjectStore` — object store contract
- `PluginFactory` — factory pattern for creating plugins

### Generated Code

- OpenAPI specs live at `src/main/json/openapi.json`
- Generated TypeScript Axios clients go under
  `src/main/typescript/generated/openapi/typescript-axios/`
- Generated protobuf types go under
  `src/main/typescript/generated/proto/`
- Do NOT manually edit generated files
- The OpenAPI generator version is pinned at **6.6.0**

---

## 6. Build System

### Key Commands

| Command | Purpose |
|---------|---------|
| `yarn configure` | Install dependencies and build backend |
| `yarn build:dev:backend` | Compile TypeScript (tsc --build) |
| `yarn build` | Full build (dev + prod) |
| `yarn watch` | Auto-recompile on changes |
| `yarn codegen` | Regenerate all OpenAPI clients |
| `yarn tsc` | TypeScript compilation only |
| `yarn clean` | Remove dist and build cache |
| `yarn lint` | ESLint + Prettier + spellcheck |

### Build Pipeline

1. `yarn configure` → `yarn install` → `yarn build:dev:backend`
2. TypeScript compiled with `tsc --build --verbose`
3. Frontend built separately with Lerna + Webpack
4. OpenAPI codegen generates typed Axios clients from `openapi.json` specs

---

## 7. Testing Conventions

### Frameworks

- **Test runner**: Jest (migrating from node-tap)
- **Assertions**: jest-extended
- **BDD**: Cucumber (in some packages, e.g., satp-hermes)
- **Test timeout**: 60 minutes (global default)
- **Workers**: `maxWorkers: 1`, `maxConcurrency: 1` (root)

### Test File Patterns

```
**/cactus-*/src/test/typescript/{unit,integration,benchmark}/**/*.test.ts
**/cacti-*/src/test/typescript/{unit,integration,benchmark}/**/*.test.ts
```

### Per-Package Jest Config

Packages may define separate Jest configs for different test types:
- `jest.config-unit.ts` / `jest.config-unit.js`
- `jest.config-integration.ts` / `jest.config-integration.js`
- Additional variants (e.g., `jest.config-integration-docker.ts`)

### Core Principles

1. **Self-contained**: each test executable independently
2. **Not exported**: test types never appear in `public-api.ts`
3. **Single focus**: one test = one bug/feature verification
4. **Separated from main**: all tests live under `src/test/`
5. **Configurable shared resources**: ports, paths, etc. must be injectable
   (no hardcoded values) so tests can run in parallel without flakes
6. **Test packages**: integration tests that depend on `cactus-cmd-api-server`
   should go in a separate `cacti-test-*` package to avoid circular deps

### Test Tooling

`cactus-test-tooling` provides utilities including Docker-based all-in-one
ledger images for integration testing. It must only be a `devDependency`.

---

## 8. Commit & PR Conventions

### Commit Messages

Format: [Conventional Commits](https://www.conventionalcommits.org/) syntax.

```
<type>[optional scope]: <description>
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
`refactor`, `revert`, `style`, `test`

Limits:
- Header max width: 72 characters
- Body max line length: 80 characters
- Footer max line length: 80 characters

Helper: `npm run commit` (interactive Commitizen prompt)

### Signing

All commits must be signed: `git commit -S`
DCO (Developer Certificate of Origin) is enforced.

### PR Workflow

- One commit per PR preferred (squash when possible)
- Always rebase onto `main` (no merge commits)
- Force push with `--force-with-lease` only
- Draft PRs welcome for early feedback
- "Significant Change" label for large proposals
- 2 maintainer approvals required for merge

---

## 9. CI / Linting

- **CI script**: `./tools/ci.sh`
- **Linter**: ESLint (`format:eslint`)
- **Formatter**: Prettier (`format:prettier`)
- **Spellcheck**: cspell
- **Commit lint**: commitlint with `@commitlint/config-conventional`
- **Secret detection**: pre-commit hooks
- **Circular dependency check**: `madge --circular`
- **All dependencies must be local** — never install globally

---

## 10. OpenAPI / Code Generation

- Specs at `src/main/json/openapi.json` per package
- Generator: `openapi-generator-cli` v6.6.0
- Generated clients: TypeScript Axios under `generated/openapi/typescript-axios/`
- Template bundle files stored under `build/`
- Run `yarn codegen` to regenerate all clients
- `public-api.ts` re-exports generated types:
  ```typescript
  export * from "./generated/openapi/typescript-axios/index";
  ```

---

## 11. Documentation

- **Engine**: MkDocs (Python-based, `docs/mkdocs.yml`)
- **Docs source**: `docs/docs/`
- **Diagrams**: Mermaid format, generated from `docs/docs/guides/diagrams/*.mmd`
  via `yarn docs:diagrams` (uses mermaid-cli/mmdc)
- **Architecture docs**: See `docs/docs/` for vision, design, and system
  architecture

---

## 12. Security

- Report vulnerabilities to `security@hyperledger.org`
- Security audit via `yarn audit` (production deps, recursive)
- Pre-commit secret detection hooks
- Apache-2.0 license on all source

---

## 13. Key Architectural Concepts

### Plugin System

Cacti uses a plugin architecture where each capability (ledger connector,
keychain, object store, etc.) implements a well-defined interface from
`cactus-core-api`. Plugins are instantiated via `PluginFactory` pattern.

### Ledger Connectors

Each supported DLT has a connector plugin:
`cacti-plugin-ledger-connector-<ledger>`. Connectors implement
`IPluginLedgerConnector` and expose REST/gRPC endpoints defined in their
OpenAPI spec.

### SATP (Secure Asset Transfer Protocol)

`cactus-plugin-satp-hermes` implements the IETF SATP protocol for cross-chain
asset transfers. It is the most feature-rich package with its own database
layer (Knex migrations), BDD tests (Cucumber), and multiple Jest config
variants.

### COPM (Cross-chain Operation Protocol)

`cacti-copm-*` packages implement cross-chain operations with Corda and Fabric
support.

### Weaver

The `weaver/` subtree is a separate interoperability framework with its own
SDKs, drivers, and sample applications integrated into the monorepo workspace.

### API Server

`cactus-cmd-api-server` is the main entry point that orchestrates plugins,
exposes REST/gRPC APIs, and manages configuration.

---

## 14. Dependencies & Versioning

- All packages share version `2.1.0` (Lerna fixed mode)
- Changelog preset: Angular
- New dependencies must be added locally to the package that needs them
- `cactus-test-tooling` is always a `devDependency`
- Corepack manages Yarn version (`yarn@4.3.1`)
- Node version: 20.20.0

---
