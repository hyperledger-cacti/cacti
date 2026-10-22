# GetIntegrations200ResponseIntegrationsInner

Details a network or system integration supported by SATP Hermes.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | A unique identifier for the blockchain network/system. | [default to undefined]
**name** | **string** | The name of the blockchain network/system. | [default to undefined]
**type** | **string** | The type of network (e.g., \&#39;evm\&#39;, \&#39;fabric\&#39;, \&#39;SQL Database\&#39;). | [default to undefined]
**environment** | **string** | The specific network name (e.g., \&#39;mainnet\&#39;, \&#39;testnet\&#39;). | [optional] [default to undefined]

## Example

```typescript
import { GetIntegrations200ResponseIntegrationsInner } from './api';

const instance: GetIntegrations200ResponseIntegrationsInner = {
    id,
    name,
    type,
    environment,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
