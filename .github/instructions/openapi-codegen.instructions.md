---
description: "Use when working with OpenAPI specs, code generation, or generated API clients. Covers spec location, generator version, and regeneration workflow."
applyTo: "**/openapi.json"
---
# OpenAPI & Code Generation

- OpenAPI 3.x specs usually live at `src/main/json/openapi.json` in each
  package, but package-specific workflows take precedence.
- Generator: `openapi-generator-cli` pinned at **v6.6.0**.
- Common generated TypeScript Axios output:
  `src/main/typescript/generated/openapi/typescript-axios/`
- **Never edit generated files.** Modify the `openapi.json` spec instead,
  then run `yarn codegen` to regenerate.
- `public-api.ts` re-exports generated types:
  ```typescript
  export * from "./generated/openapi/typescript-axios/index";
  ```
- Template bundle files are cached under `build/`.
- After spec changes: `yarn codegen` → `yarn build:dev:backend` → verify.
- OpenAPI spec changes require a corresponding changelog entry.

## Package-Specific Exceptions

- SATP Hermes does not follow the default `openapi.json`-only workflow.
  It bundles `src/main/yml/bol/oapi-api1.yml` first and generates its gateway
  client under:
  `src/main/typescript/generated/gateway-client/typescript-axios/`
- Always inspect the target package's `package.json` for the right
  `codegen`, `generate-sdk`, or bundling command before regenerating clients.
- Some packages export both `generated/openapi/typescript-axios` and deeper
  paths such as `generated/openapi/typescript-axios/api`.

## Safe Workflow

1. Read the target package `package.json`.
2. Run the narrowest package-local codegen script available.
3. Build the affected package or backend.
4. Review `public-api.ts` exports to ensure generated types remain wired in.
