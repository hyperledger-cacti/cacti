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

	log "github.com/sirupsen/logrus"
)

type NetworkConfig struct {
	RelayEndPoint   string `json:"relayEndPoint"`
	ConnProfilePath string `json:"connProfilePath"`
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

func AddData(filename string, connProfilePath string, networkName string, query QueryType, mspId string) error {
	filePath := filepath.Join("data", filename)

	dataBytes, err := ioutil.ReadFile(filePath)
	if err != nil {
		logThenErrorf("failed reading file %s with error: %s", filePath, err.Error())
	}
	log.Infof("dataBytes: %s", string(dataBytes))

	dataJSON := map[string]interface{}{}
	err = json.Unmarshal(dataBytes, &dataJSON)
	if err != nil {
		logThenErrorf("failed to unmarshal the content of the file %s with error: %s", filePath, err.Error())
	}
	log.Infof("dataJSON: %+v", dataJSON)

	for key, val := range dataJSON {
		args := []string{key, val.(string)}
		query.Args = args
		log.Infof("query: %+v", query)
		_, err := Invoke(query, connProfilePath, networkName, mspId, "")
		if err != nil {
			logThenErrorf("%s Invoke error: %s", query.CcFunc, err.Error())
		}
	}

	return nil
}
