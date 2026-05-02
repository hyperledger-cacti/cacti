# `@hyperledger/cactus-plugin-keychain-google-sm`

A Cacti keychain plugin that stores keychain entries in [Google Cloud Secret Manager](https://cloud.google.com/security/products/secret-manager).

## Summary

Provides a keychain backend backed by Google Cloud Secret Manager so that secrets used by Cacti plugins (private keys, API tokens, certificates, etc.) can be persisted in a managed cloud secret store instead of in memory. The plugin implements the standard `IPluginKeychain` interface and exposes the usual `get`, `set`, `has`, and `delete` HTTP endpoints used by other Cacti components.

## Installation

```sh
yarn add @hyperledger/cactus-plugin-keychain-google-sm
# or
npm install @hyperledger/cactus-plugin-keychain-google-sm
```

## Usage

```typescript
import { PluginKeychainGoogleSm } from "@hyperledger/cactus-plugin-keychain-google-sm";

const keychain = new PluginKeychainGoogleSm({
  keychainId: "my-keychain",
  instanceId: "instance-1",
});

await keychain.set("my-secret", "s3cr3t");
const value = await keychain.get("my-secret");
```

Authentication is handled by the underlying `@google-cloud/secret-manager` client, which honours the standard [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) chain (`GOOGLE_APPLICATION_CREDENTIALS`, workload identity, etc.).

## Options

`IPluginKeychainGoogleSmOptions`:

| Option | Required | Description |
|---|---|---|
| `keychainId` | yes | Logical id used to address this keychain instance. |
| `instanceId` | yes | Unique id for the plugin instance within the host. |
| `backend` | no | Inject a pre-built `SecretManagerServiceClient` (mainly for tests). |
| `logLevel` | no | Cacti `LogLevelDesc`. |

## Web service endpoints

Mounted under `/api/v1/plugins/@hyperledger/cactus-plugin-keychain-google-sm/`:

- `set-keychain-entry`
- `get-keychain-entry`
- `has-keychain-entry`
- `delete-keychain-entry`

## Running tests

From the repository root:

```sh
yarn lerna run test --scope=@hyperledger/cactus-plugin-keychain-google-sm
```

Integration tests require valid Google Cloud credentials in the environment and access to a project with Secret Manager enabled.

## References

- [Google Cloud Secret Manager documentation](https://cloud.google.com/secret-manager/docs)
- [Cacti core API](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-core-api)
