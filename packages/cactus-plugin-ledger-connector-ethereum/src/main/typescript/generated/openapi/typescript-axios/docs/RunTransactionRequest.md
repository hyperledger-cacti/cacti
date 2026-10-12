# RunTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**web3SigningCredential** | [**Web3SigningCredential**](Web3SigningCredential.md) |  | [default to undefined]
**transactionConfig** | [**EthereumTransactionConfig**](EthereumTransactionConfig.md) |  | [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for a transaction receipt with thehash of the transaction(which indicates successful execution) beforegiving up and crashing. | [optional] [default to 60000]

## Example

```typescript
import { RunTransactionRequest } from './api';

const instance: RunTransactionRequest = {
    web3SigningCredential,
    transactionConfig,
    timeoutMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
