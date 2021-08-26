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
	"bytes"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// setCmd represents the set command
var setCmd = &cobra.Command{
	Use:   "set <" + strings.Join(helpers.ValidKeys, "|") + "> <value>",
	Short: "set env variables for the fabric-cli",
	Long: `Set env variables for the fabric-cli

Example:
  fabric-cli env set DEFAULT_CHANNEL testchannel`,
	Run: func(cmd *cobra.Command, args []string) {
		err := set(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	envCmd.AddCommand(setCmd)
}

func set(args []string) error {

	if (len(args) < 2) || (len(args) > 2) {
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

	updatedEnvVars := bytes.Buffer{}
	envVarFound := false
	var key, value string
	envVars := strings.Split(string(envFileBytes), "\n")
	for i := 0; i < len(envVars); i++ {
		if envVars[i] == "" {
			continue
		}
		keyAndValue := strings.Split(envVars[i], "=")
		key = keyAndValue[0]
		value = keyAndValue[1]
		if i != 0 {
			// if this is not the line number 1, then write "\n" to go to the next line
			updatedEnvVars.WriteString("\n")
		}
		if key == args[0] {
			envVarFound = true
			updatedEnvVars.WriteString(key + "=" + args[1])
		} else if key != "" {
			updatedEnvVars.WriteString(key + "=" + value)
		}
	}

	if !envVarFound {
		if len(envVars) > 0 {
			// if this is not the first env var to be written, then write "\n" to go to the next line
			updatedEnvVars.WriteString("\n")
		}
		updatedEnvVars.WriteString(args[0] + "=" + args[1])
	}

	err = ioutil.WriteFile(filepath.Join(".env"), updatedEnvVars.Bytes(), 0755)
	if err != nil {
		return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}

	log.Debugf("updated .env file content is: \n%s\n", updatedEnvVars.String())

	return nil
}
