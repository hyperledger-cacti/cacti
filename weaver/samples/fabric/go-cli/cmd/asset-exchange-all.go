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
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	am "github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/asset-manager"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// exchangeAllCmd represents the exchange-all command
var exchangeAllCmd = &cobra.Command{
	Use:   "exchange-all --network1=<network1|network2> --network2=<network1|network2> --secret=<secret> --timeout-epoch=<timeout-epoch> --timeout-duration=<timeout-duration> <params>",
	Short: "perform asset exchange 'all steps' using single command",
	Long: `Perform asset exchange 'all steps' using single command

Example:
  fabric-cli asset exchange-all --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 bob:Type1:a04:alice:token1:100`,
	Run: func(cmd *cobra.Command, args []string) {

		network1, _ := cmd.Flags().GetString("network1")
		network2, _ := cmd.Flags().GetString("network2")
		if network1 == "" || network2 == "" {
			log.Fatal("--network1 and --network2 both need to specified")
		}

		secret, _ := cmd.Flags().GetString("secret")

		timeoutEpoch, _ := cmd.Flags().GetUint64("timeout-epoch")
		timeoutDuration, _ := cmd.Flags().GetUint64("timeout-duration")

		currentTimeSecs := uint64(time.Now().Unix())
		var timeout, twiceTimeout uint64
		if timeoutEpoch > 0 && timeoutDuration == 0 {
			duration := timeoutEpoch - currentTimeSecs
			timeout = currentTimeSecs + duration
			twiceTimeout = currentTimeSecs + 2*duration
		} else if timeoutEpoch == 0 && timeoutDuration > 0 {
			timeout = currentTimeSecs + timeoutDuration
			twiceTimeout = currentTimeSecs + 2*timeoutDuration
		} else if timeoutEpoch > 0 && timeoutDuration > 0 {
			log.Fatal("only one of --timeout-epoch or --timeout-duration needs to be specified, but not both")
		} else {
			log.Fatal("one of --timeout-epoch or --timeout-duration needs to be specified")
		}
		log.Infof("timeout-epoch: %v and timeout-duration: %v", timeoutEpoch, timeoutDuration)

		logDebug, _ := cmd.Flags().GetString("debug")

		err := assetExchangeAllSteps(network1, network2, secret, timeout, twiceTimeout, logDebug, args)
		if err != nil {
			log.Fatal("failed to perform asset exchange 'all steps' with error: %s", err.Error())
		}

	},
}

func init() {
	assetExchangeCmd.AddCommand(exchangeAllCmd)

	exchangeAllCmd.Flags().String("network1", "", "asset network for command, <network1|network2>")
	exchangeAllCmd.Flags().String("network2", "", "asset network for command, <network1|network2>")
	exchangeAllCmd.Flags().String("secret", "", "secret text to be used by asset owner to hash lock")
	exchangeAllCmd.Flags().Uint64("timeout-epoch", 0, "timeout in epoch in seconds, use only one of the timeout options")
	exchangeAllCmd.Flags().Uint64("timeout-duration", 0, "timeout duration in seconds, use only one of the timeout options")
	exchangeAllCmd.Flags().String("debug", "false", "Shows debug logs when running. Disabled by default. To enable --debug=true")
}

func assetExchangeAllSteps(network1, network2, secret string, timeout, twiceTimeout uint64, logDebug string, args []string) error {

	currentLogLevel := log.GetLevel()
	changedLogLevel := false
	if logDebug == "true" && currentLogLevel != log.DebugLevel {
		changedLogLevel = true
		helpers.SetLogLevel(log.DebugLevel)
		log.Debug("debugging is enabled")
	}

	var hashSecretBase64 string
	if secret == "" {
		log.Fatal("--secret needs to be specified")
	} else {
		hashSecretBase64 = helpers.GenerateSHA256HashInBase64Form(secret)
	}

	params := strings.Split(args[0], ":")
	user1 := params[0]
	assetType := params[1]
	assetId := params[2]
	user2 := params[3]
	fungibleAssetType := params[4]
	fungibleAssetAmt, err := strconv.ParseUint(params[5], 10, 64)
	if err != nil {
		return fmt.Errorf("failed strconv.ParseInt of %v with error: %s", params[5], err.Error())
	}

	network1Config, err := helpers.GetNetworkConfig(network1)
	if err != nil {
		return fmt.Errorf("failed to get network configuration for %s with error: %s", network1, err.Error())
	}
	if network1Config.ConnProfilePath == "" ||
		network1Config.ChannelName == "" ||
		network1Config.Chaincode == "" ||
		network1Config.MspId == "" {
		return fmt.Errorf("please use a valid --network1, no valid environment found for %s", network1)
	}

	network2Config, err := helpers.GetNetworkConfig(network2)
	if err != nil {
		return fmt.Errorf("failed to get network configuration for %s with error: %s", network2, err.Error())
	}
	if network2Config.ConnProfilePath == "" ||
		network2Config.ChannelName == "" ||
		network2Config.Chaincode == "" ||
		network2Config.MspId == "" {
		return fmt.Errorf("please use a valid --network2, no valid environment found for %s", network2)
	}

	user1Network1 := user1
	user2Network1 := user2

	_, user1Contract1, user1Wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), network1Config.ChannelName, network1Config.Chaincode, network1Config.ConnProfilePath, network1, network1Config.MspId, true, user1Network1, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}
	user1Id1, err := helpers.GetIdentityFromWallet(user1Wallet1, user1Network1)
	if err != nil {
		return fmt.Errorf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, user2Contract1, user2Wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), network1Config.ChannelName, network1Config.Chaincode, network1Config.ConnProfilePath, network1, network1Config.MspId, true, user2Network1, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}
	user2Id1, err := helpers.GetIdentityFromWallet(user2Wallet1, user2Network1)
	if err != nil {
		return fmt.Errorf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	user1Network2 := user1
	user2Network2 := user2

	_, user1Contract2, user1Wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), network2Config.ChannelName, network2Config.Chaincode, network2Config.ConnProfilePath, network2, network2Config.MspId, true, user1Network2, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}
	user1Id2, err := helpers.GetIdentityFromWallet(user1Wallet2, user1Network2)
	if err != nil {
		return fmt.Errorf("failed to get identity for %s with error: %s", user1Network2, err.Error())
	}
	_, user2Contract2, _, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), network2Config.ChannelName, network2Config.Chaincode, network2Config.ConnProfilePath, network2, network2Config.MspId, true, user2Network2, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}

	user1Cert1 := base64.StdEncoding.EncodeToString([]byte(user1Id1.Credentials.Certificate))
	user1Cert2 := base64.StdEncoding.EncodeToString([]byte(user1Id2.Credentials.Certificate))
	user2Cert1 := base64.StdEncoding.EncodeToString([]byte(user2Id1.Credentials.Certificate))

	log.Infof("trying asset lock, assetType: %s and assetId: %s", assetType, assetId)
	result, err := am.CreateHTLC(user1Contract1, assetType, assetId, user2Cert1, hashSecretBase64, twiceTimeout)
	if err != nil {
		return fmt.Errorf("could not lock asset in %s", network1)
	}
	log.Infof("asset locked: %s", result)

	log.Infof("trying fungible asset lock, fungibleAssetType: %s and fungibleAssetAmt: %+v", fungibleAssetType, fungibleAssetAmt)
	result, err = am.CreateFungibleHTLC(user2Contract2, fungibleAssetType, fungibleAssetAmt, user1Cert2, hashSecretBase64, timeout)
	if err != nil {
		return fmt.Errorf("could not lock fungible asset in %s", network2)
	}
	log.Infof("fungible asset locked: %s", result)
	contractId := result

	log.Infof("trying fungible asset claim, contractId: %s", contractId)
	result, err = am.ClaimFungibleAssetInHTLC(user1Contract2, contractId, base64.StdEncoding.EncodeToString([]byte(secret)))
	if err != nil {
		return fmt.Errorf("could not claim fungible asset in %s", network2)
	}
	log.Infof("fungible asset claimed: %s", result)

	log.Infof("trying asset claim, assetType: %s and assetId: %s", assetType, assetId)
	result, err = am.ClaimAssetInHTLC(user2Contract1, assetType, assetId, user1Cert1, base64.StdEncoding.EncodeToString([]byte(secret)))
	if err != nil {
		return fmt.Errorf("could not claim asset in %s", network1)
	}
	log.Infof("asset claimed: %s", result)
	log.Infof("asset exchange completed")

	if changedLogLevel {
		// restore the original log level
		helpers.SetLogLevel(currentLogLevel)
	}

	return nil
}
