# SessionProof

A signature-verified claim exchanged at a SATP protocol step, persisted in the audit database so it stays provable for dispute resolution and audit after transport ends. 

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sessionId** | **string** | Unique identifier of the SATP session this proof belongs to. | [default to undefined]
**step** | [**PerformAudit200ResponseAuditEntriesEntriesInnerProofsInnerStep**](PerformAudit200ResponseAuditEntriesEntriesInnerProofsInnerStep.md) |  | [default to undefined]
**claim** | **string** | JSON-serialized assertion claim (e.g., wrap, lock, mint, burn, or assignment assertion claim) as verified at the protocol step.  | [default to undefined]
**signedClaim** | **string** | The signature carried by the claim, produced by the asset/bridge operation over the claim receipt.  | [default to undefined]

## Example

```typescript
import { SessionProof } from './api';

const instance: SessionProof = {
    sessionId,
    step,
    claim,
    signedClaim,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
