# Package README Template

> This template defines the standard structure for all `packages/` README files
> in the Hyperledger Cacti monorepo. Copy this skeleton when creating a new
> package or when updating an existing README for consistency.

---

```markdown
# `@hyperledger-cacti/<package-name>`

> One-line summary of the package purpose.

## Overview

A brief description of what this package does, its role in the Cacti ecosystem,
and how it relates to other packages (e.g., `cactus-core` vs `cactus-core-api`).

**Target Audience:**
- [ ] Developers
- [ ] Operators

## Install

\```sh
npm install @hyperledger-cacti/<package-name>
\```

## Configuration

<!-- Include if the package has runtime configuration options. -->
<!-- Use a table derived from the package's TypeScript options interface. -->

| Option | Required | Default | Description |
|---|---|---|---|
| `instanceId` | Yes | - | Unique ID for the plugin instance. |
| `logLevel` | No | `"INFO"` | The log level for the plugin. |

## API Summary

List key exports grouped by category. For packages with an OpenAPI spec, include:

> The API surface is documented in the [OpenAPI specification](./src/main/json/openapi.json).
> A generated TypeScript Axios client is available at
> [src/main/typescript/generated/openapi/typescript-axios/](./src/main/typescript/generated/openapi/typescript-axios/).

## Usage

\```typescript
import { SomeExport } from "@hyperledger-cacti/<package-name>";

// Minimal working example
\```

## Testing

\```sh
npx jest
\```

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there's always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments
```

> **Note:** This template defines the baseline structure. The documentation may be extended and allow for other sections (e.g., `Architecture`, `Containerization`, `Prometheus Exporter`) depending on the specific requirements of the package.

---

## Section Guidelines

| Section | Required | Notes |
|---|---|---|
| Title | Yes | Use the full `@hyperledger-cacti/` scoped package name. |
| Overview | Yes | One to three sentences. Includes Target Audience checkboxes. |
| Install | Yes | `npm install` command. Use `--save-dev` for test-only packages. |
| Configuration | If applicable | Table from the TypeScript options interface. |
| API Summary | Yes | Grouped list of key exports or link to OpenAPI spec. |
| Usage | Yes | Minimal code example showing import and basic usage. |
| Testing | Yes | Command to run the package's tests. |
| Contributing | Optional | Standard link to `CONTRIBUTING.md`. |
| License | Optional | Standard link to `LICENSE`. |
| Acknowledgments | Optional | Credits. |

---

## Example

````markdown
# `@hyperledger-cacti/cactus-common`

> Universal library used by both front end and back end components of Cactus. Aims to be a developer swiss army knife.

## Overview

This module is a universal utility library used by both front-end and back-end Cacti components.

**Target Audience:**
- [x] Developers
- [ ] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-common
```

## API Summary

### Logging
- `LoggerProvider`
- `Logger`

## Usage

```typescript
import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
const log = LoggerProvider.getOrCreate({
  label: "my-service",
  level: "INFO" as LogLevelDesc,
});
log.info("Service initialized successfully.");
```

## Testing

```sh
npx jest
```
````
