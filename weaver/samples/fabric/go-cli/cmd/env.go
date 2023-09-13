/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// envCmd represents the env command
var envCmd = &cobra.Command{
	Use:   "env",
	Short: "interact with environment variables for the fabric-cli",
	Long: `Interact with environment variables for the fabric-cli

Example:
  fabric-cli env set DEFAULT_CHANNEL testchannel`,
	Run: func(cmd *cobra.Command, args []string) {},
}

func init() {
	rootCmd.AddCommand(envCmd)
}
