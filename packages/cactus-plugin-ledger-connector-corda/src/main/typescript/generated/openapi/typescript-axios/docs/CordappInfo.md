# CordappInfo

A CordappInfo describes a single CorDapp currently installed on the node

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**jarHash** | [**SHA256**](SHA256.md) |  | [default to undefined]
**licence** | **string** | The name of the licence this CorDapp is released under | [default to undefined]
**minimumPlatformVersion** | **number** | The minimum platform version the node must be at for the CorDapp to run | [default to undefined]
**name** | **string** | The name of the JAR file that defines the CorDapp | [default to undefined]
**shortName** | **string** | The name of the CorDapp | [default to undefined]
**targetPlatformVersion** | **number** | The target platform version this CorDapp has been tested against | [default to undefined]
**type** | **string** | A description of what sort of CorDapp this is - either a contract, workflow, or a combination. | [default to undefined]
**vendor** | **string** | The vendor of this CorDapp | [default to undefined]
**version** | **string** | The version of this CorDapp | [default to undefined]

## Example

```typescript
import { CordappInfo } from './api';

const instance: CordappInfo = {
    jarHash,
    licence,
    minimumPlatformVersion,
    name,
    shortName,
    targetPlatformVersion,
    type,
    vendor,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
