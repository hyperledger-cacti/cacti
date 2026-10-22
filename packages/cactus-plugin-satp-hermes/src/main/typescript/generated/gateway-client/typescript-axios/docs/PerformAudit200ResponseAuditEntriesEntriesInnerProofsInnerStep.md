# PerformAudit200ResponseAuditEntriesEntriesInnerProofsInnerStep

The SATP protocol step definition (tag, description, role, sequence, message type) at which the claim was verified, from the SATP protocol map. 

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **string** | Step tag identifier from the SATP protocol map. | [default to undefined]
**description** | **string** | Human-readable description of the protocol step. | [default to undefined]
**role** | **string** | Gateway role executing the step (client/server/both). | [default to undefined]
**sequence** | **number** | Sequence number of the step within its stage. | [default to undefined]
**messageType** | **string** | SATP message type associated with the step, if any.  | [optional] [default to undefined]

## Example

```typescript
import { PerformAudit200ResponseAuditEntriesEntriesInnerProofsInnerStep } from './api';

const instance: PerformAudit200ResponseAuditEntriesEntriesInnerProofsInnerStep = {
    tag,
    description,
    role,
    sequence,
    messageType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
