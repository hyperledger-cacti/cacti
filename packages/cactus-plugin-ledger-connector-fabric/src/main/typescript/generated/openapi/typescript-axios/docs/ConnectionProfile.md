# ConnectionProfile


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** |  | [default to undefined]
**x_type** | **string** |  | [optional] [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**version** | **string** |  | [default to undefined]
**client** | [**ConnectionProfileClient**](ConnectionProfileClient.md) |  | [optional] [default to undefined]
**channels** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**organizations** | **{ [key: string]: any; }** |  | [default to undefined]
**orderers** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**peers** | **{ [key: string]: any; }** |  | [default to undefined]
**certificateAuthorities** | **{ [key: string]: any; }** |  | [optional] [default to undefined]

## Example

```typescript
import { ConnectionProfile } from './api';

const instance: ConnectionProfile = {
    name,
    x_type,
    description,
    version,
    client,
    channels,
    organizations,
    orderers,
    peers,
    certificateAuthorities,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
