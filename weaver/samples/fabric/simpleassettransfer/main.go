/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	am "github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt/v2"
)

// SmartContract provides functions for managing an BondAsset and TokenAsset
type SmartContract struct {
	contractapi.Contract
	amc am.AssetManagementContract
}

func (s *SmartContract) ConfigureInterop(interopChaincodeId string) {
	s.amc.Configure(interopChaincodeId)
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface, interopChaincodeId string, localNetworkId string) error {
	s.ConfigureInterop(interopChaincodeId)
	var err error
	if err = s.InitBondAssetLedger(ctx, localNetworkId); err != nil {
		return err
	}
	return s.InitTokenAssetLedger(ctx)
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error creating chaincode: %s", err.Error())
		return
	}

	_, ok := os.LookupEnv("EXTERNAL_SERVICE")
	if ok {
		server := &shim.ChaincodeServer{
				CCID:    os.Getenv("CHAINCODE_CCID"),
				Address: os.Getenv("CHAINCODE_ADDRESS"),
				CC:      chaincode,
				TLSProps: shim.TLSProperties{
					Disabled: true,
				},
		}
		// Start the chaincode external server
		err = server.Start()
	} else {
		err = chaincode.Start()
	}
	if err != nil {
		fmt.Printf("Error starting chaincode: %s", err.Error())
	}

}
