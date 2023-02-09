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
