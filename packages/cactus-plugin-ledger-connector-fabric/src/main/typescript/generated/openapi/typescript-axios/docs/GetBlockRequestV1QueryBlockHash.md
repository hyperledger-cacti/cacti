# GetBlockRequestV1QueryBlockHash

Select block by it\'s hash.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**encoding** | **string** | NodeJS Buffer encoding (utf-8, hex, binary, base64, etc...). Passed directly to &#x60;Buffer.from()&#x60; call on hashBuffer. If not provided then JSON buffer format is assumed. | [optional] [default to undefined]
**buffer** | **string** | Buffer of blockHash. It\&#39;s encoding should be described in &#x60;encoding&#x60; parameter. | [default to undefined]

## Example

```typescript
import { GetBlockRequestV1QueryBlockHash } from './api';

const instance: GetBlockRequestV1QueryBlockHash = {
    encoding,
    buffer,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
