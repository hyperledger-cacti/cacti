/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// assetExchangeCmd represents the asset command
var assetExchangeCmd = &cobra.Command{
	Use:   "asset",
	Short: "operate on an asset: exchange-all|exchange-step",
	Long: `Command does nothing by itself
operate on an asset: exchange-all|exchange-step

Example:
  fabric-cli asset exchange-all`,
	Run: func(cmd *cobra.Command, args []string) {},
}

func init() {
	rootCmd.AddCommand(assetExchangeCmd)
}
