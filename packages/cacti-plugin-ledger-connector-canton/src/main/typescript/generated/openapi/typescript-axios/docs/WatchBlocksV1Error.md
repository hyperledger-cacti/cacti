# WatchBlocksV1Error

Sent once when the stream fails; the subscription then ends.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**statusCode** | **number** | The HTTP status the equivalent REST request would have returned. | [default to undefined]
**message** | **string** |  | [default to undefined]
**cantonErrorCode** | **string** | Canton\&#39;s error code when the ledger rejected the request. | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksV1Error } from './api';

const instance: WatchBlocksV1Error = {
    statusCode,
    message,
    cantonErrorCode,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
