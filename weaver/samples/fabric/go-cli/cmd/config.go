/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var configCmd = &cobra.Command{
	Use:   "config set <network-id> <connProfilePath|relayEndpoint> <value>",
	Short: "interact with network information for the fabric-cli",
	Long: `Interact with config file for the fabric-cli. The config file is used to store network information
	
Example:
  fabric-cli config set network1 connProfilePath path/dlt-interoperability/fabric-testnet/organizations`,
	Run: func(cmd *cobra.Command, args []string) {},
}

func init() {
	rootCmd.AddCommand(configCmd)
}
