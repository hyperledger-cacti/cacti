# FullBlockTransactionActionV1

Transaction action returned from fabric block.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**functionName** | **string** |  | [default to undefined]
**functionArgs** | **Array&lt;string&gt;** |  | [default to undefined]
**chaincodeId** | **string** |  | [default to undefined]
**creator** | [**FabricCertificateIdentityV1**](FabricCertificateIdentityV1.md) |  | [default to undefined]
**endorsements** | [**Array&lt;FullBlockTransactionEndorsementV1&gt;**](FullBlockTransactionEndorsementV1.md) |  | [default to undefined]

## Example

```typescript
import { FullBlockTransactionActionV1 } from './api';

const instance: FullBlockTransactionActionV1 = {
    functionName,
    functionArgs,
    chaincodeId,
    creator,
    endorsements,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
