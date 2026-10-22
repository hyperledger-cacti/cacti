# DeployContractJarsV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cordappDeploymentConfigs** | [**Array&lt;CordappDeploymentConfig&gt;**](CordappDeploymentConfig.md) | The list of deployment configurations pointing to the nodes where the provided cordapp jar files are to be deployed . | [default to undefined]
**jarFiles** | [**Array&lt;JarFile&gt;**](JarFile.md) |  | [default to undefined]

## Example

```typescript
import { DeployContractJarsV1Request } from './api';

const instance: DeployContractJarsV1Request = {
    cordappDeploymentConfigs,
    jarFiles,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
