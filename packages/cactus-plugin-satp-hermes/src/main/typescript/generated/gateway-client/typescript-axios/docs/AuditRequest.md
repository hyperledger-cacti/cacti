# AuditRequest

Response schema for an audit request. Contains the proofs generated during the audit period and the start and end datetimes.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**startTimestamp** | **string** | The start of the audit period, in ISO 8601 format (e.g., \&quot;2026-02-16T10:33:30.639Z\&quot;). | [default to undefined]
**endTimestamp** | **string** | The end of the audit period, in ISO 8601 format (e.g., \&quot;2026-02-16T11:00:00.000Z\&quot;). | [default to undefined]

## Example

```typescript
import { AuditRequest } from './api';

const instance: AuditRequest = {
    startTimestamp,
    endTimestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
