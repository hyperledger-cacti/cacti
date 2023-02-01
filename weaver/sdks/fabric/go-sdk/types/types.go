/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package types

type Query struct {
	ContractName string   `json:"contractName"`
	Channel      string   `json:"channel"`
	CcFunc       string   `json:"ccFunc"`
	CcArgs       []string `json:"ccArgs"`
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
	RemoteEndPoint string   `json:"remoteEndPoint"`
	NetworkId      string   `json:"networkId"`
	Sign           bool     `json:"sign"`
	CcArgs         []string `json:"ccArgs"`
}

type RemoteJSON struct {
	LocalRelayEndPoint string                 `json:"localRelayEndPoint"`
	ViewRequests       map[string]ViewRequest `json:"viewRequests"`
}

type ViewRequest struct {
	InvokeArgIndices []int64       `json:"invokeArgIndices"`
	InteropJSONs     []InteropJSON `json:"interopJSONs"`
}
