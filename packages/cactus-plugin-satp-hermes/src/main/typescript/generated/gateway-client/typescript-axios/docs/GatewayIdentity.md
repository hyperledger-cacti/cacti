# GatewayIdentity

The identity of the gateway.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | The unique identifier for the gateway. | [default to undefined]
**pubKey** | **string** | The public key of the gateway. | [default to undefined]
**name** | **string** | The name of the gateway. | [default to undefined]
**version** | [**Array&lt;AddCounterpartyRequestCounterpartyVersionInner&gt;**](AddCounterpartyRequestCounterpartyVersionInner.md) | The draft versions supported by the gateway. | [default to undefined]
**connectedDLTs** | [**Array&lt;TransactRequestSourceAssetNetworkId&gt;**](TransactRequestSourceAssetNetworkId.md) | The list of connected DLT networks. | [default to undefined]
**proofID** | **string** | The proof ID associated with the gateway. | [default to undefined]
**gatewayServerPort** | **number** | The server port of the gateway. | [default to undefined]
**gatewayClientPort** | **number** | The client port of the gateway. | [default to undefined]
**gatewayOapiPort** | **number** | The OpenAPI port of the gateway. | [optional] [default to undefined]
**gatewayUIPort** | **number** | The UI port of the gateway. | [optional] [default to undefined]
**address** | **string** | A blockchain address. | [default to undefined]

## Example

```typescript
import { GatewayIdentity } from './api';

const instance: GatewayIdentity = {
    id,
    pubKey,
    name,
    version,
    connectedDLTs,
    proofID,
    gatewayServerPort,
    gatewayClientPort,
    gatewayOapiPort,
    gatewayUIPort,
    address,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
