# HasKeychainEntryResponseV1


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**key** | **string** | The key that was used to check the presence of the value in the entry store. | [default to undefined]
**checkedAt** | **string** | Date and time encoded as JSON when the presence check was performed by the plugin backend. | [default to undefined]
**isPresent** | **boolean** | The boolean true or false indicating the presence or absence of an entry under \&#39;key\&#39;. | [default to undefined]

## Example

```typescript
import { HasKeychainEntryResponseV1 } from './api';

const instance: HasKeychainEntryResponseV1 = {
    key,
    checkedAt,
    isPresent,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
