# RegisterOracleTask200ResponseAllOfOperationsInnerContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | Pointer to **string** | The name of the contract. | [optional] 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | Pointer to **string** | The name of the method to be invoked on the contract. | [optional] 
**Params** | Pointer to [**[]RegisterOracleTaskRequestSourceContractParamsInner**](RegisterOracleTaskRequestSourceContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] 
**EventSignature** | Pointer to **string** | The event signatures to listen for on the source network. To be defined if task mode is EVENT_LISTENING. | [optional] 

## Methods

### NewRegisterOracleTask200ResponseAllOfOperationsInnerContract

`func NewRegisterOracleTask200ResponseAllOfOperationsInnerContract() *RegisterOracleTask200ResponseAllOfOperationsInnerContract`

NewRegisterOracleTask200ResponseAllOfOperationsInnerContract instantiates a new RegisterOracleTask200ResponseAllOfOperationsInnerContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRegisterOracleTask200ResponseAllOfOperationsInnerContractWithDefaults

`func NewRegisterOracleTask200ResponseAllOfOperationsInnerContractWithDefaults() *RegisterOracleTask200ResponseAllOfOperationsInnerContract`

NewRegisterOracleTask200ResponseAllOfOperationsInnerContractWithDefaults instantiates a new RegisterOracleTask200ResponseAllOfOperationsInnerContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetParams() []RegisterOracleTaskRequestSourceContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetParamsOk() (*[]RegisterOracleTaskRequestSourceContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetParams(v []RegisterOracleTaskRequestSourceContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasParams() bool`

HasParams returns a boolean if a field has been set.

### GetEventSignature

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *RegisterOracleTask200ResponseAllOfOperationsInnerContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


