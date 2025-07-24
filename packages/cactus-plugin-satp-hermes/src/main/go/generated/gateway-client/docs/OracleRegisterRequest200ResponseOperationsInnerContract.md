# OracleRegisterRequest200ResponseOperationsInnerContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | Pointer to **string** | The name of the contract. | [optional] 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | Pointer to **string** | The name of the method to be invoked on the contract. | [optional] 
**Params** | Pointer to [**[]OracleRegisterRequestRequestSourceContractParamsInner**](OracleRegisterRequestRequestSourceContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] 
**EventSignature** | Pointer to **string** | The event signatures to listen for on the source network. To be defined if task mode is EVENT_LISTENING. | [optional] 

## Methods

### NewOracleRegisterRequest200ResponseOperationsInnerContract

`func NewOracleRegisterRequest200ResponseOperationsInnerContract() *OracleRegisterRequest200ResponseOperationsInnerContract`

NewOracleRegisterRequest200ResponseOperationsInnerContract instantiates a new OracleRegisterRequest200ResponseOperationsInnerContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequest200ResponseOperationsInnerContractWithDefaults

`func NewOracleRegisterRequest200ResponseOperationsInnerContractWithDefaults() *OracleRegisterRequest200ResponseOperationsInnerContract`

NewOracleRegisterRequest200ResponseOperationsInnerContractWithDefaults instantiates a new OracleRegisterRequest200ResponseOperationsInnerContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetParams() []OracleRegisterRequestRequestSourceContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetParamsOk() (*[]OracleRegisterRequestRequestSourceContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetParams(v []OracleRegisterRequestRequestSourceContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasParams() bool`

HasParams returns a boolean if a field has been set.

### GetEventSignature

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleRegisterRequest200ResponseOperationsInnerContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


