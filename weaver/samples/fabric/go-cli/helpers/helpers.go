/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
	log "github.com/sirupsen/logrus"
)

// Valid keys for .env
var ValidKeys = []string{
	"DEFAULT_CHANNEL",
	"DEFAULT_CHAINCODE",
	"MEMBER_CREDENTIAL_FOLDER",
	"LOCAL",
	"DEFAULT_APPLICATION_CHAINCODE",
	"CONFIG_PATH",
}

// Valid keys for config
var ConfigKeys = []string{
	"connProfilePath",
	"relayEndpoint",
}

type NetworkConfig struct {
	RelayEndPoint   string `json:"relayEndPoint"`
	ConnProfilePath string `json:"connProfilePath"`
	MspId           string `json:"mspId"`
	ChannelName     string `json:"channelName"`
	Chaincode       string `json:"chaincode"`
}

// return true if string array list contains the element value
func Contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func AddAssets(dataFilePath, networkName, connProfilePath string, query QueryType, mspId, channelName, contractName, ccFunc, ccType string) error {
	dataFileExists, err := CheckIfFileOrDirectoryExists(filepath.Join(dataFilePath))
	if err != nil {
		return logThenErrorf("cannot access file: %s", dataFilePath)
	} else if !dataFileExists {
		return logThenErrorf("file %s doesn't exist", filepath.Join(dataFilePath))
	}
	dataBytes, err := ioutil.ReadFile(filepath.Join(dataFilePath))
	if err != nil {
		logThenErrorf("failed reading data file %s with error: %s", filepath.Join(dataFilePath), err.Error())
	}

	dataJSON := map[string]interface{}{}
	err = json.Unmarshal(dataBytes, &dataJSON)
	if err != nil {
		logThenErrorf("failed to unmarshal the content of the file %s with error: %s", filepath.Join(dataFilePath), err.Error())
	}

	if channelName == "" {
		channelName = "simpleasset"
	}

	for _, val := range dataJSON {

		var currentQuery QueryType
		if query.Channel != "" {
			currentQuery = query
		} else {
			currentQuery = QueryType{
				ContractName: contractName,
				Channel:      channelName,
				CcFunc:       "",
				Args:         []string{},
			}
		}

		valBytes, err := json.Marshal(val)
		if err != nil {
			return logThenErrorf("failed to marshal with error: %s", err.Error())
		}

		assetJson := map[string]interface{}{}
		err = json.Unmarshal(valBytes, &assetJson)
		if err != nil {
			return logThenErrorf("failed to unmarshal the json content %v with error: %s", val, err.Error())
		}
		log.Debugf("assetJson: %v", assetJson)

		assetOwner := assetJson["owner"].(string)
		_, _, wallet, err := FabricHelper(NewGatewayNetworkInterface(), channelName, contractName, connProfilePath, networkName, mspId, true, assetOwner, "", true)
		if err != nil {
			return logThenErrorf("failed helpers.FabricHelper with error: %s", err.Error())
		}

		identity, err := wallet.Get(assetOwner)
		if err != nil {
			return logThenErrorf("fetching username %s from wallet error: %s", assetOwner, err.Error())
		}

		certificate := identity.(*gateway.X509Identity).Certificate()
		userCert := base64.StdEncoding.EncodeToString([]byte(certificate))
		if ccType == "bond" {
			currentQuery.CcFunc = "CreateAsset"
			currentQuery.Args = append(currentQuery.Args, assetJson["assetType"].(string), assetJson["id"].(string), userCert, assetJson["issuer"].(string), assetJson["facevalue"].(string), assetJson["maturitydate"].(string))
		} else if ccType == "token" {
			currentQuery.CcFunc = "IssueTokenAssets"
			currentQuery.Args = append(currentQuery.Args, assetJson["tokenassettype"].(string), assetJson["numunits"].(string), userCert)
		}

		log.Debugf("query: %+v", currentQuery)
		_, err = Invoke(currentQuery, connProfilePath, networkName, mspId, assetOwner)
		if err != nil {
			logThenErrorf("%s Invoke error: %s", query.CcFunc, err.Error())
		}
	}
	return nil
}

func GetNetworkConfig(networkId string) (NetworkConfig, error) {
	networkConfig := NetworkConfig{}
	// this is the path relative to the fabric-go-cli path
	configPath := filepath.Join("./config.json")

	configJSONfile, err := os.Open(configPath)
	if err != nil {
		return networkConfig, logThenErrorf("failed opening config.json file with error: %s", err.Error())
	}
	defer configJSONfile.Close()

	networkConfigsBytes, err := ioutil.ReadAll(configJSONfile)
	if err != nil {
		return networkConfig, logThenErrorf("failed reading config.json file with error: %s", err.Error())
	}

	var networkConfigs map[string]NetworkConfig
	err = json.Unmarshal(networkConfigsBytes, &networkConfigs)
	if err != nil {
		return networkConfig, logThenErrorf("failed to unmarshal config.json file content with error: %s", err.Error())
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

// function to generate a "SHA256" hash in base64 format for a given preimage
func GenerateSHA256HashInBase64Form(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

func SetLogLevel(lvl log.Level) {
	switch lvl {
	case log.DebugLevel:
		log.SetLevel(log.DebugLevel)
	case log.InfoLevel:
		log.SetLevel(log.InfoLevel)
	}
}
