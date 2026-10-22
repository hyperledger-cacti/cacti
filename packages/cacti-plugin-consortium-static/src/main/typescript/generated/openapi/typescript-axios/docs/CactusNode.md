# CactusNode

A Cactus node can be a single server, or a set of servers behind a load balancer acting as one.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nodeApiHost** | **string** |  | [default to undefined]
**publicKeyPem** | **string** | The PEM encoded public key that was used to generate the JWS included in the response (the jws property) | [default to undefined]
**id** | **string** |  | [default to undefined]
**consortiumId** | **string** |  | [default to undefined]
**memberId** | **string** |  | [default to undefined]
**ledgerIds** | **Array&lt;string&gt;** | Stores an array of Ledger entity IDs that are reachable (routable) via this Cactus Node. This information is used by the client side SDK API client to figure out at runtime where to send API requests that are specific to a certain ledger such as requests to execute transactions. | [default to undefined]
**pluginInstanceIds** | **Array&lt;string&gt;** |  | [default to undefined]

## Example

```typescript
import { CactusNode } from './api';

const instance: CactusNode = {
    nodeApiHost,
    publicKeyPem,
    id,
    consortiumId,
    memberId,
    ledgerIds,
    pluginInstanceIds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
