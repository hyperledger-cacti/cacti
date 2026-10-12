# RunTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**transactionConfig** | [**BesuTransactionConfig**](BesuTransactionConfig.md) |  | [default to undefined]
**consistencyStrategy** | [**ConsistencyStrategy**](ConsistencyStrategy.md) |  | [default to undefined]
**privateTransactionConfig** | [**BesuPrivateTransactionConfig**](BesuPrivateTransactionConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { RunTransactionRequest } from './api';

const instance: RunTransactionRequest = {
    web3SigningCredential,
    transactionConfig,
    consistencyStrategy,
    privateTransactionConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
