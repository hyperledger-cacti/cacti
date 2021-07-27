/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package types

type Query struct {
	CcArgs       []string `json:"ccArgs"`
	Channel      string   `json:"channel"`
	CcFunc       string   `json:"ccFunc"`
	ContractName string   `json:"contractName"`
}

type Flow struct {
	FlowArgs       []string `json:"flowArgs"`
	CordappAddress string   `json:"cordappAddress"`
	FlowId         string   `json:"flowId"`
	CordappId      string   `json:"cordappId"`
}

type InteropJSON struct {
	Address        string   `json:"address"`
	ChaincodeFunc  string   `json:"chaincodeFunc"`
	ChaincodeId    string   `json:"chaincodeId"`
	ChannelId      string   `json:"channelId"`
	RemoteEndpoint string   `json:"remoteEndpoint"`
	NetworkId      string   `json:"networkId"`
	Sign           bool     `json:"sign"`
	CcArgs         []string `json:"ccArgs"`
}

type RemoteJSON struct {
	LocalRelayEndpoint string                 `json:"localRelayEndpoint"`
	ViewRequests       map[string]ViewRequest `json:"viewRequests"`
}

type ViewRequest struct {
	InvokeArgIndices []int64       `json:"invokeArgIndices"`
	InteropJSONs     []InteropJSON `json:"interopJSONs"`
}
