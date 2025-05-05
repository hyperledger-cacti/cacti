# OracleRepeatableTaskAllOfSrcContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | **string** | The name of the contract. | 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | **string** | The name of the method to be invoked on the contract. | 
**Params** | [**[]OneOfstringnumber**](OneOfstringnumber.md) | The parameters to be passed to the contract method. | 

## Methods

### NewOracleRepeatableTaskAllOfSrcContract

`func NewOracleRepeatableTaskAllOfSrcContract(contractName string, methodName string, params []OneOfstringnumber, ) *OracleRepeatableTaskAllOfSrcContract`

NewOracleRepeatableTaskAllOfSrcContract instantiates a new OracleRepeatableTaskAllOfSrcContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRepeatableTaskAllOfSrcContractWithDefaults

`func NewOracleRepeatableTaskAllOfSrcContractWithDefaults() *OracleRepeatableTaskAllOfSrcContract`

NewOracleRepeatableTaskAllOfSrcContractWithDefaults instantiates a new OracleRepeatableTaskAllOfSrcContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.


### GetContractAddress

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *OracleRepeatableTaskAllOfSrcContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *OracleRepeatableTaskAllOfSrcContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *OracleRepeatableTaskAllOfSrcContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *OracleRepeatableTaskAllOfSrcContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *OracleRepeatableTaskAllOfSrcContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *OracleRepeatableTaskAllOfSrcContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *OracleRepeatableTaskAllOfSrcContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *OracleRepeatableTaskAllOfSrcContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *OracleRepeatableTaskAllOfSrcContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.


### GetParams

`func (o *OracleRepeatableTaskAllOfSrcContract) GetParams() []OneOfstringnumber`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *OracleRepeatableTaskAllOfSrcContract) GetParamsOk() (*[]OneOfstringnumber, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *OracleRepeatableTaskAllOfSrcContract) SetParams(v []OneOfstringnumber)`

SetParams sets Params field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


