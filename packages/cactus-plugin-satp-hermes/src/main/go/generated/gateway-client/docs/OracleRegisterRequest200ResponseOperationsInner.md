# OracleRegisterRequest200ResponseOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**OracleRegisterRequest200ResponseOperationsInnerContract**](OracleRegisterRequest200ResponseOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**OracleRegisterRequest200ResponseOperationsInnerOutput**](OracleRegisterRequest200ResponseOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewOracleRegisterRequest200ResponseOperationsInner

`func NewOracleRegisterRequest200ResponseOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract OracleRegisterRequest200ResponseOperationsInnerContract, status string, timestamp int64, ) *OracleRegisterRequest200ResponseOperationsInner`

NewOracleRegisterRequest200ResponseOperationsInner instantiates a new OracleRegisterRequest200ResponseOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewOracleRegisterRequest200ResponseOperationsInnerWithDefaults

`func NewOracleRegisterRequest200ResponseOperationsInnerWithDefaults() *OracleRegisterRequest200ResponseOperationsInner`

NewOracleRegisterRequest200ResponseOperationsInnerWithDefaults instantiates a new OracleRegisterRequest200ResponseOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetContract() OracleRegisterRequest200ResponseOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetContractOk() (*OracleRegisterRequest200ResponseOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetContract(v OracleRegisterRequest200ResponseOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetOutput() OracleRegisterRequest200ResponseOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetOutputOk() (*OracleRegisterRequest200ResponseOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetOutput(v OracleRegisterRequest200ResponseOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *OracleRegisterRequest200ResponseOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *OracleRegisterRequest200ResponseOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *OracleRegisterRequest200ResponseOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


