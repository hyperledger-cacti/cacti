# `@hyperledger-cacti/cactus-core`

> Contains lower level abstractions and implementations shared by multiple higher level packages.

## Overview

This module is responsible for providing the backbone for the rest of the packages when it comes to the features of Cacti. The main difference between this and the `cactus-common` package is that this one does not guarantee its features to work in the browser. The main difference from the `cactus-core-api` package is that this is meant to contain actual implementations while `cactus-core-api` is meant to be strictly about defining interfaces.

**Target Audience:**
- [x] Developers
- [ ] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-core
```

## API Summary

### Plugin Management
- `IPluginRegistryOptions`
- `PluginRegistry`

### Web Service Infrastructure
- `registerWebServiceEndpoint`
- `AuthorizationOptionsProvider`
- `IEndpointAuthzOptionsProviderOptions`
- `IInstallOpenapiValidationMiddlewareRequest`
- `installOpenapiValidationMiddleware`
- `GetOpenApiSpecV1EndpointBase`
- `IGetOpenApiSpecV1EndpointBaseOptions`
- `stringifyBigIntReplacer`
- `IConfigureExpressAppContext`
- `configureExpressAppBase`
- `CACTI_CORE_CONFIGURE_EXPRESS_APP_BASE_MARKER`

### Error Handling
- `IHandleRestEndpointExceptionOptions`
- `handleRestEndpointException`

### Consortium
- `ConsortiumRepository`
- `IConsortiumRepositoryOptions`

### Consensus
- `consensusHasTransactionFinality`

## Usage

```typescript
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";

const registry = new PluginRegistry({
  plugins: [],
});

console.log("Plugin registry created successfully.");
```

## Testing

To run the tests for this package, execute the following command from the package root:

```sh
npx jest
```
