/*
CBDC-example backend API

Cactus-Example 

API version: 0.0.2
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package generated

import (
	"encoding/json"
	"bytes"
	"fmt"
)

// checks if the BalanceResponse type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &BalanceResponse{}

// BalanceResponse Response schema for an amount request.
type BalanceResponse struct {
	Amount string `json:"amount"`
}

type _BalanceResponse BalanceResponse

// NewBalanceResponse instantiates a new BalanceResponse object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewBalanceResponse(amount string) *BalanceResponse {
	this := BalanceResponse{}
	this.Amount = amount
	return &this
}

// NewBalanceResponseWithDefaults instantiates a new BalanceResponse object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewBalanceResponseWithDefaults() *BalanceResponse {
	this := BalanceResponse{}
	return &this
}

// GetAmount returns the Amount field value
func (o *BalanceResponse) GetAmount() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Amount
}

// GetAmountOk returns a tuple with the Amount field value
// and a boolean to check if the value has been set.
func (o *BalanceResponse) GetAmountOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Amount, true
}

// SetAmount sets field value
func (o *BalanceResponse) SetAmount(v string) {
	o.Amount = v
}

func (o BalanceResponse) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o BalanceResponse) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["amount"] = o.Amount
	return toSerialize, nil
}

func (o *BalanceResponse) UnmarshalJSON(data []byte) (err error) {
	// This validates that all required properties are included in the JSON object
	// by unmarshalling the object into a generic map with string keys and checking
	// that every required field exists as a key in the generic map.
	requiredProperties := []string{
		"amount",
	}

	allProperties := make(map[string]interface{})

	err = json.Unmarshal(data, &allProperties)

	if err != nil {
		return err;
	}

	for _, requiredProperty := range(requiredProperties) {
		if _, exists := allProperties[requiredProperty]; !exists {
			return fmt.Errorf("no value given for required property %v", requiredProperty)
		}
	}

	varBalanceResponse := _BalanceResponse{}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&varBalanceResponse)

	if err != nil {
		return err
	}

	*o = BalanceResponse(varBalanceResponse)

	return err
}

type NullableBalanceResponse struct {
	value *BalanceResponse
	isSet bool
}

func (v NullableBalanceResponse) Get() *BalanceResponse {
	return v.value
}

func (v *NullableBalanceResponse) Set(val *BalanceResponse) {
	v.value = val
	v.isSet = true
}

func (v NullableBalanceResponse) IsSet() bool {
	return v.isSet
}

func (v *NullableBalanceResponse) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableBalanceResponse(val *BalanceResponse) *NullableBalanceResponse {
	return &NullableBalanceResponse{value: val, isSet: true}
}

func (v NullableBalanceResponse) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableBalanceResponse) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}

