/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// chaincodeCmd represents the chaincode command
var chaincodeCmd = &cobra.Command{
	Use:   "chaincode",
	Short: "operate on a chaincode: invoke|query",
	Long: `Command does nothing by itself
Operate on a chaincode: invoke|query

Example:
  fabric-cli chaincode query`,
	Run: func(cmd *cobra.Command, args []string) {
	},
}

func init() {
	rootCmd.AddCommand(chaincodeCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// chaincodeCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// chaincodeCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
