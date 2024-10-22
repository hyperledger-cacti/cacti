/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"fmt"
	"io/ioutil"
	"path/filepath"

	"github.com/hyperledger-cacti/cacti/weaver/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// configSetFileCmd represents the config set-file command
var configSetFileCmd = &cobra.Command{
	Use:   "set-file <CONFIG_PATH>",
	Short: "replace env file with contents from another env file",
	Long: `Replace env file with contents from another env file

Example:
  fabric-cli config set-file path/to/config.json`,
	Run: func(cmd *cobra.Command, args []string) {
		err := configSetFile(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	configCmd.AddCommand(configSetFileCmd)
}

func configSetFile(args []string) error {

	if (len(args) < 1) || (len(args) > 1) {
		return fmt.Errorf("incorrect number of arguments")
	}
	log.Debugf("args[0]: %s", args[0])

	log.Debug("reading config.json file")
	configFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join("config.json"))
	if err != nil {
		return fmt.Errorf("cannot access config.json file: %s", err.Error())
	}
	newConfigFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join(args[0]))
	if err != nil {
		return fmt.Errorf("config path %s cannot be accessed: %s", args[0], err.Error())
	}

	if !configFileExists {
		err = ioutil.WriteFile(filepath.Join("config.json"), []byte(""), 0644)
		if err != nil {
			return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
		}
	}
	if !newConfigFileExists {
		return fmt.Errorf("config path %s does not exist", args[0])
	}

	configFileBytes, err := ioutil.ReadFile(filepath.Join(args[0]))
	if err != nil {
		return fmt.Errorf("failed reading config path %s with error: %s", filepath.Join(args[0]), err.Error())
	}
	log.Debugf("configFileBytes: %s", string(configFileBytes))

	err = ioutil.WriteFile(filepath.Join("config.json"), configFileBytes, 0644)
	if err != nil {
		return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}

	log.Debugf("updated config file with the contents of the file %s", string(configFileBytes))

	return nil
}
