/*
Copyright © 2021 NAME HERE <EMAIL ADDRESS>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cmd

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// configSetCmd represents the config set command
var configSetCmd = &cobra.Command{
	Use:   "set <" + strings.Join(helpers.ConfigKeys, "|") + "> <value>",
	Short: "set env variables for the fabric-cli",
	Long: `Set env variables for the fabric-cli

Example:
  fabric-cli config set MEMBER_CREDENTIAL_FOLDER path/dlt-interoperability/fabric-testnet/organizations`,
	Run: func(cmd *cobra.Command, args []string) {
		err := setConfig(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	configCmd.AddCommand(configSetCmd)
}

func setConfig(args []string) error {

	if len(args) != 3 {
		return fmt.Errorf("incorrect number of arguments")
	}

	if !helpers.Contains(helpers.ConfigKeys, args[1]) {
		log.Infof("valid keys: %s", strings.Join(helpers.ConfigKeys, ", "))
		return fmt.Errorf("invalid env key: %s", args[1])
	}

	log.Debug("reading config.json file")
	configFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join("config.json"))
	if err != nil {
		return fmt.Errorf("cannot access config.json file: %s", err.Error())
	}
	if !configFileExists {
		err = ioutil.WriteFile(filepath.Join("config.json"), []byte(""), 0644)
		if err != nil {
			return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
		}
	}
	configFileBytes, err := ioutil.ReadFile(filepath.Join("config.json"))
	if err != nil {
		return fmt.Errorf("failed reading config path %s with error: %s", filepath.Join("config.json"), err.Error())
	}
	log.Debugf("configFileBytes: %s", string(configFileBytes))

	configJSON := map[string]interface{}{}
	err = json.Unmarshal(configFileBytes, &configJSON)
	if err != nil {
		return fmt.Errorf("failed to unmarshal the content of the file %s with error: %s", filepath.Join("config.json"), err.Error())
	}

	updatedConfigJSON := map[string]interface{}{}
	networkFound := false
	for key, val := range configJSON {
		if key == args[0] {
			networkFound = true
			valBytes, err := json.Marshal(val)
			if err != nil {
				return fmt.Errorf("failed to marshal config entry with error: %s", err.Error())
			}
			networkConfig := map[string]interface{}{}
			err = json.Unmarshal(valBytes, &networkConfig)
			if err != nil {
				return fmt.Errorf("failed to unmarshal the json content %v with error: %s", val, err.Error())
			}
			log.Infof("networkConfig: %v", networkConfig)

			networkConfig[args[1]] = args[2]

			updatedValBytes, err := json.Marshal(networkConfig)
			if err != nil {
				return fmt.Errorf("failed to marshal updated config entry with error: %s", err.Error())
			}
			var updatedVal interface{}
			err = json.Unmarshal(updatedValBytes, &updatedVal)
			if err != nil {
				return fmt.Errorf("failed to unmarshal the updated json content %v with error: %s", val, err.Error())
			}
			updatedConfigJSON[key] = updatedVal
		} else {
			updatedConfigJSON[key] = val
		}
	}

	if !networkFound {
		networkConfig := map[string]interface{}{}
		networkConfig[args[1]] = args[2]

		updatedValBytes, err := json.Marshal(networkConfig)
		if err != nil {
			return fmt.Errorf("failed to marshal updated config entry with error: %s", err.Error())
		}
		var updatedVal interface{}
		err = json.Unmarshal(updatedValBytes, &updatedVal)
		if err != nil {
			return fmt.Errorf("failed to unmarshal the updated json content %v with error: %s", updatedVal, err.Error())
		}
		updatedConfigJSON[args[0]] = updatedVal
	}

	updatedConfigFilebytes, err := json.Marshal(updatedConfigJSON)
	if err != nil {
		return fmt.Errorf("failed to marshal the updated config file with error: %s", err.Error())
	}

	err = ioutil.WriteFile(filepath.Join("config.json"), updatedConfigFilebytes, 0644)
	if err != nil {
		return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}

	log.Infof("updated config.json file content is: %v\n", updatedConfigJSON)

	return nil
}
