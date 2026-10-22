# AdapterLayerConfigurationAdaptersInner

Adapter definition - a configuration unit that defines webhooks for specific execution points in the SATP protocol flow.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Stable identifier used for logging and inbound routing. | [default to undefined]
**name** | **string** | Human-friendly adapter label. | [default to undefined]
**description** | **string** | Optional textual description for operators. | [optional] [default to undefined]
**active** | **boolean** | Enables/disables adapter without removing its configuration. | [default to undefined]
**priority** | **number** | Priority ordering when multiple adapters are registered at the same execution point. Lower numbers run earlier. | [optional] [default to 1000]
**executionPoints** | [**Array&lt;AdapterDefinitionExecutionPointsInner&gt;**](AdapterDefinitionExecutionPointsInner.md) | Execution points where this adapter should be invoked. | [default to undefined]
**outboundWebhook** | [**AdapterDefinitionOutboundWebhook**](AdapterDefinitionOutboundWebhook.md) |  | [optional] [default to undefined]
**outboundWebhooks** | [**Array&lt;AdapterDefinitionOutboundWebhook&gt;**](AdapterDefinitionOutboundWebhook.md) | Array of outbound webhooks when multiple notifications are needed. | [optional] [default to undefined]
**inboundWebhook** | [**AdapterDefinitionInboundWebhook**](AdapterDefinitionInboundWebhook.md) |  | [optional] [default to undefined]
**inboundWebhooks** | [**Array&lt;AdapterDefinitionInboundWebhook&gt;**](AdapterDefinitionInboundWebhook.md) | Array of inbound webhooks when multiple approvals are needed. | [optional] [default to undefined]

## Example

```typescript
import { AdapterLayerConfigurationAdaptersInner } from './api';

const instance: AdapterLayerConfigurationAdaptersInner = {
    id,
    name,
    description,
    active,
    priority,
    executionPoints,
    outboundWebhook,
    outboundWebhooks,
    inboundWebhook,
    inboundWebhooks,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
