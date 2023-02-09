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

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	"github.com/spf13/cobra"

	log "github.com/sirupsen/logrus"
)

// invokeCmd represents the invoke command
var invokeCmd = &cobra.Command{
	Use:   "invoke --local-network=<network1|network2> --user=<user-id> <channel-name> <contract-name> <function-name> <args>",
	Short: "invoke chaincode with data",
	Long: `Invoke chaincode with data.

Example:
  fabric-cli chaincode invoke --local-network=network1 mychannel interop  Create '["test", "teststate"]'`,
	Run: func(cmd *cobra.Command, args []string) {
		localNetwork, _ := cmd.Flags().GetString("local-network")
		if localNetwork == "" {
			log.Fatal("--local-network needs to be specified")
		}

		username, _ := cmd.Flags().GetString("user")

		logDebug, _ := cmd.Flags().GetString("debug")
		err := chaincodeInvoke(args, localNetwork, username, logDebug)
		if err != nil {
			log.Fatalf("fabric-cli chaincode invoke failed with error: %s", err.Error())
		}
	},
}

func init() {
	chaincodeCmd.AddCommand(invokeCmd)

	invokeCmd.Flags().String("local-network", "", "local-network network for command. <network1|network2>")
	invokeCmd.Flags().String("user", "", "user for chaincode invoke. (Optional: Default user is used)")
	invokeCmd.Flags().String("debug", "false", "shows debug logs when running. Disabled by default. To enable --debug=true")
}

func chaincodeInvoke(args []string, localNetwork string, username string, logDebug string) error {
	if len(args) < 4 {
		return fmt.Errorf("not enough arguements supplied")
	}
	currentLogLevel := log.GetLevel()
	changedLogLevel := false
	if logDebug == "true" && currentLogLevel != log.DebugLevel {
		changedLogLevel = true
		helpers.SetLogLevel(log.DebugLevel)
		log.Debug("debugging is enabled")
	}

	netConfig, err := helpers.GetNetworkConfig(localNetwork)
	if err != nil {
		log.Fatalf("failed to get network configuration for %s with error: %s", localNetwork, err.Error())
	}

	if netConfig.ConnProfilePath == "" ||
		netConfig.MspId == "" {
		log.Fatalf("please use a valid --target-network, no valid environment found for %s", localNetwork)
	}

	arrayArgs := []string{}
	err = json.Unmarshal([]byte(args[3]), &arrayArgs)
	if err != nil {
		return fmt.Errorf("failed unmarshalling arguement: %s", args[3])
	}

	userNetwork := username
	query := helpers.QueryType{
		ContractName: args[1],
		Channel:      args[0],
		CcFunc:       args[2],
		Args:         arrayArgs,
	}
	_, err = helpers.Invoke(query, netConfig.ConnProfilePath, localNetwork, netConfig.MspId, userNetwork)
	if err != nil {
		return err
	}

	if changedLogLevel {
		// restore the original log level
		helpers.SetLogLevel(currentLogLevel)
	}
	return nil
}
