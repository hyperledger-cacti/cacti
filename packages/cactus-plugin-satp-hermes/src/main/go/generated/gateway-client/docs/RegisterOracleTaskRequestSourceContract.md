# RegisterOracleTaskRequestSourceContract

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

### NewRegisterOracleTaskRequestSourceContract

`func NewRegisterOracleTaskRequestSourceContract() *RegisterOracleTaskRequestSourceContract`

NewRegisterOracleTaskRequestSourceContract instantiates a new RegisterOracleTaskRequestSourceContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRegisterOracleTaskRequestSourceContractWithDefaults

`func NewRegisterOracleTaskRequestSourceContractWithDefaults() *RegisterOracleTaskRequestSourceContract`

NewRegisterOracleTaskRequestSourceContractWithDefaults instantiates a new RegisterOracleTaskRequestSourceContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *RegisterOracleTaskRequestSourceContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *RegisterOracleTaskRequestSourceContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *RegisterOracleTaskRequestSourceContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *RegisterOracleTaskRequestSourceContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *RegisterOracleTaskRequestSourceContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *RegisterOracleTaskRequestSourceContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *RegisterOracleTaskRequestSourceContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *RegisterOracleTaskRequestSourceContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *RegisterOracleTaskRequestSourceContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *RegisterOracleTaskRequestSourceContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *RegisterOracleTaskRequestSourceContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *RegisterOracleTaskRequestSourceContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *RegisterOracleTaskRequestSourceContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *RegisterOracleTaskRequestSourceContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *RegisterOracleTaskRequestSourceContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *RegisterOracleTaskRequestSourceContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *RegisterOracleTaskRequestSourceContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *RegisterOracleTaskRequestSourceContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *RegisterOracleTaskRequestSourceContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *RegisterOracleTaskRequestSourceContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *RegisterOracleTaskRequestSourceContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *RegisterOracleTaskRequestSourceContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *RegisterOracleTaskRequestSourceContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *RegisterOracleTaskRequestSourceContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *RegisterOracleTaskRequestSourceContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *RegisterOracleTaskRequestSourceContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *RegisterOracleTaskRequestSourceContract) GetParams() []ExecuteOracleTaskRequestSourceContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *RegisterOracleTaskRequestSourceContract) GetParamsOk() (*[]ExecuteOracleTaskRequestSourceContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *RegisterOracleTaskRequestSourceContract) SetParams(v []ExecuteOracleTaskRequestSourceContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *RegisterOracleTaskRequestSourceContract) HasParams() bool`

HasParams returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


