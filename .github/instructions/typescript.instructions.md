---
description: "Use when writing or modifying TypeScript source files in Cacti packages. Covers naming, exports, strict mode, interface patterns, and barrel files."
applyTo: "**/*.ts"
---
# TypeScript Conventions

- Target ES2022, CommonJS modules, strict mode enabled.
- Interfaces prefixed with `I` (e.g., `ICactusPlugin`, `IPluginFactoryOptions`).
- Type guards follow `isI<Name>` pattern (e.g., `isICactusPlugin`).
- Options interfaces: `I<Thing>Options`.
- Every package exports its public API through `src/main/typescript/public-api.ts`.
- Never export test types from `public-api.ts`.
- Never manually edit files under `generated/` directories.
- Use double quotes, semicolons, 2-space indentation, trailing commas.
- Print width is 80 characters (Prettier enforced).
- Prefer explicit types over `any`. Use `unknown` for truly unknown values.
- Plugin classes implement interfaces from `cactus-core-api` (`ICactusPlugin`,
  `IPluginLedgerConnector`, `IPluginWebService`, etc.).
- Factory pattern: extend `PluginFactory<TPlugin, TOptions, IPluginFactoryOptions>`.
- Prefer package-local naming and export patterns over inventing new ones.

## Observed Package Patterns

- Ethereum connector exports generated OpenAPI types first, then the plugin,
    utility types, the plugin factory, and a `createPluginFactory()` helper.
- `PluginFactory*` classes typically live beside the plugin implementation and
    simply instantiate the concrete plugin in `create()`.
- Plugin option types normally extend `ICactusPluginOptions` and include
    package-specific dependencies such as `PluginRegistry`.
- `index.ts` and `index.web.ts` are package entry points, but the stable public
    contract is `public-api.ts`.

## Best Practices

- When adding public surface area, update `public-api.ts` deliberately rather
    than relying on wildcard exports from unrelated modules.
- Prefer matching the surrounding package style for documentation density.
    SATP Hermes uses heavily documented public API exports, while older connector
    packages are terser.
- If a package already exposes `createPluginFactory()`, keep that helper in
    sync with the factory class.
