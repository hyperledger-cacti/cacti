# IntegrationDetails

Describes integration or tool details such as bridges or exchanges involved in the transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**key** | **string** | A unique identifier for the integration or tool. | [default to undefined]
**name** | **string** | The name of the integration or tool. | [default to undefined]
**logoURI** | **string** | URL to the logo of the integration or tool. | [default to undefined]

## Example

```typescript
import { IntegrationDetails } from './api';

const instance: IntegrationDetails = {
    key,
    name,
    logoURI,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
