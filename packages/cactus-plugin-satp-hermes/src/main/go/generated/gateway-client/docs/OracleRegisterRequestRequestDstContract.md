# OracleRegisterRequestRequestDstContract

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

### NewOracleRegisterRequestRequestDstContract

`func NewOracleRegisterRequestRequestDstContract() *OracleRegisterRequestRequestDstContract`

NewOracleRegisterRequestRequestDstContract instantiates a new OracleRegisterRequestRequestDstContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequestRequestDstContractWithDefaults

`func NewOracleRegisterRequestRequestDstContractWithDefaults() *OracleRegisterRequestRequestDstContract`

NewOracleRegisterRequestRequestDstContractWithDefaults instantiates a new OracleRegisterRequestRequestDstContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *OracleRegisterRequestRequestDstContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *OracleRegisterRequestRequestDstContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *OracleRegisterRequestRequestDstContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *OracleRegisterRequestRequestDstContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *OracleRegisterRequestRequestDstContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *OracleRegisterRequestRequestDstContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *OracleRegisterRequestRequestDstContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *OracleRegisterRequestRequestDstContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *OracleRegisterRequestRequestDstContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *OracleRegisterRequestRequestDstContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *OracleRegisterRequestRequestDstContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *OracleRegisterRequestRequestDstContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *OracleRegisterRequestRequestDstContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *OracleRegisterRequestRequestDstContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *OracleRegisterRequestRequestDstContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *OracleRegisterRequestRequestDstContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *OracleRegisterRequestRequestDstContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *OracleRegisterRequestRequestDstContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *OracleRegisterRequestRequestDstContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *OracleRegisterRequestRequestDstContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *OracleRegisterRequestRequestDstContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *OracleRegisterRequestRequestDstContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *OracleRegisterRequestRequestDstContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *OracleRegisterRequestRequestDstContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *OracleRegisterRequestRequestDstContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *OracleRegisterRequestRequestDstContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *OracleRegisterRequestRequestDstContract) GetParams() []OracleRegisterRequestRequestSrcContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *OracleRegisterRequestRequestDstContract) GetParamsOk() (*[]OracleRegisterRequestRequestSrcContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *OracleRegisterRequestRequestDstContract) SetParams(v []OracleRegisterRequestRequestSrcContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *OracleRegisterRequestRequestDstContract) HasParams() bool`

HasParams returns a boolean if a field has been set.

### GetEventSignature

`func (o *OracleRegisterRequestRequestDstContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *OracleRegisterRequestRequestDstContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *OracleRegisterRequestRequestDstContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *OracleRegisterRequestRequestDstContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


