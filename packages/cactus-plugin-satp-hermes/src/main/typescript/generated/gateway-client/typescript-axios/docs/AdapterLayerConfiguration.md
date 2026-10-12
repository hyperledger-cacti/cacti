# AdapterLayerConfiguration

Root configuration structure for the adapter layer. Loaded from YAML configuration files (e.g., adapter-config.yml) and used to configure webhook-based integrations with external systems.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**adapters** | [**Array&lt;AdapterLayerConfigurationAdaptersInner&gt;**](AdapterLayerConfigurationAdaptersInner.md) | Flat list of adapters, each defining their own execution points. | [default to undefined]
**global** | [**AdapterLayerConfigurationGlobal**](AdapterLayerConfigurationGlobal.md) |  | [optional] [default to undefined]

## Example

```typescript
import { AdapterLayerConfiguration } from './api';

const instance: AdapterLayerConfiguration = {
    adapters,
    global,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
