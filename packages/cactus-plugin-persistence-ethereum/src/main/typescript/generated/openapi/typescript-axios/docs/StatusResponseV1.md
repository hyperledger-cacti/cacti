# StatusResponseV1

Response with plugin status report.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**instanceId** | **string** | Plugin instance id. | [default to undefined]
**connected** | **boolean** | True if successfully connected to the database, false otherwise. | [default to undefined]
**webServicesRegistered** | **boolean** | True if web services were correctly exported. | [default to undefined]
**monitoredTokensCount** | **number** | Total number of tokens being monitored by the plugin. | [default to undefined]
**operationsRunning** | [**Array&lt;TrackedOperationV1&gt;**](TrackedOperationV1.md) |  | [default to undefined]
**monitorRunning** | **boolean** | True if block monitoring is running, false otherwise. | [default to undefined]
**lastSeenBlock** | **number** | Number of the last block seen by the block monitor. | [default to undefined]

## Example

```typescript
import { StatusResponseV1 } from './api';

const instance: StatusResponseV1 = {
    instanceId,
    connected,
    webServicesRegistered,
    monitoredTokensCount,
    operationsRunning,
    monitorRunning,
    lastSeenBlock,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
