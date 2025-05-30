# AuditRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**StartTimestamp** | **int64** | The start timestamp for the audit period, as a Unix timestamp (milliseconds since epoch). | 
**EndTimestamp** | **int64** | The end timestamp for the audit period, as a Unix timestamp (milliseconds since epoch). | 

## Methods

### NewAuditRequest

`func NewAuditRequest(startTimestamp int64, endTimestamp int64, ) *AuditRequest`

NewAuditRequest instantiates a new AuditRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuditRequestWithDefaults

`func NewAuditRequestWithDefaults() *AuditRequest`

NewAuditRequestWithDefaults instantiates a new AuditRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStartTimestamp

`func (o *AuditRequest) GetStartTimestamp() int64`

GetStartTimestamp returns the StartTimestamp field if non-nil, zero value otherwise.

### GetStartTimestampOk

`func (o *AuditRequest) GetStartTimestampOk() (*int64, bool)`

GetStartTimestampOk returns a tuple with the StartTimestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTimestamp

`func (o *AuditRequest) SetStartTimestamp(v int64)`

SetStartTimestamp sets StartTimestamp field to given value.


### GetEndTimestamp

`func (o *AuditRequest) GetEndTimestamp() int64`

GetEndTimestamp returns the EndTimestamp field if non-nil, zero value otherwise.

### GetEndTimestampOk

`func (o *AuditRequest) GetEndTimestampOk() (*int64, bool)`

GetEndTimestampOk returns a tuple with the EndTimestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTimestamp

`func (o *AuditRequest) SetEndTimestamp(v int64)`

SetEndTimestamp sets EndTimestamp field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


