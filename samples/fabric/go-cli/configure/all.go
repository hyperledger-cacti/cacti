/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package configure

import (
	"errors"
	"fmt"

	"github.com/cloudflare/cfssl/log"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers/interopsetup"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

type NetworkConfig struct {
	RelayEndPoint   string `json:"relayEndPoint"`
	ConnProfilePath string `json:"connProfilePath"`
	Username        string `json:"username"`
	MspId           string `json:"mspId"`
	ChannelName     string `json:"channelName"`
	Chaincode       string `json:"chaincode"`
}

func ConfigureAll(networkId string) error {

	networkConfig, err := helpers.GetNetworkConfig(networkId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	connProfilePath := networkConfig.ConnProfilePath

	if connProfilePath != "" {
		logThenErrorf("please use a valid network, no valid environment found for %s", networkId)
	}

	username := "user1"
	log.Infof("generating membership for network: %s", networkId)

	// 1. Generate network configs (membership, access control and verification policy)

	helpers.GenerateMembership("mychannel", "interop", connProfilePath, networkId, "Org1MSP", username)
	helpers.GenerateAccessControl("mychannel", "interop", connProfilePath, networkId, "data/interop/accessControlTemplate.json", "Org1MSP", username)
	helpers.GenerateVerificationPolicy("mychannel", "interop", connProfilePath, networkId, "data/interop/verificationPolicyTemplate.json", "Org1MSP", username)

	log.Info("generated network maps for networks")

	// 2. Add default data
	networkEnv, err := helpers.GetNetworkConfig(networkId)
	if err != nil {
		return logThenErrorf("failure of helpers.GetNetworkConfig for network %s with error: %s", networkId, err.Error())
	}
	connProfilePath = networkEnv.ConnProfilePath
	if connProfilePath == "" {
		logThenErrorf("please use a valid --local-network, no valid environment found for network %s", networkId)
	}
	log.Info("populating %s chaincode with data")

	query := helpers.QueryType{
		ContractName: "simplestate",
		Channel:      "mychannel",
		CcFunc:       "Create",
		Args:         []string{},
	}
	if networkId == "network1" {
		helpers.AddData("stars.json", connProfilePath, networkId, query, "Org1MSP")
	} else if networkId == "network2" {
		helpers.AddData("starSize.json", connProfilePath, networkId, query, "Org1MSP")
	}

	// 3. Load configs from other networks in the credentials folder
	log.Infof("loading chaincode for network: %s and connection profile path: %s", networkId, connProfilePath)

	interopsetup.ConfigureNetwork(networkId)

	return nil
}
