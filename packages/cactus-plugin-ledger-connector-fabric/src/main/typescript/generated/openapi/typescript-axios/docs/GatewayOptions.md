# GatewayOptions


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**connectionProfile** | [**ConnectionProfile**](ConnectionProfile.md) |  | [optional] [default to undefined]
**discovery** | [**GatewayDiscoveryOptions**](GatewayDiscoveryOptions.md) |  | [optional] [default to undefined]
**eventHandlerOptions** | [**GatewayEventHandlerOptions**](GatewayEventHandlerOptions.md) |  | [optional] [default to undefined]
**identity** | **string** |  | [default to undefined]
**wallet** | [**GatewayOptionsWallet**](GatewayOptionsWallet.md) |  | [default to undefined]

## Example

```typescript
import { GatewayOptions } from './api';

const instance: GatewayOptions = {
    connectionProfile,
    discovery,
    eventHandlerOptions,
    identity,
    wallet,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
