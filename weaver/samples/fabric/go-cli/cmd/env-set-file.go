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

// setFileCmd represents the setFile command
var setFileCmd = &cobra.Command{
	Use:   "set-file <ENV_PATH>",
	Short: "replace env file with contents from another env file",
	Long: `Replace env file with contents from another env file

Example:
  fabric-cli env set-file ./data/.new_env`,
	Run: func(cmd *cobra.Command, args []string) {
		err := setFile(args)
		if err != nil {
			log.Fatalf(err.Error())
		}
	},
}

func init() {
	envCmd.AddCommand(setFileCmd)
}

func setFile(args []string) error {

	if (len(args) < 1) || (len(args) > 1) {
		return fmt.Errorf("incorrect number of arguments")
	}
	log.Debugf("args[0]: %s", args[0])

	log.Debug("reading .env file")
	envFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join(".env"))
	if err != nil {
		return fmt.Errorf("cannot access .env file: %s", err.Error())
	}
	newEnvFileExists, err := helpers.CheckIfFileOrDirectoryExists(filepath.Join(args[0]))
	if err != nil {
		return fmt.Errorf("env path %s cannot be accessed: %s", args[0], err.Error())
	}
	if !envFileExists {
		err = ioutil.WriteFile(filepath.Join(".env"), []byte(""), 0600)
		if err != nil {
			return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
		}
	}
	if !newEnvFileExists {
		return fmt.Errorf("env path %s does not exist", args[0])
	}
	envFileBytes, err := ioutil.ReadFile(filepath.Join(args[0]))
	if err != nil {
		return fmt.Errorf("failed reading env path %s with error: %s", filepath.Join(args[0]), err.Error())
	}
	log.Debugf("envFileBytes: %v", string(envFileBytes))

	err = ioutil.WriteFile(filepath.Join(".env"), envFileBytes, 0755)
	if err != nil {
		return fmt.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}

	log.Debugf("updated .env file with the contents of the file %s", args[0])

	return nil
}
