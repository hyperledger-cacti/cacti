# FileBase64

Represents a file-system file that has a name and a body which holds the file contents as a Base64 encoded string

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**body** | **string** | The file\&#39;s contents encoded as a Base64 string. | [default to undefined]
**filename** | **string** | The name as referred to on a file system | [default to undefined]
**filepath** | **string** | The relative path of the file, if it should be placed in a sub-directory | [optional] [default to undefined]

## Example

```typescript
import { FileBase64 } from './api';

const instance: FileBase64 = {
    body,
    filename,
    filepath,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
