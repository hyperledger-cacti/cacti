# `@hyperledger/cactus-verifier-client`

## Summary

This package provides `Verifier` and `VerifierFactory` components that can be used to communicate with compatible Cactus ledger connectors (validators) through single, unified interface.

### Supported ledger connectors

| validatorType        | cactus ledger connector plugin          |
| -------------------- | --------------------------------------- |
| BESU_1X<br />BESU_2X | cactus-plugin-ledger-connector-besu     |
| ETH_1X               | cactus-plugin-ledger-connector-ethereum |
| CORDA_4X             | cactus-plugin-ledger-connector-corda    |
| IROHA_2X             | cactus-plugin-ledger-connector-iroha2   |
| FABRIC_2X            | cactus-plugin-ledger-connector-fabric   |
| SAWTOOTH_1X          | cactus-plugin-ledger-connector-sawtooth |

## VerifierFactory

- Used to create single verifier per ledger based on pre-defined configuration.
- See [verifier-factory.test.ts](../cactus-verifier-client/src/test/typescript/unit/verifier-factory.test.ts) for unit tests.
- **In order to use `VerifierFactory` or `getValidatorApiClient` you must manually install the connector package that provides given ledger ApiClient!**
  - Example: if your project uses ethereum and corda validators, you must install `cactus-plugin-ledger-connector-ethereum` and `cactus-plugin-ledger-connector-corda `. See table above for validator to package mapping.

### Usage

```typescript
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

// Create VerifierFactory configuration that should describe all validators we want to connect to.
// This can be read from a file or typed manually, the config is a superset of cactus-common-example-server ledger plugin config.
const ledgerPluginInfo: VerifierFactoryConfig = [
    {
        validatorID: "besu_openapi_connector", // required
        validatorType: "BESU_2X",              // required - see table above for supported validator types
        basePath: "https://localhost:9999",    // besu specific config
    },
];

// Instantiate single VerifierFactory from given config in your Bussiness Logic Plugin.
const verifierFactory = new VerifierFactory(ledgerPluginInfo);

// Get ApiClient to validator with ID "myBesuValidatorId"
// Second argument will determine type of returned Verifier (BesuApiClient in this case)
const myBesu: Verifier<BesuApiClient> = await sut.getVerifier("myBesuValidatorId", "BESU_1X"))

// Second argument can be ignored for backward-compatibility
// It will return Verifier<(union of all supported ApiClients)>
const client: Verifier<any> = sut.getVerifier(validatorId);
```

## Verifier

- Common interface to all supported connector plugins.
- See [verifier.test.ts](../cactus-verifier-client/src/test/typescript/unit/verifier.test.ts) for unit tests.
- See [verifier-integration-with-openapi-connectors.test.ts](../cactus-test-api-client/src/test/typescript/integration/verifier-integration-with-openapi-connectors.test.ts) for integration test with Besu ledger connector.

### Construction

```typescript
// Use VerifierFactory to get an instance of ledger connector Verifier
const myBesu: Verifier<BesuApiClient> = sut.getVerifier("myBesuValidatorId", "BESU_1X"))

// Or create it manually from ledger ApiClient
const besuApiClientOptions = new BesuApiClientOptions({
    basePath: "https://localhost:9999",
});
const apiClient = new BesuApiClient(besuApiClientOptions);
const myBesu: Verifier<BesuApiClient> = new Verifier("besu_openapi_connector", apiClient, "info");
```

### Interface

- Interface is defined in [cactus-core-api package](../cactus-core-api/src/main/typescript/client/i-verifier.ts).

```typescript
export interface IVerifier {
  // Immediately sends request to the validator, doesn't report any error or responses.
  sendAsyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: Record<string, unknown>,
  ): Promise<void>;

  // Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
  sendSyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: Record<string, unknown>,
  ): Promise<any>;

  // Start monitoring for new events / blocks from underlying ledger.
  startMonitor(
    id: string,
    options: Record<string, unknown>,
    eventListener: IVerifierEventListener,
  ): void;

  // Stops the monitor for specified app, removes it's subscription from internal storage.
  stopMonitor(id?: string): void;
}
```
