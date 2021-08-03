/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
)

type NetworkConfig struct {
	RelayEndPoint   string `json:"relayEndPoint"`
	ConnProfilePath string `json:"connProfilePath"`
	Username        string `json:"username"`
	MspId           string `json:"mspId"`
	ChannelName     string `json:"channelName"`
	Chaincode       string `json:"chaincode"`
}

func GetNetworkConfig(networkId string) (NetworkConfig, error) {
	networkConfig := NetworkConfig{}
	// this is the path relative to the fabric-go-cli path
	configPath := filepath.Join("./config.json")

	configJSONfile, err := os.Open(configPath)
	if err != nil {
		return networkConfig, logThenErrorf("failed opening Config.json file with error: %s", err.Error())
	}
	defer configJSONfile.Close()

	networkConfigsBytes, err := ioutil.ReadAll(configJSONfile)
	if err != nil {
		return networkConfig, logThenErrorf("failed reading Config.json file with error: %s", err.Error())
	}

	var networkConfigs map[string]NetworkConfig
	err = json.Unmarshal(networkConfigsBytes, &networkConfigs)
	if err != nil {
		return networkConfig, logThenErrorf("failed to unmarshal Config.json file content with error: %s", err.Error())
	}

	return networkConfigs[networkId], nil
}
