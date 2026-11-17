# DeployDarRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**darBase64** | **string** | The DAR file, base64-encoded. The decoded size is limited by the connector\&#39;s maxDarBytes option (16 MiB by default). | [default to undefined]
**synchronizerId** | **string** | Synchronizer to vet the packages on. Defaults to the participant\&#39;s default synchronizer. | [optional] [default to undefined]

## Example

```typescript
import { DeployDarRequest } from './api';

const instance: DeployDarRequest = {
    darBase64,
    synchronizerId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
