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
	"strings"

	"github.com/hyperledger-cacti/cacti/weaver/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// getCmd represents the get command
var getCmd = &cobra.Command{
	Use:   "get <" + strings.Join(helpers.ValidKeys, "|") + ">",
	Short: "get env variables for the fabric-cli",
	Long: `Get env variables for the fabric-cli

Example:
  fabric-cli env get DEFAULT_CHANNEL`,
	Run: func(cmd *cobra.Command, args []string) {
		err := get(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	envCmd.AddCommand(getCmd)
}

func get(args []string) error {

	if len(args) != 1 {
		return fmt.Errorf("incorrect number of arguments")
	}

	if !helpers.Contains(helpers.ValidKeys, args[0]) {
		log.Infof("valid keys: %s", strings.Join(helpers.ValidKeys, ", "))
		return fmt.Errorf("invalid env key: %s", args[0])
	}

	log.Debug("reading .env file")
	envFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join(".env"))
	if err != nil {
		return fmt.Errorf("cannot access .env file: %s", err.Error())
	}
	if !envFileExists {
		err = ioutil.WriteFile(filepath.Join(".env"), []byte(""), 0600)
		if err != nil {
			return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
		}
	}
	envFileBytes, err := ioutil.ReadFile(filepath.Join(".env"))
	if err != nil {
		return fmt.Errorf("failed reading env path %s with error: %s", filepath.Join(args[0]), err.Error())
	}
	log.Debugf("envFileBytes: %s", string(envFileBytes))

	var key, value string
	envVars := strings.Split(string(envFileBytes), "\n")
	for i := 0; i < len(envVars); i++ {
		if envVars[i] == "" {
			continue
		}
		keyAndValue := strings.Split(envVars[i], "=")
		key = keyAndValue[0]
		value = keyAndValue[1]
		if key == args[0] {
			log.Infof("Key: %s, Value: %s\n", key, value)
			return nil
		}
	}

	return fmt.Errorf("invalid env key: %s", args[0])
}
