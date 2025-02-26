/*
Hyperledger Cactus Plugin - HTLC-ETH Besu

No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)

API version: 2.1.0
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-htlc-eth-besu

import (
	"encoding/json"
)

// checks if the WithdrawReq type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &WithdrawReq{}

// WithdrawReq struct for WithdrawReq
type WithdrawReq struct {
	// Contract locked id
	Id string `json:"id"`
	// Secret need to unlock the contract
	Secret string `json:"secret"`
	Web3SigningCredential Web3SigningCredential `json:"web3SigningCredential"`
	// connectorId for the connector besu plugin
	ConnectorId string `json:"connectorId"`
	// keychainId for the keychain plugin
	KeychainId string `json:"keychainId"`
	Gas *NewContractObjGas `json:"gas,omitempty"`
}

// NewWithdrawReq instantiates a new WithdrawReq object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewWithdrawReq(id string, secret string, web3SigningCredential Web3SigningCredential, connectorId string, keychainId string) *WithdrawReq {
	this := WithdrawReq{}
	this.Id = id
	this.Secret = secret
	this.Web3SigningCredential = web3SigningCredential
	this.ConnectorId = connectorId
	this.KeychainId = keychainId
	return &this
}

// NewWithdrawReqWithDefaults instantiates a new WithdrawReq object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewWithdrawReqWithDefaults() *WithdrawReq {
	this := WithdrawReq{}
	return &this
}

// GetId returns the Id field value
func (o *WithdrawReq) GetId() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Id
}

// GetIdOk returns a tuple with the Id field value
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetIdOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Id, true
}

// SetId sets field value
func (o *WithdrawReq) SetId(v string) {
	o.Id = v
}

// GetSecret returns the Secret field value
func (o *WithdrawReq) GetSecret() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Secret
}

// GetSecretOk returns a tuple with the Secret field value
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetSecretOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Secret, true
}

// SetSecret sets field value
func (o *WithdrawReq) SetSecret(v string) {
	o.Secret = v
}

// GetWeb3SigningCredential returns the Web3SigningCredential field value
func (o *WithdrawReq) GetWeb3SigningCredential() Web3SigningCredential {
	if o == nil {
		var ret Web3SigningCredential
		return ret
	}

	return o.Web3SigningCredential
}

// GetWeb3SigningCredentialOk returns a tuple with the Web3SigningCredential field value
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetWeb3SigningCredentialOk() (*Web3SigningCredential, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Web3SigningCredential, true
}

// SetWeb3SigningCredential sets field value
func (o *WithdrawReq) SetWeb3SigningCredential(v Web3SigningCredential) {
	o.Web3SigningCredential = v
}

// GetConnectorId returns the ConnectorId field value
func (o *WithdrawReq) GetConnectorId() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.ConnectorId
}

// GetConnectorIdOk returns a tuple with the ConnectorId field value
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetConnectorIdOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.ConnectorId, true
}

// SetConnectorId sets field value
func (o *WithdrawReq) SetConnectorId(v string) {
	o.ConnectorId = v
}

// GetKeychainId returns the KeychainId field value
func (o *WithdrawReq) GetKeychainId() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.KeychainId
}

// GetKeychainIdOk returns a tuple with the KeychainId field value
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetKeychainIdOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.KeychainId, true
}

// SetKeychainId sets field value
func (o *WithdrawReq) SetKeychainId(v string) {
	o.KeychainId = v
}

// GetGas returns the Gas field value if set, zero value otherwise.
func (o *WithdrawReq) GetGas() NewContractObjGas {
	if o == nil || IsNil(o.Gas) {
		var ret NewContractObjGas
		return ret
	}
	return *o.Gas
}

// GetGasOk returns a tuple with the Gas field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *WithdrawReq) GetGasOk() (*NewContractObjGas, bool) {
	if o == nil || IsNil(o.Gas) {
		return nil, false
	}
	return o.Gas, true
}

// HasGas returns a boolean if a field has been set.
func (o *WithdrawReq) HasGas() bool {
	if o != nil && !IsNil(o.Gas) {
		return true
	}

	return false
}

// SetGas gets a reference to the given NewContractObjGas and assigns it to the Gas field.
func (o *WithdrawReq) SetGas(v NewContractObjGas) {
	o.Gas = &v
}

func (o WithdrawReq) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o WithdrawReq) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["id"] = o.Id
	toSerialize["secret"] = o.Secret
	toSerialize["web3SigningCredential"] = o.Web3SigningCredential
	toSerialize["connectorId"] = o.ConnectorId
	toSerialize["keychainId"] = o.KeychainId
	if !IsNil(o.Gas) {
		toSerialize["gas"] = o.Gas
	}
	return toSerialize, nil
}

type NullableWithdrawReq struct {
	value *WithdrawReq
	isSet bool
}

func (v NullableWithdrawReq) Get() *WithdrawReq {
	return v.value
}

func (v *NullableWithdrawReq) Set(val *WithdrawReq) {
	v.value = val
	v.isSet = true
}

func (v NullableWithdrawReq) IsSet() bool {
	return v.isSet
}

func (v *NullableWithdrawReq) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableWithdrawReq(val *WithdrawReq) *NullableWithdrawReq {
	return &NullableWithdrawReq{value: val, isSet: true}
}

func (v NullableWithdrawReq) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableWithdrawReq) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}


