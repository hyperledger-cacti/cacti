# WebSocketKey

web-socket key details for signing fabric message with private key stored with external client

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sessionId** | **string** | session Id to access client | [default to undefined]
**signature** | **string** | signature of the session ID | [default to undefined]

## Example

```typescript
import { WebSocketKey } from './api';

const instance: WebSocketKey = {
    sessionId,
    signature,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
