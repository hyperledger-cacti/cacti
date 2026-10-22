# JarFile


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**filename** | **string** |  | [default to undefined]
**hasDbMigrations** | **boolean** | Indicates whether the cordapp jar in question contains any embedded migrations that Cactus can/should execute between copying the jar into the cordapp directory and starting the node back up. | [default to undefined]
**contentBase64** | **string** |  | [default to undefined]

## Example

```typescript
import { JarFile } from './api';

const instance: JarFile = {
    filename,
    hasDbMigrations,
    contentBase64,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
