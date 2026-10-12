# OutboundWebhookExecutionPoint

Execution point info embedded in outbound webhook payloads. Includes a computed name for logging/display purposes.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Computed name for the execution point (stepTag-point format). | [default to undefined]
**stage** | **number** | SATP stage number (0-3). | [default to undefined]
**step** | **string** | Stage-specific step identifier. | [default to undefined]
**point** | **string** | Execution order within the step. | [default to undefined]

## Example

```typescript
import { OutboundWebhookExecutionPoint } from './api';

const instance: OutboundWebhookExecutionPoint = {
    name,
    stage,
    step,
    point,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
