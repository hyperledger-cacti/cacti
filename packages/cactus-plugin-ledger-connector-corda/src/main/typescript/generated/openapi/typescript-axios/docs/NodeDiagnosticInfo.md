# NodeDiagnosticInfo

A NodeDiagnosticInfo holds information about the current node version.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cordapps** | [**Array&lt;CordappInfo&gt;**](CordappInfo.md) | A list of CorDapps currently installed on this node | [default to undefined]
**platformVersion** | **number** | The platform version of this node. This number represents a released API version, and should be used to make functionality decisions (e.g. enabling an app feature only if an underlying platform feature exists) | [default to undefined]
**revision** | **string** | The git commit hash this node was built from | [default to undefined]
**vendor** | **string** | The vendor of this node | [default to undefined]
**version** | **string** | The current node version string, e.g. 4.3, 4.4-SNAPSHOT. Note that this string is effectively freeform, and so should only be used for providing diagnostic information. It should not be used to make functionality decisions (the platformVersion is a better fit for this). | [default to undefined]

## Example

```typescript
import { NodeDiagnosticInfo } from './api';

const instance: NodeDiagnosticInfo = {
    cordapps,
    platformVersion,
    revision,
    vendor,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
