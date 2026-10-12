# AdapterExecutionPointDefinition

Execution point definition - specifies where an adapter should execute within the SATP protocol flow.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**stage** | **string** | Supported SATP stage identifiers that can host adapters. Stage 0-3 represent the four phases of the SATP protocol, while \&#39;crash\&#39; is used for crash recovery scenarios. | [default to undefined]
**step** | **string** | Stage-specific step identifier. | [default to undefined]
**point** | **string** | Execution steps inside a stage where adapters can hook into. | [default to undefined]

## Example

```typescript
import { AdapterExecutionPointDefinition } from './api';

const instance: AdapterExecutionPointDefinition = {
    stage,
    step,
    point,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
