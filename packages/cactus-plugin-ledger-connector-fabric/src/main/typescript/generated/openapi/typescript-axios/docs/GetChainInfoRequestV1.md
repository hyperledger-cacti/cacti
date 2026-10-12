# GetChainInfoRequestV1

Request for GetChainInfo endpoint.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channelName** | **string** | Fabric channel which we want to query. | [default to undefined]
**connectionChannelName** | **string** | Fabric channel we want to connect to. If not provided, then one from channelName parameter will be used | [optional] [default to undefined]
**gatewayOptions** | [**GatewayOptions**](GatewayOptions.md) |  | [default to undefined]

## Example

```typescript
import { GetChainInfoRequestV1 } from './api';

const instance: GetChainInfoRequestV1 = {
    channelName,
    connectionChannelName,
    gatewayOptions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
