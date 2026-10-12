# JvmType

Represents a reference to a JVM type (such as a Java class)

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**fqClassName** | **string** |  | [default to undefined]
**constructorName** | **string** | This parameter is used to specify that the function used to construct this JvmType is not a constructor function but instead is a factory function. Setting this parameter will cause the plugin to look up methods of the class denoted by fqClassName instead of its constructors. | [optional] [default to undefined]
**invocationTarget** | [**JvmObject**](JvmObject.md) |  | [optional] [default to undefined]

## Example

```typescript
import { JvmType } from './api';

const instance: JvmType = {
    fqClassName,
    constructorName,
    invocationTarget,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
