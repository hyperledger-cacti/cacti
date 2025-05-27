# AuditResponseSessionsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SessionId** | Pointer to **string** | The unique identifier of the session for which the proof was generated. | [optional] 
**Data** | Pointer to **string** | The data related to the session, which may include transaction details, proofs, or other relevant information. | [optional] 

## Methods

### NewAuditResponseSessionsInner

`func NewAuditResponseSessionsInner() *AuditResponseSessionsInner`

NewAuditResponseSessionsInner instantiates a new AuditResponseSessionsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuditResponseSessionsInnerWithDefaults

`func NewAuditResponseSessionsInnerWithDefaults() *AuditResponseSessionsInner`

NewAuditResponseSessionsInnerWithDefaults instantiates a new AuditResponseSessionsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSessionId

`func (o *AuditResponseSessionsInner) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *AuditResponseSessionsInner) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *AuditResponseSessionsInner) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *AuditResponseSessionsInner) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### GetData

`func (o *AuditResponseSessionsInner) GetData() string`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *AuditResponseSessionsInner) GetDataOk() (*string, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *AuditResponseSessionsInner) SetData(v string)`

SetData sets Data field to given value.

### HasData

`func (o *AuditResponseSessionsInner) HasData() bool`

HasData returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


