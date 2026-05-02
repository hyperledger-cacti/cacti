# `@hyperledger/cactus-plugin-keychain-azure-kv`

A Cacti keychain plugin that stores keychain entries in [Azure Key Vault](https://learn.microsoft.com/azure/key-vault/general/overview).

## Summary

Provides a keychain backend backed by Azure Key Vault so that secrets used by Cacti plugins (private keys, API tokens, certificates, etc.) can be persisted in a managed cloud secret store instead of in memory. The plugin implements the standard `IPluginKeychain` interface and exposes the usual `get`, `set`, `has`, and `delete` HTTP endpoints used by other Cacti components.

## Installation

```sh
yarn add @hyperledger/cactus-plugin-keychain-azure-kv
# or
npm install @hyperledger/cactus-plugin-keychain-azure-kv
```

## Usage

```typescript
import {
  PluginKeychainAzureKv,
  AzureCredentialType,
} from "@hyperledger/cactus-plugin-keychain-azure-kv";

const keychain = new PluginKeychainAzureKv({
  keychainId: "my-keychain",
  instanceId: "instance-1",
  azureEndpoint: "https://my-vault.vault.azure.net",
  azureCredentialType: AzureCredentialType.InMemory,
  azureInMemoryCredentials: {
    azureTenantId: process.env.AZURE_TENANT_ID!,
    azureClientId: process.env.AZURE_CLIENT_ID!,
    azureUsername: process.env.AZURE_USERNAME!,
    azurePassword: process.env.AZURE_PASSWORD!,
  },
});

await keychain.set("my-secret", "s3cr3t");
const value = await keychain.get("my-secret");
```

## Options

`IPluginKeychainAzureKvOptions`:

| Option | Required | Description |
|---|---|---|
| `keychainId` | yes | Logical id used to address this keychain instance. |
| `instanceId` | yes | Unique id for the plugin instance within the host. |
| `azureEndpoint` | yes | Vault URL (e.g. `https://<name>.vault.azure.net`). |
| `azureCredentialType` | no | One of `InMemory`, `LocalFile`, `RefreshToken`, `AccessToken`. |
| `azureInMemoryCredentials` | conditional | Required when `azureCredentialType === InMemory`. |
| `refreshTokenCredentials` | conditional | Required when `azureCredentialType === RefreshToken`. |
| `accessTokenCredentials` | conditional | Required when `azureCredentialType === AccessToken`. |
| `backend` | no | Inject a pre-built `@azure/keyvault-secrets` `SecretClient` (mainly for tests). |
| `logLevel` | no | Cacti `LogLevelDesc`. |

## Web service endpoints

Mounted under `/api/v1/plugins/@hyperledger/cactus-plugin-keychain-azure-kv/`:

- `set-keychain-entry`
- `get-keychain-entry`
- `has-keychain-entry`
- `delete-keychain-entry`

## Running tests

From the repository root:

```sh
yarn lerna run test --scope=@hyperledger/cactus-plugin-keychain-azure-kv
```

Integration tests require valid Azure Key Vault credentials in the environment.

## References

- [Azure Key Vault documentation](https://learn.microsoft.com/azure/key-vault/)
- [Cacti core API](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-core-api)
