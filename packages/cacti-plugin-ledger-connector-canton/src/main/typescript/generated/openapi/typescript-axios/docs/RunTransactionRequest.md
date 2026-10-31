# RunTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**partyId** | **string** |  | [default to undefined]
**commands** | [**Array&lt;CantonCommand&gt;**](CantonCommand.md) | The serialized command payload is limited to 1 MiB and 64 nesting levels by the connector. | [default to undefined]
**commandId** | **string** | Caller-chosen, stable identifier for this submission. Reuse the same value when retrying a submission whose outcome is unknown (for example after HTTP 504) so that Canton command deduplication rejects a duplicate instead of committing it twice. | [default to undefined]
**synchronizerId** | **string** |  | [optional] [default to undefined]
**readAs** | **Array&lt;string&gt;** |  | [optional] [default to undefined]

## Example

```typescript
import { RunTransactionRequest } from './api';

const instance: RunTransactionRequest = {
    partyId,
    commands,
    commandId,
    synchronizerId,
    readAs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
