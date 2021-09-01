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
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// userAddCmd represents the user add command
var userAddCmd = &cobra.Command{
	Use:   "add --target-network=<network-name> --id=<id> --secret=<secret>",
	Short: "register and enroll user to the fabric network",
	Long: `Register and enroll user to the fabric network

Example:
  fabric-cli user add --target-network=network1 --id=user --secret=userpw`,
	Run: func(cmd *cobra.Command, args []string) {
		targetNetwork, _ := cmd.Flags().GetString("target-network")
		if targetNetwork == "" {
			log.Fatal("--target-network needs to be specified")
		}

		userId, _ := cmd.Flags().GetString("id")
		if userId == "" {
			log.Fatal("--id is required arguement, please specify the username here")
		}

		netConfig, err := helpers.GetNetworkConfig(targetNetwork)
		if err != nil {
			log.Fatalf("failed to get network configuration for %s with error: %s", targetNetwork, err.Error())
		}

		if netConfig.ConnProfilePath == "" ||
			netConfig.ChannelName == "" ||
			netConfig.Chaincode == "" ||
			netConfig.MspId == "" {
			log.Fatalf("please use a valid --target-network, no valid environment found for %s", targetNetwork)
		}
		log.Debugf("netConfig: %v", netConfig)

		userPwd, _ := cmd.Flags().GetString("secret")

		_, err = helpers.WalletSetup(netConfig.ConnProfilePath, targetNetwork, netConfig.MspId, userId, userPwd, true)
		if err != nil {
			log.Fatalf("failed WalletSetup with error: %s", err.Error())
		}
	},
}

func init() {
	userCmd.AddCommand(userAddCmd)

	userAddCmd.Flags().String("target-network", "", "target-network network for command. <network1|network2>")
	userAddCmd.Flags().String("id", "", "username to be added to the network")
	userAddCmd.Flags().String("secret", "", "password for the username being added (Optional: random password is used)")
}
