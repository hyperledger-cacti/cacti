# GetBlockRequestV1

Request for GetBlock endpoint.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channelName** | **string** | Fabric channel which we want to query. | [default to undefined]
**connectionChannelName** | **string** | Fabric channel we want to connect to. If not provided, then one from channelName parameter will be used | [optional] [default to undefined]
**gatewayOptions** | [**GatewayOptions**](GatewayOptions.md) |  | [default to undefined]
**query** | [**GetBlockRequestV1Query**](GetBlockRequestV1Query.md) |  | [default to undefined]
**responseType** | [**GetBlockResponseTypeV1**](GetBlockResponseTypeV1.md) |  | [optional] [default to undefined]

## Example

```typescript
import { GetBlockRequestV1 } from './api';

const instance: GetBlockRequestV1 = {
    channelName,
    connectionChannelName,
    gatewayOptions,
    query,
    responseType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
