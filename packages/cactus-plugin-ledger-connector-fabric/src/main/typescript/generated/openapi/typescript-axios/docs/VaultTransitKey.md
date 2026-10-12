# VaultTransitKey

vault key details for signing fabric message with private key stored with transit engine.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**keyName** | **string** | label of private key | [default to undefined]
**token** | **string** | token for accessing private key | [default to undefined]

## Example

```typescript
import { VaultTransitKey } from './api';

const instance: VaultTransitKey = {
    keyName,
    token,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
