# ExecuteOracleTask200ResponseDstContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | Pointer to **string** | The name of the contract. | [optional] 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | Pointer to **string** | The name of the method to be invoked on the contract. | [optional] 
**Params** | Pointer to [**[]ExecuteOracleTaskRequestSourceContractParamsInner**](ExecuteOracleTaskRequestSourceContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] 

## Methods

### NewExecuteOracleTask200ResponseDstContract

`func NewExecuteOracleTask200ResponseDstContract() *ExecuteOracleTask200ResponseDstContract`

NewExecuteOracleTask200ResponseDstContract instantiates a new ExecuteOracleTask200ResponseDstContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewExecuteOracleTask200ResponseDstContractWithDefaults

`func NewExecuteOracleTask200ResponseDstContractWithDefaults() *ExecuteOracleTask200ResponseDstContract`

NewExecuteOracleTask200ResponseDstContractWithDefaults instantiates a new ExecuteOracleTask200ResponseDstContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *ExecuteOracleTask200ResponseDstContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *ExecuteOracleTask200ResponseDstContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *ExecuteOracleTask200ResponseDstContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *ExecuteOracleTask200ResponseDstContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *ExecuteOracleTask200ResponseDstContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *ExecuteOracleTask200ResponseDstContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *ExecuteOracleTask200ResponseDstContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *ExecuteOracleTask200ResponseDstContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *ExecuteOracleTask200ResponseDstContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *ExecuteOracleTask200ResponseDstContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *ExecuteOracleTask200ResponseDstContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *ExecuteOracleTask200ResponseDstContract) GetParams() []ExecuteOracleTaskRequestSourceContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *ExecuteOracleTask200ResponseDstContract) GetParamsOk() (*[]ExecuteOracleTaskRequestSourceContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *ExecuteOracleTask200ResponseDstContract) SetParams(v []ExecuteOracleTaskRequestSourceContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *ExecuteOracleTask200ResponseDstContract) HasParams() bool`

HasParams returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


