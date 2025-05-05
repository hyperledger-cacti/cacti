# OracleRegister200ResponseOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**OracleRegister200ResponseOperationsInnerContract**](OracleRegister200ResponseOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleRegister200ResponseOperationsInnerOutput**](OracleRegister200ResponseOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleRegister200ResponseOperationsInner

`func NewOracleRegister200ResponseOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract OracleRegister200ResponseOperationsInnerContract, status string, timestamp int64, ) *OracleRegister200ResponseOperationsInner`

NewOracleRegister200ResponseOperationsInner instantiates a new OracleRegister200ResponseOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegister200ResponseOperationsInnerWithDefaults

`func NewOracleRegister200ResponseOperationsInnerWithDefaults() *OracleRegister200ResponseOperationsInner`

NewOracleRegister200ResponseOperationsInnerWithDefaults instantiates a new OracleRegister200ResponseOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRegister200ResponseOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRegister200ResponseOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRegister200ResponseOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRegister200ResponseOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRegister200ResponseOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRegister200ResponseOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleRegister200ResponseOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleRegister200ResponseOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleRegister200ResponseOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleRegister200ResponseOperationsInner) GetContract() OracleRegister200ResponseOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleRegister200ResponseOperationsInner) GetContractOk() (*OracleRegister200ResponseOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleRegister200ResponseOperationsInner) SetContract(v OracleRegister200ResponseOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleRegister200ResponseOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRegister200ResponseOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRegister200ResponseOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleRegister200ResponseOperationsInner) GetOutput() OracleRegister200ResponseOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleRegister200ResponseOperationsInner) GetOutputOk() (*OracleRegister200ResponseOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleRegister200ResponseOperationsInner) SetOutput(v OracleRegister200ResponseOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleRegister200ResponseOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleRegister200ResponseOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRegister200ResponseOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRegister200ResponseOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


