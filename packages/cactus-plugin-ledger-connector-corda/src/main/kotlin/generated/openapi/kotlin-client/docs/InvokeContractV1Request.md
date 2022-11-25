
# InvokeContractV1Request

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**flowFullClassName** | **kotlin.String** | The fully qualified name of the Corda flow to invoke | 
**flowInvocationType** | [**FlowInvocationType**](FlowInvocationType.md) |  | 
**params** | [**kotlin.collections.List&lt;JvmObject&gt;**](JvmObject.md) | The list of arguments to pass in to the contract method being invoked. | 
**timeoutMs** | **kotlin.Int** | The amount of milliseconds to wait for a transaction receipt beforegiving up and crashing. |  [optional]



