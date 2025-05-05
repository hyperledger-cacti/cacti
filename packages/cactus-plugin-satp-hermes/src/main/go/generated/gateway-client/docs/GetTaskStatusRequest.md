# GetTaskStatusRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TaskID** | **string** | The unique identifier of the task. | 

## Methods

### NewGetTaskStatusRequest

`func NewGetTaskStatusRequest(taskID string, ) *GetTaskStatusRequest`

NewGetTaskStatusRequest instantiates a new GetTaskStatusRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGetTaskStatusRequestWithDefaults

`func NewGetTaskStatusRequestWithDefaults() *GetTaskStatusRequest`

NewGetTaskStatusRequestWithDefaults instantiates a new GetTaskStatusRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTaskID

`func (o *GetTaskStatusRequest) GetTaskID() string`

GetTaskID returns the TaskID field if non-nil, zero value otherwise.

### GetTaskIDOk

`func (o *GetTaskStatusRequest) GetTaskIDOk() (*string, bool)`

GetTaskIDOk returns a tuple with the TaskID field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskID

`func (o *GetTaskStatusRequest) SetTaskID(v string)`

SetTaskID sets TaskID field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


