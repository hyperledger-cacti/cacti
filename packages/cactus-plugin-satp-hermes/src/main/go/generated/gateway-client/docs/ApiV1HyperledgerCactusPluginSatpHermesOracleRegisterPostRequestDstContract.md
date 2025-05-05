# ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContractName** | Pointer to **string** | The name of the contract. | [optional] 
**ContractAddress** | Pointer to **NullableString** | The address of the contract. | [optional] 
**ContractAbi** | Pointer to **[]map[string]interface{}** | The ABI (Application Binary Interface) of the contract. | [optional] 
**ContractBytecode** | Pointer to **NullableString** | The bytecode of the contract. | [optional] 
**MethodName** | Pointer to **string** | The name of the method to be invoked on the contract. | [optional] 
**Params** | Pointer to [**[]ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContractParamsInner**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContractParamsInner.md) | The parameters to be passed to the contract method. | [optional] 
**EventSignature** | Pointer to **string** | The event signatures to listen for on the source network. To be defined if task mode is EVENT_LISTENING. | [optional] 

## Methods

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract() *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContractWithDefaults

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContractWithDefaults() *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContractWithDefaults instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContractName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractName() string`

GetContractName returns the ContractName field if non-nil, zero value otherwise.

### GetContractNameOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractNameOk() (*string, bool)`

GetContractNameOk returns a tuple with the ContractName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractName(v string)`

SetContractName sets ContractName field to given value.

### HasContractName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasContractName() bool`

HasContractName returns a boolean if a field has been set.

### GetContractAddress

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractAddress() string`

GetContractAddress returns the ContractAddress field if non-nil, zero value otherwise.

### GetContractAddressOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractAddressOk() (*string, bool)`

GetContractAddressOk returns a tuple with the ContractAddress field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAddress

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractAddress(v string)`

SetContractAddress sets ContractAddress field to given value.

### HasContractAddress

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasContractAddress() bool`

HasContractAddress returns a boolean if a field has been set.

### SetContractAddressNil

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractAddressNil(b bool)`

 SetContractAddressNil sets the value for ContractAddress to be an explicit nil

### UnsetContractAddress
`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) UnsetContractAddress()`

UnsetContractAddress ensures that no value is present for ContractAddress, not even an explicit nil
### GetContractAbi

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractAbi() []map[string]interface{}`

GetContractAbi returns the ContractAbi field if non-nil, zero value otherwise.

### GetContractAbiOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractAbiOk() (*[]map[string]interface{}, bool)`

GetContractAbiOk returns a tuple with the ContractAbi field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractAbi

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractAbi(v []map[string]interface{})`

SetContractAbi sets ContractAbi field to given value.

### HasContractAbi

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasContractAbi() bool`

HasContractAbi returns a boolean if a field has been set.

### SetContractAbiNil

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractAbiNil(b bool)`

 SetContractAbiNil sets the value for ContractAbi to be an explicit nil

### UnsetContractAbi
`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) UnsetContractAbi()`

UnsetContractAbi ensures that no value is present for ContractAbi, not even an explicit nil
### GetContractBytecode

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractBytecode() string`

GetContractBytecode returns the ContractBytecode field if non-nil, zero value otherwise.

### GetContractBytecodeOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetContractBytecodeOk() (*string, bool)`

GetContractBytecodeOk returns a tuple with the ContractBytecode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContractBytecode

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractBytecode(v string)`

SetContractBytecode sets ContractBytecode field to given value.

### HasContractBytecode

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasContractBytecode() bool`

HasContractBytecode returns a boolean if a field has been set.

### SetContractBytecodeNil

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetContractBytecodeNil(b bool)`

 SetContractBytecodeNil sets the value for ContractBytecode to be an explicit nil

### UnsetContractBytecode
`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) UnsetContractBytecode()`

UnsetContractBytecode ensures that no value is present for ContractBytecode, not even an explicit nil
### GetMethodName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetMethodName() string`

GetMethodName returns the MethodName field if non-nil, zero value otherwise.

### GetMethodNameOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetMethodNameOk() (*string, bool)`

GetMethodNameOk returns a tuple with the MethodName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMethodName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetMethodName(v string)`

SetMethodName sets MethodName field to given value.

### HasMethodName

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasMethodName() bool`

HasMethodName returns a boolean if a field has been set.

### GetParams

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetParams() []ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContractParamsInner`

GetParams returns the Params field if non-nil, zero value otherwise.

### GetParamsOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetParamsOk() (*[]ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContractParamsInner, bool)`

GetParamsOk returns a tuple with the Params field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParams

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetParams(v []ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestSrcContractParamsInner)`

SetParams sets Params field to given value.

### HasParams

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasParams() bool`

HasParams returns a boolean if a field has been set.

### GetEventSignature

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetEventSignature() string`

GetEventSignature returns the EventSignature field if non-nil, zero value otherwise.

### GetEventSignatureOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) GetEventSignatureOk() (*string, bool)`

GetEventSignatureOk returns a tuple with the EventSignature field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventSignature

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) SetEventSignature(v string)`

SetEventSignature sets EventSignature field to given value.

### HasEventSignature

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestDstContract) HasEventSignature() bool`

HasEventSignature returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


