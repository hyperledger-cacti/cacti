# GetDiscoveryResultsResponseV1

Response for GetDiscoveryResults endpoint.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**msps** | [**{ [key: string]: GetDiscoveryResultsResponseV1MspsValue; }**](GetDiscoveryResultsResponseV1MspsValue.md) | Definitions of all MSP defined on the channel | [default to undefined]
**orderers** | [**{ [key: string]: GetDiscoveryResultsResponseV1OrderersValue; }**](GetDiscoveryResultsResponseV1OrderersValue.md) | List of orderers defined on the channel | [default to undefined]
**peersByMSP** | [**{ [key: string]: GetDiscoveryResultsResponseV1PeersByMSPValue; }**](GetDiscoveryResultsResponseV1PeersByMSPValue.md) | List of peers organized by owner MSP. | [default to undefined]
**timestamp** | **number** |  | [default to undefined]

## Example

```typescript
import { GetDiscoveryResultsResponseV1 } from './api';

const instance: GetDiscoveryResultsResponseV1 = {
    msps,
    orderers,
    peersByMSP,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
