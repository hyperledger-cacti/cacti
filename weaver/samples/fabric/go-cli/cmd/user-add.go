/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/hyperledger-cacti/cacti/weaver/samples/fabric/go-cli/helpers"
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
