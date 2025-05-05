# ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** | A unique identifier for the Oracle operation. | 
**Type** | **string** | The type of the Oracle operation. | 
**NetworkId** | [**TransactRequestSourceAssetNetworkId**](TransactRequestSourceAssetNetworkId.md) |  | 
**Contract** | [**ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract.md) |  | 
**Status** | **string** | The current status of the Oracle operation. | 
**Output** | Pointer to [**ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerOutput**](ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerOutput.md) |  | [optional] 
**Timestamp** | **int64** | The timestamp when the Oracle operation was created or last updated. | 

## Methods

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner(id string, type_ string, networkId TransactRequestSourceAssetNetworkId, contract ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract, status string, timestamp int64, ) *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerWithDefaults

`func NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerWithDefaults() *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner`

NewApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerWithDefaults instantiates a new ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetId(v string)`

SetId sets Id field to given value.


### GetType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetType(v string)`

SetType sets Type field to given value.


### GetNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetNetworkId() TransactRequestSourceAssetNetworkId`

GetNetworkId returns the NetworkId field if non-nil, zero value otherwise.

### GetNetworkIdOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetNetworkIdOk() (*TransactRequestSourceAssetNetworkId, bool)`

GetNetworkIdOk returns a tuple with the NetworkId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkId

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetNetworkId(v TransactRequestSourceAssetNetworkId)`

SetNetworkId sets NetworkId field to given value.


### GetContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetContract() ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract`

GetContract returns the Contract field if non-nil, zero value otherwise.

### GetContractOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetContractOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract, bool)`

GetContractOk returns a tuple with the Contract field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContract

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetContract(v ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerContract)`

SetContract sets Contract field to given value.


### GetStatus

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetOutput

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetOutput() ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerOutput`

GetOutput returns the Output field if non-nil, zero value otherwise.

### GetOutputOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetOutputOk() (*ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerOutput, bool)`

GetOutputOk returns a tuple with the Output field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutput

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetOutput(v ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInnerOutput)`

SetOutput sets Output field to given value.

### HasOutput

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) HasOutput() bool`

HasOutput returns a boolean if a field has been set.

### GetTimestamp

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetTimestamp() int64`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) GetTimestampOk() (*int64, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *ApiV1HyperledgerCactusPluginSatpHermesOracleRegisterPostRequestOperationsInner) SetTimestamp(v int64)`

SetTimestamp sets Timestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


