# WatchBlocksV1Options


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parties** | **Array&lt;string&gt;** | Parties whose transactions are streamed. Each must be allowed by the connector. | [default to undefined]
**templateIds** | **Array&lt;string&gt;** | Restricts events to these templates. Use the package-name form (&#x60;#package-name:Module:Template&#x60;). | [optional] [default to undefined]
**interfaceIds** | **Array&lt;string&gt;** | Restricts events to contracts implementing these interfaces. | [optional] [default to undefined]
**lastSeenOffset** | **number** | Streams transactions after this offset, for example the last &#x60;offset&#x60; received before a reconnect. Defaults to the ledger end when subscribing. | [optional] [default to undefined]

## Example

```typescript
import { WatchBlocksV1Options } from './api';

const instance: WatchBlocksV1Options = {
    parties,
    templateIds,
    interfaceIds,
    lastSeenOffset,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
