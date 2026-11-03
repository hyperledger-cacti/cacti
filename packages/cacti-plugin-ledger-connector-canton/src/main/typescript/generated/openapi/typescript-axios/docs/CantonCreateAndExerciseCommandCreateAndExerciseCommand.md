# CantonCreateAndExerciseCommandCreateAndExerciseCommand


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**templateId** | **string** |  | [default to undefined]
**createArguments** | **{ [key: string]: any; }** | A Daml record encoded as a JSON object of field names to Daml values. | [default to undefined]
**choice** | **string** |  | [default to undefined]
**choiceArgument** | **any** | A Daml-LF value in the Canton JSON Ledger API encoding: any JSON value, including null for an empty Optional. Nested values are validated by the connector (finite, acyclic JSON, at most 64 nesting levels and 1 MiB per transaction) and by the ledger against the Daml type. | [default to undefined]

## Example

```typescript
import { CantonCreateAndExerciseCommandCreateAndExerciseCommand } from './api';

const instance: CantonCreateAndExerciseCommandCreateAndExerciseCommand = {
    templateId,
    createArguments,
    choice,
    choiceArgument,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
