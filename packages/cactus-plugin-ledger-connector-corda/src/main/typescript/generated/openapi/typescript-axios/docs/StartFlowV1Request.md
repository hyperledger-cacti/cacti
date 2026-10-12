# StartFlowV1Request

This method starts a new instance for the specified flow for the specified holding identity.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**username** | **string** |  | [default to undefined]
**password** | **string** |  | [default to undefined]
**rejectUnauthorized** | **boolean** |  | [default to undefined]
**holdingIDShortHash** | **string** |  | [optional] [default to undefined]
**clientRequestId** | **string** |  | [default to undefined]
**flowClassName** | **string** |  | [default to undefined]
**requestBody** | [**StartFlowV1RequestRequestBody**](StartFlowV1RequestRequestBody.md) |  | [default to undefined]

## Example

```typescript
import { StartFlowV1Request } from './api';

const instance: StartFlowV1Request = {
    username,
    password,
    rejectUnauthorized,
    holdingIDShortHash,
    clientRequestId,
    flowClassName,
    requestBody,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
