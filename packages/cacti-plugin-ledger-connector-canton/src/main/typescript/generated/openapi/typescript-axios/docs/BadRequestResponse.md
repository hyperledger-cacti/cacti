# BadRequestResponse

A connector validation error, or the OpenAPI validator\'s list of request errors.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **string** |  | [default to undefined]
**cantonErrorCode** | **string** | Canton\&#39;s error code, for example DUPLICATE_COMMAND, when the ledger rejected the request. | [optional] [default to undefined]

## Example

```typescript
import { BadRequestResponse } from './api';

const instance: BadRequestResponse = {
    message,
    cantonErrorCode,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
