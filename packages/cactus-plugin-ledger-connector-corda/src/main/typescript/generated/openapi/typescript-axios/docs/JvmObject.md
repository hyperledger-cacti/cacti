# JvmObject

Can represent JVM primitive and reference types as well. The jvmTypeKind field indicates which one is being stored. If the jvmTypeKind field is set to REFERENCE then the jvmCtorArgs array is expected to be filled, otherwise (e.g. PRIMITIVE jvmTypeKind) it is expected that the primitiveValue property is filled with a primitive data type supported by the JSON standard such as strings, booleans, numbers, etc.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**jvmTypeKind** | [**JvmTypeKind**](JvmTypeKind.md) |  | [default to undefined]
**primitiveValue** | **any** |  | [optional] [default to undefined]
**jvmCtorArgs** | [**Array&lt;JvmObject&gt;**](JvmObject.md) |  | [optional] [default to undefined]
**jvmType** | [**JvmType**](JvmType.md) |  | [default to undefined]

## Example

```typescript
import { JvmObject } from './api';

const instance: JvmObject = {
    jvmTypeKind,
    primitiveValue,
    jvmCtorArgs,
    jvmType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
