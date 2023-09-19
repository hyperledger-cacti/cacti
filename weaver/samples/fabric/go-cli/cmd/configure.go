/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package cmd

import (
	"github.com/spf13/cobra"
)

// configureCmd represents the configure command
var configureCmd = &cobra.Command{
	Use:   "configure",
	Short: "commands to configure the fabric network",
	Long:  "Command performs nothing by itelf, please refer to sub-commands and options.",
	//Run: func(cmd *cobra.Command, args []string) {
	//	fmt.Println("configure called")
	//},
}

func init() {
	rootCmd.AddCommand(configureCmd)
}
