# AuditResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Sessions** | Pointer to **[]string** |  | [optional] 
**StartTimestamp** | Pointer to **int64** | The start timestamp for the audit period, as a Unix timestamp (milliseconds since epoch). | [optional] 
**EndTimestamp** | Pointer to **int64** | The end timestamp for the audit period, as a Unix timestamp (milliseconds since epoch). | [optional] 

## Methods

### NewAuditResponse

`func NewAuditResponse() *AuditResponse`

NewAuditResponse instantiates a new AuditResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuditResponseWithDefaults

`func NewAuditResponseWithDefaults() *AuditResponse`

NewAuditResponseWithDefaults instantiates a new AuditResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessions

`func (o *AuditResponse) GetSessions() []string`

GetSessions returns the Sessions field if non-nil, zero value otherwise.

### GetSessionsOk

`func (o *AuditResponse) GetSessionsOk() (*[]string, bool)`

GetSessionsOk returns a tuple with the Sessions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessions

`func (o *AuditResponse) SetSessions(v []string)`

SetSessions sets Sessions field to given value.

### HasSessions

`func (o *AuditResponse) HasSessions() bool`

HasSessions returns a boolean if a field has been set.

### GetStartTimestamp

`func (o *AuditResponse) GetStartTimestamp() int64`

GetStartTimestamp returns the StartTimestamp field if non-nil, zero value otherwise.

### GetStartTimestampOk

`func (o *AuditResponse) GetStartTimestampOk() (*int64, bool)`

GetStartTimestampOk returns a tuple with the StartTimestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTimestamp

`func (o *AuditResponse) SetStartTimestamp(v int64)`

SetStartTimestamp sets StartTimestamp field to given value.

### HasStartTimestamp

`func (o *AuditResponse) HasStartTimestamp() bool`

HasStartTimestamp returns a boolean if a field has been set.

### GetEndTimestamp

`func (o *AuditResponse) GetEndTimestamp() int64`

GetEndTimestamp returns the EndTimestamp field if non-nil, zero value otherwise.

### GetEndTimestampOk

`func (o *AuditResponse) GetEndTimestampOk() (*int64, bool)`

GetEndTimestampOk returns a tuple with the EndTimestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTimestamp

`func (o *AuditResponse) SetEndTimestamp(v int64)`

SetEndTimestamp sets EndTimestamp field to given value.

### HasEndTimestamp

`func (o *AuditResponse) HasEndTimestamp() bool`

HasEndTimestamp returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


