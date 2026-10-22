# ChainCodeLifeCycleCommandResponses


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**packaging** | [**SSHExecCommandResponse**](SSHExecCommandResponse.md) |  | [optional] [default to undefined]
**installList** | [**Array&lt;SSHExecCommandResponse&gt;**](SSHExecCommandResponse.md) |  | [default to undefined]
**queryInstalledList** | [**Array&lt;SSHExecCommandResponse&gt;**](SSHExecCommandResponse.md) |  | [default to undefined]
**approveForMyOrgList** | [**Array&lt;SSHExecCommandResponse&gt;**](SSHExecCommandResponse.md) |  | [default to undefined]
**commit** | [**SSHExecCommandResponse**](SSHExecCommandResponse.md) |  | [optional] [default to undefined]
**queryCommitted** | [**SSHExecCommandResponse**](SSHExecCommandResponse.md) |  | [optional] [default to undefined]
**init** | [**SSHExecCommandResponse**](SSHExecCommandResponse.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ChainCodeLifeCycleCommandResponses } from './api';

const instance: ChainCodeLifeCycleCommandResponses = {
    packaging,
    installList,
    queryInstalledList,
    approveForMyOrgList,
    commit,
    queryCommitted,
    init,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
