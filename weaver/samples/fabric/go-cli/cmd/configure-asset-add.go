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
	log "github.com/sirupsen/logrus"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	"github.com/spf13/cobra"
)

// assetAddCmd represents the asset add command
var assetAddCmd = &cobra.Command{
	Use:   "add --target-network=<network-name> --type=<bond|token --data-file=<path-to-data-file>>",
	Short: "adds assets to asset network",
	Long: `Adds assets to asset network

Example:
  fabric-cli configure asset add --target-network=network1 --type=bond --data-file=src/data/assets.json`,
	Run: func(cmd *cobra.Command, args []string) {
		targetNetwork, _ := cmd.Flags().GetString("target-network")
		if targetNetwork == "" {
			log.Fatal("--target-network needs to be specified")
		}

		typeOfNetwork, _ := cmd.Flags().GetString("type")
		if typeOfNetwork == "" {
			log.Fatal("--type of network needs to be specified")
		}

		dataFile, _ := cmd.Flags().GetString("data-file")
		if dataFile == "" {
			log.Fatal("--data-file needs to be specified")
		}

		netConfig, err := helpers.GetNetworkConfig(targetNetwork)
		if err != nil {
			log.Fatalf("failed to get network configuration for %s with error: %s", targetNetwork, err.Error())
		}

		if netConfig.ConnProfilePath == "" ||
			netConfig.ChannelName == "" ||
			netConfig.Chaincode == "" {
			log.Fatalf("please use a valid --target-network, no valid environment found for %s", targetNetwork)
		}

		err = helpers.AddAssets(dataFile, targetNetwork, netConfig.ConnProfilePath, helpers.QueryType{}, netConfig.MspId, netConfig.ChannelName,
			netConfig.Chaincode, "", typeOfNetwork)
		if err != nil {
			log.Fatalf("failed adding assets to the network with error: %s", err.Error())
		}
	},
}

func init() {
	assetCmd.AddCommand(assetAddCmd)

	assetAddCmd.Flags().String("target-network", "", "target-network network for command. <network1|network2>")
	assetAddCmd.Flags().String("type", "", "Type of network <bond|token>")
	assetAddCmd.Flags().String("data-file", "", "Path to data file which stores assets in json format")
}
