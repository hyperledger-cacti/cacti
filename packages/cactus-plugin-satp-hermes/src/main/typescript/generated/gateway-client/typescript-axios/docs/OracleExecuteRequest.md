# OracleExecuteRequest

Request schema for triggering an immediate transfer task. Includes the task ID, payload, and destination network and contract details.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sourceNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**destinationNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**sourceContract** | [**ExecuteOracleTaskRequestSourceContract**](ExecuteOracleTaskRequestSourceContract.md) |  | [optional] [default to undefined]
**destinationContract** | [**ExecuteOracleTaskRequestDestinationContract**](ExecuteOracleTaskRequestDestinationContract.md) |  | [optional] [default to undefined]
**taskType** | **string** | The type of task to be registered. | [optional] [default to undefined]

## Example

```typescript
import { OracleExecuteRequest } from './api';

const instance: OracleExecuteRequest = {
    sourceNetworkId,
    destinationNetworkId,
    sourceContract,
    destinationContract,
    taskType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
