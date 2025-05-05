# OracleExecuteRequest200ResponseOperationsInnerContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | **string** | The name of the contract. | 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | **string** | The name of the method to be invoked on the contract. | 
**Params** | [**[]OracleRegisterRequestRequestSourceContractParamsInner**](OracleRegisterRequestRequestSourceContractParamsInner.md) | The parameters to be passed to the contract method. | 
**EventSignature** | Pointer to **NullableString** | The signature of the event emitted by the contract when READING. | [optional] 

## Methods

### NewOracleExecuteRequest200ResponseOperationsInnerContract

`func NewOracleExecuteRequest200ResponseOperationsInnerContract(contractName string, methodName string, params []OracleRegisterRequestRequestSourceContractParamsInner, ) *OracleExecuteRequest200ResponseOperationsInnerContract`

NewOracleExecuteRequest200ResponseOperationsInnerContract instantiates a new OracleExecuteRequest200ResponseOperationsInnerContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleExecuteRequest200ResponseOperationsInnerContractWithDefaults

`func NewOracleExecuteRequest200ResponseOperationsInnerContractWithDefaults() *OracleExecuteRequest200ResponseOperationsInnerContract`

NewOracleExecuteRequest200ResponseOperationsInnerContractWithDefaults instantiates a new OracleExecuteRequest200ResponseOperationsInnerContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.


### GetContractAddress

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.


### GetParams

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetParams() []OracleRegisterRequestRequestSourceContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetParamsOk() (*[]OracleRegisterRequestRequestSourceContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetParams(v []OracleRegisterRequestRequestSourceContractParamsInner)`

SetParams sets Params field to given value.


### GetEventSignature

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.

### SetEventSignatureNil

`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) SetEventSignatureNil(b bool)`

 SetEventSignatureNil sets the value for EventSignature to be an explicit nil

### UnsetEventSignature
`func (o *OracleExecuteRequest200ResponseOperationsInnerContract) UnsetEventSignature()`

UnsetEventSignature ensures that no value is present for EventSignature, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


