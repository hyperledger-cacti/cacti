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

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// configGetCmd represents the config get command
var configGetCmd = &cobra.Command{
	Use:   "get <network-id>",
	Short: "get specific network configuration from the config",
	Long: `Get specific network configuration from the config

Example:
  fabric-cli env get network1`,
	Run: func(cmd *cobra.Command, args []string) {
		err := getConfig(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	configCmd.AddCommand(configGetCmd)
}

func getConfig(args []string) error {

	if len(args) != 1 {
		return fmt.Errorf("incorrect number of arguments")
	}

	log.Debug("reading config.json file")
	envFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join("config.json"))
	if err != nil {
		return fmt.Errorf("cannot access config.json file: %s", err.Error())
	}
	if !envFileExists {
		err = ioutil.WriteFile(filepath.Join("config.json"), []byte(""), 0600)
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

	networkFound := false
	for key, val := range configJSON {
		if key == args[0] {
			networkFound = true
			valBytes, err := json.Marshal(val)
			if err != nil {
				return fmt.Errorf("failed to marshal config entry with error: %s", err.Error())
			}
			log.Infof("network-id: %s, config: %s", args[0], string(valBytes))
		}
	}

	if !networkFound {
		return fmt.Errorf("configuration for %s not found", args[0])
	}

	return nil
}
