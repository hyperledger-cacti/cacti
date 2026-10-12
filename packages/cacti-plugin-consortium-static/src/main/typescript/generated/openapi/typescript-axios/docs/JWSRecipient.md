# JWSRecipient

A JSON Web Signature. See: https://tools.ietf.org/html/rfc7515 for info about standard.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **string** |  | [default to undefined]
**protected** | **string** |  | [optional] [default to undefined]
**header** | **{ [key: string]: any; }** |  | [optional] [default to undefined]

## Example

```typescript
import { JWSRecipient } from './api';

const instance: JWSRecipient = {
    signature,
    protected,
    header,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
