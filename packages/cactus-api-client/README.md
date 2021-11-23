# `@hyperledger/cactus-api-client` <!-- omit in toc -->

- [Summary](#summary)
- [Usage](#usage)
  - [Routing to Cactus Node with connector to specific ledger](#routing-to-cactus-node-with-connector-to-specific-ledger)
    - [Leverage the `ConsortiumDatabase` for discovery](#leverage-the-consortiumdatabase-for-discovery)
    - [Use a provided `mainApiHost` and `ledgerId`](#use-a-provided-mainapihost-and-ledgerid)
    - [Use the API host of a node directly](#use-the-api-host-of-a-node-directly)
- [Public API Surface](#public-api-surface)
  - [`DefaultConsortiumProvider`](#defaultconsortiumprovider)
  - [`ApiClient`](#apiclient)

## Summary

The Hyperledger Cactus API Client package is designed to be a generic extension with convenience features wrapped around the
[**typescript-axios** flavored API clients][(https://github.com/OpenAPITools/openapi-generator/blob/v5.2.1/docs/generators/typescript-axios.md](https://github.com/OpenAPITools/openapi-generator/blob/v5.2.1/docs/generators/typescript-axios.md)) that we auto-generate and ship with each web service-enabled
plugin such as the API clients of the
* [**Manual Consortium Plugin** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-consortium-manual/src/main/typescript/generated/openapi/typescript-axios)
* [**Besu Connector** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-besu/src/main/typescript/generated/openapi/typescript-axios)
* [**Corda Connector** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-corda/src/main/typescript/generated/openapi/typescript-axios)
* [**Fabric Connector** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-fabric/src/main/typescript/generated/openapi/typescript-axios)
* [**Quorum Connector** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-quorum/src/main/typescript/generated/openapi/typescript-axios)
* [**API Server** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-cmd-api-server/src/main/typescript/generated/openapi/typescript-axios)
* [**Vault Keychain Plugin** Typescript Axios API Client](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-keychain-vault/src/main/typescript/generated/openapi/typescript-axios)

The code generation for the listed code folders above is done by the [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) tool that can convert OpenAPI V3 json specifications of ours straight into the program code of the API clients.

The above means that the `ApiClient` class is not the one containing the implementation
responsible for executing all the supported API calls by a Cactus node (which would make
it a monolith, something that we try to avoid as it is the opposite of a flexible plugin
architecture)

For example you can use the `@hyperledger/cactus-api-client` node package to perform
Cactus node discovery based on ledger IDs (that can be obtained from the `ConsortiumDatabase` as defined by the [generated models](https://github.com/hyperledger/cactus/blob/main/packages/cactus-core-api/src/main/typescript/generated/openapi/typescript-axios/api.ts) of the `@hyperledger/cactus-core-api` package.

> While you can generate API Clients for the Cactus API specifications in any supported langauge of the [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) the features provided by this package will have to be developed separately (if not already done by the Cactus maintainers).
> Currently the only implementation of the abstract API Client and its features (node discovery) is in Typescript (e.g. the `@hyperledger/cactus-api-client` package).
## Usage

### Routing to Cactus Node with connector to specific ledger

Let's say you have a consortium with several members who all have their own ledgers deployed as well.
The `ConsortiumDatabase` will therefore contain the entities pertaining to these entities
(such as the ledgers or the members themselves) meaning that if you are developing an
application that needs to perform operations on one of the ledgers in the consortium then
you have a couple of different ways of obtaining an API client to do just that:

#### Leverage the `ConsortiumDatabase` for discovery

```typescript
import { ApiClient } from "@hyperledger/cactus-api-client";

import { ConsortiumDatabase, Ledger, LedgerType } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { DefaultApi as QuorumApi } from "@hyperledger/cactus-plugin-ledger-connector-quorum";

const mainFn = async () => {
  const ledgerId = "theIdOfYourLedgerInTheConsortiumDatabase";

  // How you obtain a consortium provider is dependent on which consortium
  // plugin you use and your exact deployment scenario
  const consortiumProvider: IAsyncProvider<ConsortiumDatabase> = ...;
  const consortiumDatabase: ConsortiumDatabase = await consortiumProvider.get();
  const consortium = consortiumDatabase.consortium[0];

  const mainApiClient = new ApiClient({ basePath: consortium.mainApiHost });

  // This client is now configured to point to a node that has a connector to
  // the ledger referenced by `ledgerId`
  const apiClient = await mainApiClient.ofLedger(ledgerId, QuorumApi);

  // Use the client to perform any supported operation on the ledger
};

mainFn();
```

#### Use a provided `mainApiHost` and `ledgerId`

```typescript
import { ApiClient } from "@hyperledger/cactus-api-client";

import { ConsortiumDatabase, Ledger, LedgerType } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { DefaultApi as QuorumApi } from "@hyperledger/cactus-plugin-ledger-connector-quorum";

const mainFn = async () => {
  const ledgerId = "theIdOfYourLedgerInTheConsortiumDatabase";
  const consortiumMainApiHost = "https://cactus.example.com";

  const mainApiClient = new ApiClient({ basePath: consortiumMainApiHost });

  // This client is now configured to point to a node that has a connector to
  // the ledger referenced by `ledgerId`
  const apiClient = await mainApiClient.ofLedger(ledgerId, QuorumApi);
}

mainFn();
```

#### Use the API host of a node directly

```typescript
import { ApiClient } from "@hyperledger/cactus-api-client";

import { ConsortiumDatabase, Ledger, LedgerType } from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { DefaultApi as QuorumApi } from "@hyperledger/cactus-plugin-ledger-connector-quorum";

const mainFn = async () => {
  const nodeApiHost = "https://my-node.cactus.example.com";

  const mainApiClient = new ApiClient({ basePath: nodeApiHost });

  // This client is now configured to point to a node that has a connector to the ledger of your choice
  const apiClient = await mainApiClient.extendWith(QuorumApi);
}

mainFn();
```

## Public API Surface

### `DefaultConsortiumProvider`

Builds the default Consortium provider that can be used by this object to retrieve the Cactus Consortium metadata object when necessary (one such case is when we need information about the consortium nodes to perform routing requests to a specific ledger via a connector plugin, but later other uses could be added as well).

The DefaultConsortiumProvider class leverages the simplest consortium plugin that we have at the time of this writing: @hyperledger/cactus-plugin-consortium-manual which holds the consortium metadata as pre-configured by the consortium operators.

The pattern we use in the ApiClient class is that you can inject your own `IAsyncProvider<Consortium>` implementation which then will be used for routing information and in theory you can implement completely arbitrary consortium management in your own consortium plugins which then Cactus can use and leverage for the routing. This allows us to support any exotic consortium management algorithms that people may come up with such as storing the consortium definition in a multi-sig smart contract or have the list of consortium nodes be powered by some sort of automatic service discovery or anything else that people might think of.

### `ApiClient`

Class responsible for providing additional functionality to the DefaultApi classes of the generated clients (OpenAPI generator / typescript-axios).

Each package (plugin) can define it's own OpenAPI spec which means that they all can ship with their own `DefaultApi` class that is generated directly from the respective OpenAPI spec of the package/plugin.

The functionality provided by this class is meant to be common traints that can be useful for all of those different `DefaultApi` implementations.

One such common trait is the client side component of the routing that decides which Cactus node to point the `ApiClient` towards (which is in itself ends up being the act of routing).

@see — https ://github.com/OpenAPITools/openapi-generator/blob/v5.0.0-beta2/modules/openapi-generator/src/main/resources/typescript-axios/apiInner.mustache#L337

@see — https ://github.com/OpenAPITools/openapi-generator/blob/v5.0.0/docs/generators/typescript-axios.md
