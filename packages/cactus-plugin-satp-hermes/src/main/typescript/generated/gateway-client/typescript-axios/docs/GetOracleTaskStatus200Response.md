# GetOracleTaskStatus200Response

Response schema for checking the status of a data transfer task. Includes the task ID and status of the task.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**taskID** | **string** | Unique identifier (UUID) for the session. | [default to undefined]
**type** | **string** | The type of the Oracle task. | [default to undefined]
**srcNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**srcContract** | [**ExecuteOracleTask200ResponseSrcContract**](ExecuteOracleTask200ResponseSrcContract.md) |  | [default to undefined]
**dstNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**dstContract** | [**ExecuteOracleTask200ResponseDstContract**](ExecuteOracleTask200ResponseDstContract.md) |  | [default to undefined]
**timestamp** | **number** | The timestamp when the Oracle task was created or last updated. | [default to undefined]
**operations** | [**Array&lt;ExecuteOracleTask200ResponseOperationsInner&gt;**](ExecuteOracleTask200ResponseOperationsInner.md) | The list of operations performed by the Oracle task. | [default to undefined]
**status** | **string** | The current status of the Oracle task. | [default to undefined]
**mode** | **string** | The mode of operation for registered tasks. | [default to undefined]
**pollingInterval** | **number** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] [default to undefined]

## Example

```typescript
import { GetOracleTaskStatus200Response } from './api';

const instance: GetOracleTaskStatus200Response = {
    taskID,
    type,
    srcNetworkId,
    srcContract,
    dstNetworkId,
    dstContract,
    timestamp,
    operations,
    status,
    mode,
    pollingInterval,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
