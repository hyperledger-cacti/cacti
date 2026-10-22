# OracleOperation

Represents an operation performed by the Oracle, including its type, network, contract, status, and optional output.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | A unique identifier for the Oracle operation. | [default to undefined]
**type** | **string** | The type of the Oracle operation. | [default to undefined]
**networkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | [default to undefined]
**contract** | [**ExecuteOracleTask200ResponseOperationsInnerContract**](ExecuteOracleTask200ResponseOperationsInnerContract.md) |  | [default to undefined]
**status** | **string** | The current status of the Oracle operation. | [default to undefined]
**output** | [**ExecuteOracleTask200ResponseOperationsInnerOutput**](ExecuteOracleTask200ResponseOperationsInnerOutput.md) |  | [optional] [default to undefined]
**timestamp** | **number** | The timestamp when the Oracle operation was created or last updated. | [default to undefined]

## Example

```typescript
import { OracleOperation } from './api';

const instance: OracleOperation = {
    id,
    type,
    networkId,
    contract,
    status,
    output,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
