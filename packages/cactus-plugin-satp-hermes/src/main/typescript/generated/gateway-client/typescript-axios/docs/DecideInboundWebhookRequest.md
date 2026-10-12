# DecideInboundWebhookRequest

Request payload posted by external approval controllers to approve or reject  a paused SATP transfer. The gateway validates the adapterId matches the waiting  adapter, then uses the continue field to determine whether to proceed or abort.  Inbound Webhook Workflow: 1. SATP gateway reaches a stage/step with configured inbound adapter 2. Gateway pauses execution and waits for external decision POST 3. External controller evaluates business rules, compliance checks, or manual review 4. Controller POSTs decision payload to gateway\'s inbound endpoint 5. Gateway validates decision, logs justification, and resumes or aborts transfer  Decision Semantics: - continue=true: Approve transfer continuation; gateway proceeds to next stage - continue=false: Reject transfer; gateway aborts and may trigger rollback - reason: Human-readable justification stored in audit logs  Security Considerations: - Inbound endpoints should use authentication (API keys, mTLS, JWT validation) - Decision payloads must include adapter ID to match the paused session state - All decisions are logged with timestamps for non-repudiation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**adapterId** | **string** | Adapter identifier that originally paused the SATP stage. | [default to undefined]
**sessionId** | **string** | Session identifier for the paused SATP transfer. | [default to undefined]
**contextId** | **string** | Optional transfer context identifier. | [optional] [default to undefined]
**_continue** | **boolean** | When true, the gateway resumes the paused stage. When false, the transfer  is rejected and the provided reason is logged. | [default to undefined]
**reason** | **string** | Human-readable justification for auditing and operator visibility. | [optional] [default to undefined]
**data** | **{ [key: string]: any; }** | Optional data payload from external system. | [optional] [default to undefined]

## Example

```typescript
import { DecideInboundWebhookRequest } from './api';

const instance: DecideInboundWebhookRequest = {
    adapterId,
    sessionId,
    contextId,
    _continue,
    reason,
    data,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
