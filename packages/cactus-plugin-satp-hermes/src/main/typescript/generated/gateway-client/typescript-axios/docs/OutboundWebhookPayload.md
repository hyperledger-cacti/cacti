# OutboundWebhookPayload

Outbound webhook payload delivering SATP transfer telemetry to external monitoring or automation systems. All outbound payloads follow a consistent  envelope containing event type, session identifiers, gateway identity, and stage-specific payload data.  Payload Structure: - Event type and schema version for client-side parsing logic - SATP session/context identifiers for correlation across stages - Gateway identity for multi-gateway deployment visibility - ISO 8601 timestamp for precise event ordering - Stage-specific payload with DLT proofs, transaction hashes, or error details  Integration Patterns: - Monitoring Dashboards: Visualize transfer progress and latency metrics - Audit Systems: Record immutable event logs for compliance and forensics - Alerting Platforms: Trigger notifications on transfer failures or anomalies - Analytics Pipelines: Aggregate events for performance analysis and reporting

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**eventType** | **string** | Event type representing a distinct lifecycle moment in SATP protocol execution. External systems can filter and route events based on type.  Event Types: - stage.started: SATP stage has begun execution (outbound hooks at \&#39;before\&#39; step) - stage.completed: SATP stage finished successfully (outbound hooks at \&#39;after\&#39; step) - stage.failed: SATP stage encountered an error and may trigger rollback - adapter.retry: Adapter webhook is retrying after transient failure - adapter.skipped: Adapter was bypassed (inactive or condition not met) | [default to undefined]
**schemaVersion** | **string** | Semantic version of the payload contract. | [default to undefined]
**executionPoints** | [**OutboundWebhookPayloadExecutionPoints**](OutboundWebhookPayloadExecutionPoints.md) |  | [default to undefined]
**adapterId** | **string** | Adapter identifier (matches configuration id). | [default to undefined]
**sessionId** | **string** | SATP session identifier for correlation. | [default to undefined]
**contextId** | **string** | Optional transfer context identifier propagated from API1. | [optional] [default to undefined]
**gatewayId** | **string** | Gateway identifier emitting the notification. | [default to undefined]
**payload** | **{ [key: string]: any; }** | Stage-specific metadata. For example, Stage 1 includes lock proofs while Stage 3 may contain mint/burn receipts. | [optional] [default to undefined]
**timestamp** | **string** | ISO 8601 timestamp for when the event was emitted. | [default to undefined]
**message** | **string** | Optional human-readable description or error message. | [optional] [default to undefined]

## Example

```typescript
import { OutboundWebhookPayload } from './api';

const instance: OutboundWebhookPayload = {
    eventType,
    schemaVersion,
    executionPoints,
    adapterId,
    sessionId,
    contextId,
    gatewayId,
    payload,
    timestamp,
    message,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
