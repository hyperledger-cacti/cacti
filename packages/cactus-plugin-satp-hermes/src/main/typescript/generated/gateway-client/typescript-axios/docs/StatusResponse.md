# StatusResponse

Provides the current status of the SATP session including detailed information on the progress, such as substatus, stage, and step, along with the session start time and chain information.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]
**substatus** | **string** |  | [default to undefined]
**stage** | **string** |  | [default to undefined]
**step** | **string** |  | [default to undefined]
**startTime** | **string** |  | [default to undefined]
**originNetwork** | [**Transact200ResponseStatusResponseOriginNetwork**](Transact200ResponseStatusResponseOriginNetwork.md) |  | [default to undefined]
**destinationNetwork** | [**Transact200ResponseStatusResponseDestinationNetwork**](Transact200ResponseStatusResponseDestinationNetwork.md) |  | [default to undefined]

## Example

```typescript
import { StatusResponse } from './api';

const instance: StatusResponse = {
    status,
    substatus,
    stage,
    step,
    startTime,
    originNetwork,
    destinationNetwork,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
