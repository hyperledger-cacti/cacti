# APIError

An Error

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** | HTTP error type | [default to undefined]
**code** | **number** | Numeric error code | [default to undefined]
**status** | **number** | HTTP status of the error | [default to undefined]
**message** | **string** | Long error description | [default to undefined]
**timestamp** | **string** | Timestamp of the error | [default to undefined]

## Example

```typescript
import { APIError } from './api';

const instance: APIError = {
    type,
    code,
    status,
    message,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
