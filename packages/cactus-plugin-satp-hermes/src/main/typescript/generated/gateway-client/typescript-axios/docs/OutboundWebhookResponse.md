# OutboundWebhookResponse

Expected response from external systems receiving outbound webhook payloads. The gateway uses this response to determine whether to continue or abort.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**received** | **boolean** | Whether the webhook was successfully received and processed. | [optional] [default to undefined]
**status** | **string** | Status of the webhook processing. | [optional] [default to undefined]
**message** | **string** | Optional message from the external system. | [optional] [default to undefined]
**data** | **{ [key: string]: any; }** | Optional response data from the external system. | [optional] [default to undefined]

## Example

```typescript
import { OutboundWebhookResponse } from './api';

const instance: OutboundWebhookResponse = {
    received,
    status,
    message,
    data,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
