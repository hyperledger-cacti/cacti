# AuditEntry

Response schema for an audit request. Contains the proofs generated during the audit period and the start and end datetimes.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**auditEntryId** | **string** | The unique identifier for the audit entry. | [optional] [default to undefined]
**session** | [**PerformAudit200ResponseAuditEntriesEntriesInnerSession**](PerformAudit200ResponseAuditEntriesEntriesInnerSession.md) |  | [default to undefined]
**timestamp** | **number** | The start timestamp for the audit entry, as a Unix timestamp (milliseconds since epoch). | [default to undefined]
**proofs** | [**Array&lt;PerformAudit200ResponseAuditEntriesEntriesInnerProofsInner&gt;**](PerformAudit200ResponseAuditEntriesEntriesInnerProofsInner.md) | Signature-verified protocol claims (SessionProofs) recorded in the audit database for the session associated with this audit entry.  | [default to undefined]

## Example

```typescript
import { AuditEntry } from './api';

const instance: AuditEntry = {
    auditEntryId,
    session,
    timestamp,
    proofs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
