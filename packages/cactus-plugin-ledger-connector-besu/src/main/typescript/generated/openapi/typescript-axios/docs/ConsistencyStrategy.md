# ConsistencyStrategy


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**receiptType** | [**ReceiptType**](ReceiptType.md) |  | [default to undefined]
**timeoutMs** | **number** | The amount of milliseconds to wait for the receipt to arrive to the connector. Defaults to 0 which means to wait for an unlimited amount of time. Note that this wait may be interrupted still by other parts of the infrastructure such as load balancers cutting of HTTP requests after some time even if they are the type that is supposed to be kept alive. The question of re-entrance is a broader topic not in scope to discuss here, but it is important to mention it. | [optional] [default to undefined]
**blockConfirmations** | **number** | The number of blocks to wait to be confirmed in addition to the block containing the transaction in question. Note that if the receipt type is set to only wait for node transaction pool ACK and this parameter is set to anything, but zero then the API will not accept the request due to conflicting parameters. | [default to undefined]

## Example

```typescript
import { ConsistencyStrategy } from './api';

const instance: ConsistencyStrategy = {
    receiptType,
    timeoutMs,
    blockConfirmations,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
