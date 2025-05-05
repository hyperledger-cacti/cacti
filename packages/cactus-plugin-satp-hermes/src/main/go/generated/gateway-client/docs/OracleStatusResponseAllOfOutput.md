# OracleStatusResponseAllOfOutput

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TransactionId** | Pointer to **string** | The unique identifier for the transaction. | [optional] 
**TransactionReceipt** | Pointer to **map[string]interface{}** | The receipt of the transaction, providing proof of execution. | [optional] 
**Output** | Pointer to **string** | The output of the Oracle operation execution. | [optional] 
**Proof** | Pointer to **map[string]interface{}** | Proof of the Oracle operation execution. | [optional] 

## Methods

### NewOracleStatusResponseAllOfOutput

`func NewOracleStatusResponseAllOfOutput() *OracleStatusResponseAllOfOutput`

NewOracleStatusResponseAllOfOutput instantiates a new OracleStatusResponseAllOfOutput object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleStatusResponseAllOfOutputWithDefaults

`func NewOracleStatusResponseAllOfOutputWithDefaults() *OracleStatusResponseAllOfOutput`

NewOracleStatusResponseAllOfOutputWithDefaults instantiates a new OracleStatusResponseAllOfOutput object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTransactionId

`func (o *OracleStatusResponseAllOfOutput) GetTransactionId() string`

GetTransactionId returns the TransactionId field if non-nil, zero value otherwise.

### GetTransactionIdOk

`func (o *OracleStatusResponseAllOfOutput) GetTransactionIdOk() (*string, bool)`

GetTransactionIdOk returns a tuple with the TransactionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTransactionId

`func (o *OracleStatusResponseAllOfOutput) SetTransactionId(v string)`

SetTransactionId sets TransactionId field to given value.

### HasTransactionId

`func (o *OracleStatusResponseAllOfOutput) HasTransactionId() bool`

HasTransactionId returns a boolean if a field has been set.

### GetTransactionReceipt

`func (o *OracleStatusResponseAllOfOutput) GetTransactionReceipt() map[string]interface{}`

GetTransactionReceipt returns the TransactionReceipt field if non-nil, zero value otherwise.

### GetTransactionReceiptOk

`func (o *OracleStatusResponseAllOfOutput) GetTransactionReceiptOk() (*map[string]interface{}, bool)`

GetTransactionReceiptOk returns a tuple with the TransactionReceipt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTransactionReceipt

`func (o *OracleStatusResponseAllOfOutput) SetTransactionReceipt(v map[string]interface{})`

SetTransactionReceipt sets TransactionReceipt field to given value.

### HasTransactionReceipt

`func (o *OracleStatusResponseAllOfOutput) HasTransactionReceipt() bool`

HasTransactionReceipt returns a boolean if a field has been set.

### GetOutput

`func (o *OracleStatusResponseAllOfOutput) GetOutput() string`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleStatusResponseAllOfOutput) GetOutputOk() (*string, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleStatusResponseAllOfOutput) SetOutput(v string)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleStatusResponseAllOfOutput) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetProof

`func (o *OracleStatusResponseAllOfOutput) GetProof() map[string]interface{}`

GetProof returns the Proof field if non-nil, zero value otherwise.

### GetProofOk

`func (o *OracleStatusResponseAllOfOutput) GetProofOk() (*map[string]interface{}, bool)`

GetProofOk returns a tuple with the Proof field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProof

`func (o *OracleStatusResponseAllOfOutput) SetProof(v map[string]interface{})`

SetProof sets Proof field to given value.

### HasProof

`func (o *OracleStatusResponseAllOfOutput) HasProof() bool`

HasProof returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


