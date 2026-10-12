# GetSessionProofs200Response

Response schema for a session proofs request. Contains the signature-verified SessionProofs persisted in the audit database for the requested sessions.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**proofs** | [**Array&lt;PerformAudit200ResponseAuditEntriesEntriesInnerProofsInner&gt;**](PerformAudit200ResponseAuditEntriesEntriesInnerProofsInner.md) | Signature-verified session proofs for the requested SATP sessions. | [default to undefined]

## Example

```typescript
import { GetSessionProofs200Response } from './api';

const instance: GetSessionProofs200Response = {
    proofs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
