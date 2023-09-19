/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// assetCmd represents the asset command
var assetCmd = &cobra.Command{
	Use:   "asset",
	Short: "configure for asset networks",
	Long: `Configure for asset networks

Example:
  fabric-cli configure asset add --target-network=network1 --type=bond --data-file=src/data/assets.json`,
	//Run: func(cmd *cobra.Command, args []string) {
	//	fmt.Println("asset called")
	//},
}

func init() {
	configureCmd.AddCommand(assetCmd)
}
