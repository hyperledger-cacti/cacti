# DecideInboundWebhook200Response

Response returned by the gateway after processing an inbound webhook decision. Indicates whether the decision was accepted and the resulting session state.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**accepted** | **boolean** | Whether the decision was accepted and applied to the session. | [default to undefined]
**sessionId** | **string** | Session identifier for the affected SATP transfer. | [default to undefined]
**message** | **string** | Human-readable message describing the result. | [optional] [default to undefined]
**timestamp** | **string** | Timestamp when the decision was processed. | [optional] [default to undefined]

## Example

```typescript
import { DecideInboundWebhook200Response } from './api';

const instance: DecideInboundWebhook200Response = {
    accepted,
    sessionId,
    message,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
