# InvokeRawWeb3EthContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**abi** | **any** | The application binary interface of the solidity contract | [default to undefined]
**address** | **string** | Deployed solidity contract address | [default to undefined]
**invocationType** | [**EthContractInvocationWeb3Method**](EthContractInvocationWeb3Method.md) |  | [default to undefined]
**invocationParams** | **object** | The list of arguments for contract invocation method (send, call, etc...) | [optional] [default to undefined]
**contractMethod** | **string** | Method of deployed solidity contract to execute | [default to undefined]
**contractMethodArgs** | **Array&lt;any&gt;** | The list of arguments for deployed solidity contract method | [optional] [default to undefined]

## Example

```typescript
import { InvokeRawWeb3EthContractV1Request } from './api';

const instance: InvokeRawWeb3EthContractV1Request = {
    abi,
    address,
    invocationType,
    invocationParams,
    contractMethod,
    contractMethodArgs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
