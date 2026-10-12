# RunDelegatedSignTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**endorsingPeers** | **Array&lt;string&gt;** | An array of endorsing peers (name or url) for the transaction. | [optional] [default to undefined]
**endorsingOrgs** | **Array&lt;string&gt;** | An array of endorsing organizations (by mspID or issuer org name on certificate) for the transaction. | [optional] [default to undefined]
**transientData** | **object** |  | [optional] [default to undefined]
**signerCertificate** | **string** |  | [default to undefined]
**signerMspID** | **string** |  | [default to undefined]
**uniqueTransactionData** | **any** | Can be used to uniquely identify and authorize signing request | [optional] [default to undefined]
**channelName** | **string** |  | [default to undefined]
**contractName** | **string** |  | [default to undefined]
**invocationType** | [**FabricContractInvocationType**](FabricContractInvocationType.md) |  | [default to undefined]
**methodName** | **string** |  | [default to undefined]
**params** | **Array&lt;string | null&gt;** |  | [default to undefined]
**responseType** | [**RunTransactionResponseType**](RunTransactionResponseType.md) |  | [optional] [default to undefined]

## Example

```typescript
import { RunDelegatedSignTransactionRequest } from './api';

const instance: RunDelegatedSignTransactionRequest = {
    endorsingPeers,
    endorsingOrgs,
    transientData,
    signerCertificate,
    signerMspID,
    uniqueTransactionData,
    channelName,
    contractName,
    invocationType,
    methodName,
    params,
    responseType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
