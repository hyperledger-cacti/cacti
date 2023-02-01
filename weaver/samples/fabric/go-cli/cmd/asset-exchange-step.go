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

// exchangeStepCmd represents the exchange-step command
var exchangeStepCmd = &cobra.Command{
	Use:   "exchange-step --step=<1-8> --target-network=<network1|network2> --secret=<secret> --hash=<hashBase64> --timeout-epoch=<timeout-epoch> --timeout-duration=<timeout-duration> --locker=<locker-userid> --recipient=<recipient-userid> --contract-id=<contract-id> --param=<param>",
	Short: "perform asset exchange 'step by step'",
	Long: `Perform asset exchange 'step by step'

Example:
  fabric-cli asset exchange-step --step=1 --target-network=network1 --secret=secrettext --timeout-duration=100 --locker=bob --recipient=alice --param=Type1:a04`,
	Run: func(cmd *cobra.Command, args []string) {

		exchangeStep, _ := cmd.Flags().GetInt("step")
		if exchangeStep == 0 {
			log.Fatal("--step needs to specified")
		}

		targetNetwork, _ := cmd.Flags().GetString("target-network")
		if targetNetwork == "" {
			log.Fatal("--target-network needs to specified")
		}

		secret, _ := cmd.Flags().GetString("secret")
		hash, _ := cmd.Flags().GetString("hash")
		if secret != "" && hash != "" {
			log.Fatal("only one of --secret or --hash needs to be specified, but not both")
		} else if secret == "" && hash == "" && exchangeStep != 2 && exchangeStep != 4 && exchangeStep != 7 && exchangeStep != 8 {
			log.Fatal("one of --secret or --hash needs to be specified")
		}

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
		} else if exchangeStep == 1 || exchangeStep == 3 {
			log.Fatal("one of --timeout-epoch or --timeout-duration needs to be specified")
		}
		log.Infof("timeout-epoch: %v and timeout-duration: %v", timeoutEpoch, timeoutDuration)

		locker, _ := cmd.Flags().GetString("locker")
		if locker == "" {
			log.Fatal("--locker needs to be specified")
		}
		recipient, _ := cmd.Flags().GetString("recipient")
		if recipient == "" {
			log.Fatal("--recipient needs to be specified")
		}
		contractId, _ := cmd.Flags().GetString("contract-id")
		if contractId == "" && (exchangeStep == 4 || exchangeStep == 5) {
			log.Fatal("contractId needs to be specified for steps 4 and 5")
		}
		param, _ := cmd.Flags().GetString("param")
		if param == "" && (exchangeStep == 1 || exchangeStep == 2 || exchangeStep == 3) {
			log.Fatal("--param needs to be specified for steps 1, 2 and 3")
		}
		logDebug, _ := cmd.Flags().GetString("debug")

		err := assetExchangeStepByStep(exchangeStep, targetNetwork, secret, hash, timeout, twiceTimeout,
			locker, recipient, contractId, param, logDebug)
		if err != nil {
			log.Fatalf("failed to perform asset exchange 'step by step' with error: %s", err.Error())
		}

	},
}

func init() {
	assetExchangeCmd.AddCommand(exchangeStepCmd)

	exchangeStepCmd.Flags().Int("step", 0, `step number of asset exchange protocol:
	1: LockAsset
	2: IsAssetLocked
	3: LockFungibleAsset
	4: IsFungibleAssetLocked
	5: ClaimFungibleAsset
	6: ClaimAsset
	7: UnlockAsset
	8: UnlockFungibleAsset`)
	exchangeStepCmd.Flags().String("target-network", "", "target network for command, <network1|network2>")
	exchangeStepCmd.Flags().String("secret", "", "secret text to be used by asset owner to hash lock")
	exchangeStepCmd.Flags().String("hash", "", "hash value in base64 to be used for HTLC (use only one of secret or hash, do not use both options)")
	exchangeStepCmd.Flags().Uint64("timeout-epoch", 0, "timeout in epoch in seconds, use only one of the timeout options")
	exchangeStepCmd.Flags().Uint64("timeout-duration", 0, "timeout duration in seconds, use only one of the timeout options")
	exchangeStepCmd.Flags().String("locker", "", "locker User Id: must be already registered in target-network (required for all steps)")
	exchangeStepCmd.Flags().String("recipient", "", "recipient User Id: must be already registered in target-network (required for all steps)")
	exchangeStepCmd.Flags().String("contract-id", "", "contract-id: required for steps 4 and 5 (i.e. IsFungibleAssetLocked/ClaimFungibleAsset)")
	exchangeStepCmd.Flags().String("param", "", `param (required for steps 1-3) takes below values:
	assetType:assetId for non-fungible assets
	fungibleAssetType:numUnits for fungible assets`)
	exchangeStepCmd.Flags().String("debug", "false", "Shows debug logs when running. Disabled by default. To enable --debug=true")
}

func assetExchangeStepByStep(exchangeStep int, targetNetwork, secret, hashBase64 string, timeout, twiceTimeout uint64, locker, recipient, contractId, param, logDebug string) error {

	if secret != "" {
		hashBase64 = helpers.GenerateSHA256HashInBase64Form(secret)
	}

	networkConfig, err := helpers.GetNetworkConfig(targetNetwork)
	if err != nil {
		return fmt.Errorf("failed to get network configuration for %s with error: %s", targetNetwork, err.Error())
	}
	if networkConfig.ConnProfilePath == "" ||
		networkConfig.ChannelName == "" ||
		networkConfig.Chaincode == "" ||
		networkConfig.MspId == "" {
		return fmt.Errorf("please use a valid --target-network, no valid environment found for %s", targetNetwork)
	}

	var param1, param2 string
	if param != "" {
		params := strings.Split(param, ":")
		param1 = params[0]
		param2 = params[1]
	}

	lockerNetwork := locker
	recipientNetwork := recipient

	_, lockerContract, lockerWallet, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), networkConfig.ChannelName, networkConfig.Chaincode, networkConfig.ConnProfilePath, targetNetwork, networkConfig.MspId, true, lockerNetwork, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}
	lockerId, err := helpers.GetIdentityFromWallet(lockerWallet, lockerNetwork)
	if err != nil {
		return fmt.Errorf("failed to get identity for %s with error: %s", lockerNetwork, err.Error())
	}
	_, recipientContract, recipientWallet, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), networkConfig.ChannelName, networkConfig.Chaincode, networkConfig.ConnProfilePath, targetNetwork, networkConfig.MspId, true, recipientNetwork, "", false)
	if err != nil {
		return fmt.Errorf("failed FabricHelper with error: %s", err.Error())
	}
	recipientId, err := helpers.GetIdentityFromWallet(recipientWallet, recipientNetwork)
	if err != nil {
		return fmt.Errorf("failed to get identity for %s with error: %s", recipientNetwork, err.Error())
	}

	lockerCert := base64.StdEncoding.EncodeToString([]byte(lockerId.Credentials.Certificate))
	recipientCert := base64.StdEncoding.EncodeToString([]byte(recipientId.Credentials.Certificate))

	log.Infof("asset exchange:")
	if exchangeStep == 1 {
		log.Infof("trying asset lock: %s, %s by %s for %s", param1, param2, lockerNetwork, recipientNetwork)

		result, err := am.CreateHTLC(lockerContract, param1, param2, recipientCert, hashBase64, twiceTimeout)
		if err != nil {
			return fmt.Errorf("could not lock asset in %s", targetNetwork)
		}
		log.Infof("asset locked: %s, hashBase64: %s", result, hashBase64)
		log.Infof("asset exchange: step 1 completed")

	} else if exchangeStep == 2 {
		log.Infof("testing if asset is locked: %s, %s by %s for %s", param1, param2, lockerNetwork, recipientNetwork)

		result, err := am.IsAssetLockedInHTLC(recipientContract, param1, param2, recipientCert, lockerCert)
		if err != nil {
			return fmt.Errorf("could not perform IsAssetLockedInHTLC in %s", targetNetwork)
		}
		log.Infof("result of IsAssetLockedInHTLC: %s", result)
		log.Infof("asset exchange: step 2 completed")
	} else if exchangeStep == 3 {
		log.Infof("trying fungible asset lock: %s, %s by %s for %s", param1, param2, lockerNetwork, recipientNetwork)
		fungibleAssetAmt, err := strconv.ParseUint(param2, 10, 64)
		if err != nil {
			return fmt.Errorf("failed strconv.ParseInt of %v with error: %s", param2, err.Error())
		}

		result, err := am.CreateFungibleHTLC(lockerContract, param1, fungibleAssetAmt, recipientCert, hashBase64, timeout)
		if err != nil {
			return fmt.Errorf("could not lock fungible asset in %s", targetNetwork)
		}
		log.Infof("fungible asset locked, contractId: %s", result)
		log.Infof("asset exchange: step 3 completed")

	} else if exchangeStep == 4 {
		log.Infof("testing if fungible asset is locked: %s, %s by %s for %s", param1, param2, lockerNetwork, recipientNetwork)

		result, err := am.IsFungibleAssetLockedInHTLC(recipientContract, contractId)
		if err != nil {
			return fmt.Errorf("could not perform IsFungibleAssetLockedInHTLC in %s", targetNetwork)
		}
		log.Infof("result of IsFungibleAssetLockedInHTLC: %s", result)
		log.Infof("asset exchange: step 4 completed")
	} else if exchangeStep == 5 {
		log.Infof("trying fungible asset claim, contract-id: %s", contractId)

		result, err := am.ClaimFungibleAssetInHTLC(recipientContract, contractId, base64.StdEncoding.EncodeToString([]byte(secret)))
		if err != nil {
			return fmt.Errorf("could not claim fungible asset in %s", targetNetwork)
		}
		log.Infof("fungible asset claimed: %s", result)
		log.Infof("asset exchange: step 5 completed")

	} else if exchangeStep == 6 {
		log.Infof("trying asset claim: %s, %s", param1, param2)

		result, err := am.ClaimAssetInHTLC(recipientContract, param1, param2, lockerCert, base64.StdEncoding.EncodeToString([]byte(secret)))
		if err != nil {
			return fmt.Errorf("could not claim asset in %s", targetNetwork)
		}
		log.Infof("asset claimed: %s", result)
		log.Infof("asset exchange: all steps completed")

	} else if exchangeStep == 7 {
		log.Infof("trying asset unlock: %s, %s", param1, param2)

		result, err := am.ReclaimAssetInHTLC(lockerContract, param1, param2, recipientCert)
		if err != nil {
			return fmt.Errorf("could not reclaim asset in %s", targetNetwork)
		}
		log.Infof("asset reclaimed: %s", result)
		log.Infof("asset exchange: step 7 completed")

	} else if exchangeStep == 8 {
		log.Infof("trying fungible asset unlock, contract-id: %s", contractId)

		result, err := am.ReclaimFungibleAssetInHTLC(lockerContract, contractId)
		if err != nil {
			return fmt.Errorf("could not reclaim fungible asset in %s", targetNetwork)
		}
		log.Infof("fungible asset reclaimed: %s", result)
		log.Infof("asset exchange: step 8 completed")

	}

	return nil
}
