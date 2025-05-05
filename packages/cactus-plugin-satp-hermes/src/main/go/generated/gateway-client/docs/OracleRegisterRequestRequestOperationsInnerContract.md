# OracleRegisterRequestRequestOperationsInnerContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | Pointer to **string** | The name of the contract. | [optional] 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | Pointer to **string** | The name of the method to be invoked on the contract. | [optional] 
**Params** | Pointer to [**[]OracleRegisterRequestRequestSrcContractParamsInner**](OracleRegisterRequestRequestSrcContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] 
**EventSignature** | Pointer to **string** | The event signatures to listen for on the source network. To be defined if task mode is EVENT_LISTENING. | [optional] 

## Methods

### NewOracleRegisterRequestRequestOperationsInnerContract

`func NewOracleRegisterRequestRequestOperationsInnerContract() *OracleRegisterRequestRequestOperationsInnerContract`

NewOracleRegisterRequestRequestOperationsInnerContract instantiates a new OracleRegisterRequestRequestOperationsInnerContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestRequestOperationsInnerContractWithDefaults

`func NewOracleRegisterRequestRequestOperationsInnerContractWithDefaults() *OracleRegisterRequestRequestOperationsInnerContract`

NewOracleRegisterRequestRequestOperationsInnerContractWithDefaults instantiates a new OracleRegisterRequestRequestOperationsInnerContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *OracleRegisterRequestRequestOperationsInnerContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *OracleRegisterRequestRequestOperationsInnerContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *OracleRegisterRequestRequestOperationsInnerContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetParams() []OracleRegisterRequestRequestSrcContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetParamsOk() (*[]OracleRegisterRequestRequestSrcContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetParams(v []OracleRegisterRequestRequestSrcContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasParams() bool`

HasParams returns a boolean if a field has been set.

### GetEventSignature

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleRegisterRequestRequestOperationsInnerContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleRegisterRequestRequestOperationsInnerContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleRegisterRequestRequestOperationsInnerContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


