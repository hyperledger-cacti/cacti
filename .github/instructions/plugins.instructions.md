---
description: "Use when developing or modifying Cacti plugin packages. Covers plugin interfaces, factory pattern, lifecycle, barrel exports, and OpenAPI endpoint registration."
applyTo: "packages/cactus-plugin-*/**"
---
# Plugin Development

## Plugin Interfaces

Plugins implement interfaces from `@hyperledger/cactus-core-api`:

- **`ICactusPlugin`** — base interface: `getPackageName()`, `getInstanceId()`,
  `onPluginInit()`.
- **`IPluginWebService`** — HTTP endpoints: `getOrCreateWebServices()`,
  `registerWebServices(app)`.
- **`IPluginLedgerConnector`** — ledger interaction (deploy, transact).
- **`IPluginKeychain`** — key-value secret storage.

Most plugins implement `ICactusPlugin, IPluginWebService`. Ledger connectors
add `IPluginLedgerConnector`; keychain plugins add `IPluginKeychain`.

## Options & Configuration

- Options type: `I<PluginName>Options` extending `ICactusPluginOptions`.
- Always include `pluginRegistry: PluginRegistry` and `logLevel?: LogLevelDesc`.
- Add connector-specific deps (RPC hosts, keychain refs, etc.).
- Validate required options in the constructor with `Checks.truthy()`:
  ```typescript
  const fnTag = `${this.className}#constructor()`;
  Checks.truthy(options, `${fnTag} arg options`);
  Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
  Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
  ```

## Factory Pattern

- Each plugin has a `PluginFactory*` class extending
  `PluginFactory<TPlugin, TOptions, IPluginFactoryOptions>`.
- Factory lives beside the plugin implementation file.
- `create()` simply instantiates the concrete plugin:
  ```typescript
  export class PluginFactoryLedgerConnector extends PluginFactory<
    PluginLedgerConnectorEthereum,
    IPluginLedgerConnectorEthereumOptions,
    IPluginFactoryOptions
  > {
    async create(pluginOptions: IPluginLedgerConnectorEthereumOptions) {
      return new PluginLedgerConnectorEthereum(pluginOptions);
    }
  }
  ```
- Export a `createPluginFactory()` async helper from `public-api.ts`.

## Lifecycle Methods

- `onPluginInit()` — startup hook (may be a no-op for simple plugins).
- `shutdown()` — cleanup subscriptions, connections, and resources.
- `getOrCreateWebServices()` — lazy-creates and caches endpoint instances.
- `registerWebServices(app, wsApi)` — calls `getOrCreateWebServices()` then
  registers each endpoint via `ws.registerExpress(app)`.

## Web Service Endpoints

Each endpoint class implements `IWebServiceEndpoint`:

- Reference the OpenAPI spec path via `oasPath` getter.
- Derive `getPath()`, `getVerbLowerCase()`, `getOperationId()` from the spec.
- `registerExpress(app)` calls `registerWebServiceEndpoint(app, this)`
  from `@hyperledger/cactus-core`.
- `getExpressRequestHandler()` returns the bound handler method.

## Barrel Exports (`public-api.ts`)

Export order convention:
1. Generated OpenAPI types (`export * from "./generated/openapi/typescript-axios"`)
2. Plugin class and its options interface
3. Utility types, type guards, helpers
4. Factory class
5. `createPluginFactory()` async helper (defined inline or re-exported)

Never export test types. `index.ts`/`index.web.ts` are entry points but
`public-api.ts` is the stable public contract.

## OpenAPI Integration

- Spec at `src/main/json/openapi.json`. Never edit generated output.
- Generated Axios client: `src/main/typescript/generated/openapi/typescript-axios/`.
- After spec changes: `yarn codegen` → rebuild → verify `public-api.ts` exports.
- Endpoint classes import the spec as `import OAS from "../../json/openapi.json"`
  and use `x-hyperledger-cacti` extensions for path and verb metadata.

## Testing Plugins

- Test lifecycle methods (`onPluginInit`, `shutdown`, `getOrCreateWebServices`).
- `cactus-test-tooling` is always a `devDependency`, never production.
- Integration tests needing `cactus-cmd-api-server` go in a separate
  `cacti-test-*` package to avoid circular deps.
- Use port `0` for auto-assignment; inject all config via constructor options.
- Use `LoggerProvider.getOrCreate()` for test logging, never `console.log`.
