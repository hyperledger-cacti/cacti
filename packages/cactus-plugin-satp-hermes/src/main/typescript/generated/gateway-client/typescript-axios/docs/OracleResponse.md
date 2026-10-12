# OracleResponse

Represents the response from an Oracle task execution, including transaction details and outputs.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transactionId** | **string** | The unique identifier for the transaction. | [optional] [default to undefined]
**transactionReceipt** | **object** | The receipt of the transaction, providing proof of execution. | [optional] [default to undefined]
**output** | **string** | The output of the Oracle operation execution. | [optional] [default to undefined]
**proof** | **object** | Proof of the Oracle operation execution. | [optional] [default to undefined]

## Example

```typescript
import { OracleResponse } from './api';

const instance: OracleResponse = {
    transactionId,
    transactionReceipt,
    output,
    proof,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
