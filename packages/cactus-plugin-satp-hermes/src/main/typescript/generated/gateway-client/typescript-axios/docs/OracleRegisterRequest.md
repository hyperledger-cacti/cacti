# OracleRegisterRequest

Request schema for registering a repeatable task.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sourceNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**destinationNetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [optional] [default to undefined]
**sourceContract** | [**RegisterOracleTaskRequestSourceContract**](RegisterOracleTaskRequestSourceContract.md) |  | [optional] [default to undefined]
**destinationContract** | [**RegisterOracleTaskRequestDestinationContract**](RegisterOracleTaskRequestDestinationContract.md) |  | [optional] [default to undefined]
**taskMode** | **string** | The mode of operation for the repeatable task. | [default to undefined]
**pollingInterval** | **number** | The interval for polling in milliseconds. Only if taskMode is POLLING. | [optional] [default to undefined]
**listeningOptions** | [**RegisterOracleTaskRequestListeningOptions**](RegisterOracleTaskRequestListeningOptions.md) |  | [optional] [default to undefined]
**taskType** | **string** | The type of task to be registered. | [default to undefined]

## Example

```typescript
import { OracleRegisterRequest } from './api';

const instance: OracleRegisterRequest = {
    sourceNetworkId,
    destinationNetworkId,
    sourceContract,
    destinationContract,
    taskMode,
    pollingInterval,
    listeningOptions,
    taskType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
