/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-sdk-go/pkg/common/providers/fab"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
	log "github.com/sirupsen/logrus"
	"google.golang.org/protobuf/proto"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers/interopsetup"
	am "github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/asset-manager"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/interoperablehelper"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/types"
)

func connectSimpleStateWithSDK() {
	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	_, contract, _, _ := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simplestate", connProfilePath, "network1", "Org1MSP", true, "user1", "", true)

	result, err := contract.EvaluateTransaction("Read", "a")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Infof("result of query: %s", result)

	result, err = contract.SubmitTransaction("Create", "key01", "value")
	//valBytes, _ := json.Marshal([]int64{1, 2})
	//result, err = contract.SubmitTransaction("CreateArr", "key01", string(valBytes))
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}
	log.Infof("result of invoke: %s", result)

	result, err = contract.EvaluateTransaction("Read", "key01")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Infof("result of query: %s", result)
}

func connectSimpleAssetWithSDK(assetId string) {
	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "GetAllAssets",
		Args:         []string{},
	}
	_, err := helpers.Query(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	query.CcFunc = "CreateAsset"
	query.Args = []string{"t1", assetId, "user1", "Treasury", "500", "02 Dec 29 15:04 MST"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	query.CcFunc = "ReadAsset"
	query.Args = []string{"t1", assetId, "true"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	query.CcFunc = "CreateTokenAssetType"
	query.Args = []string{"token1", "Central Bank", "1"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	query.CcFunc = "IssueTokenAssets"
	query.Args = []string{"token1", "5", "user1"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	query.CcFunc = "GetBalance"
	query.Args = []string{"token1", "user1"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
}

func registerEvent(contract *gateway.Contract, eventName string) (fab.Registration, <-chan *fab.CCEvent, error) {
	reg, notifier, errEventRegistration := contract.RegisterEvent(eventName)
	if errEventRegistration != nil {
		log.Errorf("failed to register contract event: %s", errEventRegistration)
	}

	return reg, notifier, errEventRegistration
}

func receiveEvent(notifier <-chan *fab.CCEvent, eventName string) {

	var ccEvent *fab.CCEvent
	select {
	case ccEvent = <-notifier:
		{
			log.Infof("received CC event: %#v", ccEvent)
			if eventName == "LockAsset" || eventName == "ClaimAsset" || eventName == "UnlockAsset" {
				contractInfo := &common.AssetContractHTLC{}
				err := proto.Unmarshal(ccEvent.Payload, contractInfo)
				if err != nil {
					log.Errorf("failed to unmarshal event: %+v", err)
				}
				log.Debugf("received CC event %s is: %+v\n", ccEvent.EventName, contractInfo)
			} else if eventName == "LockFungibleAsset" || eventName == "ClaimFungibleAsset" || eventName == "UnlockFungibleAsset" {
				contractInfo := &common.FungibleAssetContractHTLC{}
				err := proto.Unmarshal(ccEvent.Payload, contractInfo)
				if err != nil {
					log.Errorf("failed to unmarshal event: %+v", err)
				}
				log.Debugf("received CC event %s is: %+v\n", ccEvent.EventName, contractInfo)
			}
		}
	case <-time.After(time.Second * 20):
		log.Errorf("did NOT receive CC event for eventName(%s)\n", eventName)
	}
}

func testLockAssetAndClaimAssetOfBondAsset(assetId string) {

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	query.CcFunc = "CreateAsset"
	query.Args = []string{"t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	query.CcFunc = "ReadAsset"
	query.Args = []string{"t1", assetId, "false"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Going to query if asset is locked using locker ..")
	result, err = am.IsAssetLockedInHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Going to query if asset is locked using recipient ..")
	result, err = am.IsAssetLockedInHTLC(contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient ..")
	result, err = am.ClaimAssetInHTLC(contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

}

func testLockAssetAndUnlockAssetOfBondAsset(assetId string) {

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	query.CcFunc = "CreateAsset"
	query.Args = []string{"t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	// lock for only few seconds so that unlock/reclaim can be exercised
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	query.CcFunc = "ReadAsset"
	query.Args = []string{"t1", assetId, "false"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsAssetLockedInHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		// It's possible that the time elapses hence the query fails. So don't use log.Fatalf so that we can proceed to unlock
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsAssetLockedInHTLC(contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset ..")
	result, err = am.ReclaimAssetInHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed ReclaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
}

func testLockAssetAndClaimAssetUsingContractIdOfBondAsset(assetId string) {

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	query.CcFunc = "CreateAsset"
	query.Args = []string{"t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	contractId := result
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	query.CcFunc = "ReadAsset"
	query.Args = []string{"t1", assetId, "false"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Going to query if asset is locked using locker (via contarct-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(contractU2, contractId)
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)
	log.Println("Going to query if asset is locked using recipient (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(contractU1, contractId)
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient (via contract-id) ..")
	result, err = am.ClaimAssetInHTLCusingContractId(contractU1, contractId, base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLCusingContractId with error: %+v", err)
	}
	log.Println(result)
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
}

func testLockAssetAndUnlockAssetUsingContractIdOfBondAsset(assetId string) {

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	query.CcFunc = "CreateAsset"
	query.Args = []string{"t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST"}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	// lock for only few seconds so that unlock/reclaim can be exercised
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	query.CcFunc = "ReadAsset"
	query.Args = []string{"t1", assetId, "false"}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Locker going to query if asset is locked (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(contractU2, contractId)
	if err != nil {
		// It's possible that the time elapses hence the query fails. So don't use log.Fatalf so that we can proceed to unlock
		log.Printf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(contractU1, contractId)
	if err != nil {
		log.Printf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset (via contract-id) ..")
	result, err = am.ReclaimAssetInHTLCusingContractId(contractU2, contractId)
	if err != nil {
		log.Fatalf("failed ReclaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
}

func testLockAssetAndClaimAssetOfTokenAsset() {

	assetType := "token1"
	numUnits := uint64(5)

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockFungibleAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create token assets: ", numUnits)
	query.CcFunc = "IssueTokenAssets"
	query.Args = []string{assetType, "6", base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for locker after issueance ..")
	query.CcFunc = "GetBalance"
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateFungibleHTLC(contractU2, assetType, numUnits, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateFungibleHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	log.Println("Query the token balance for locker before claim ..")
	query.CcFunc = "GetBalance"
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for recipient before claim ..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(contractU2, contractId)
	if err != nil {
		log.Fatalf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(contractU1, contractId)
	if err != nil {
		log.Fatalf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient ..")
	result, err = am.ClaimFungibleAssetInHTLC(contractU1, contractId, base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Query the token balance for locker after claim..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for recipient after claim..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
}

func testLockAssetAndUnlockAssetOfTokenAsset() {

	assetType := "token1"
	numUnits := uint64(5)

	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "",
		Args:         []string{},
	}
	user1Network1 := "user1"
	user2Network1 := "Admin@org1.network1.com"

	_, contractU1, wallet1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user1Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU1, err := helpers.GetIdentityFromWallet(wallet1, user1Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user1Network1, err.Error())
	}
	_, contractU2, wallet2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", connProfilePath, "network1", "Org1MSP", true, user2Network1, "", true)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %s", err.Error())
	}
	idU2, err := helpers.GetIdentityFromWallet(wallet2, user2Network1)
	if err != nil {
		log.Fatalf("failed to get identity for %s with error: %s", user2Network1, err.Error())
	}

	// register for chaincode event
	eventName := "LockFungibleAsset"
	reg, notifier, errEventRegistration := registerEvent(contractU2, eventName)
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create token assets: ", numUnits)
	query.CcFunc = "IssueTokenAssets"
	query.Args = []string{assetType, "6", base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for locker after issueance ..")
	query.CcFunc = "GetBalance"
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateFungibleHTLC(contractU2, assetType, numUnits, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateFungibleHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result

	if errEventRegistration == nil {
		receiveEvent(notifier, eventName)
	}

	log.Println("Query the token balance for locker before reclaim ..")
	query.CcFunc = "GetBalance"
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for recipient before reclaim ..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(contractU2, contractId)
	if err != nil {
		log.Printf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(contractU1, contractId)
	if err != nil {
		log.Printf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset ..")
	result, err = am.ReclaimFungibleAssetInHTLC(contractU2, contractId)
	if err != nil {
		log.Fatalf("failed ReclaimFungibleAssetInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Query the token balance for locker after reclaim..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user2Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
	log.Println("Query the token balance for recipient after reclaim..")
	query.Args = []string{assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate))}
	_, err = helpers.Query(query, connProfilePath, "network1", "Org1MSP", user1Network1)
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}

}

func fetchAccessControlPolicy(networkId string) {
	connProfilePath := "../../../tests/network-setups/fabric/shared/" + networkId + "/peerOrganizations/org1." + networkId + ".com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "interop",
		Channel:      "mychannel",
		CcFunc:       "GetAccessControlPolicyBySecurityDomain",
		Args:         []string{networkId},
	}

	result, err := helpers.Query(query, connProfilePath, networkId, "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %+v", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Query result: %s", query.CcFunc, string(result))
}

func fetchMembership(networkId string) {
	connProfilePath := "../../../tests/network-setups/fabric/shared/" + networkId + "/peerOrganizations/org1." + networkId + ".com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "interop",
		Channel:      "mychannel",
		CcFunc:       "GetMembershipBySecurityDomain",
		Args:         []string{networkId},
	}

	result, err := helpers.Query(query, connProfilePath, networkId, "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %+v", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Query result: %s", query.CcFunc, string(result))
}

func fetchVerificationPolicy(networkId string) {
	connProfilePath := "../../../tests/network-setups/fabric/shared/" + networkId + "/peerOrganizations/org1." + networkId + ".com/connection-org1.yaml"
	query := helpers.QueryType{
		ContractName: "interop",
		Channel:      "mychannel",
		CcFunc:       "GetVerificationPolicyBySecurityDomain",
		Args:         []string{networkId},
	}

	result, err := helpers.Query(query, connProfilePath, networkId, "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %+v", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Query result: %s", query.CcFunc, string(result))
}

func configureNetwork(networkId string) {
	interopsetup.ConfigureNetwork(networkId)
}

type signer struct {
	signkeyPEM []byte
}

func hashMessage(msg []byte) []byte {
	hash := sha256.New()
	hash.Write(msg)
	return hash.Sum(nil)
}

func (s *signer) Sign(msg []byte) ([]byte, error) {
	signkeyBytes, _ := pem.Decode(s.signkeyPEM)
	if signkeyBytes == nil {
		return nil, fmt.Errorf("no PEM data found in signkeyPEM: %s", s.signkeyPEM)
	}
	signkeyPriv, err := x509.ParsePKCS8PrivateKey(signkeyBytes.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed x509.ParsePKCS8PrivateKey with error: %s", err.Error())
	}

	signature, err := ecdsa.SignASN1(rand.Reader, signkeyPriv.(*ecdsa.PrivateKey), hashMessage(msg))
	if err != nil {
		return nil, fmt.Errorf("failed ecdsa.SignASN1 with error: %s", err.Error())
	}
	return signature, nil
}

func interop(key string, localNetwork string, requestingOrg string, address string) {
	relayEnv, err := helpers.GetNetworkConfig(localNetwork)
	if err != nil {
		log.Fatalf("failed helpers.GetNetworkConfig with error: %+v", err.Error())
	}
	log.Debugf("relayEnv: %+v", relayEnv)

	if (relayEnv.RelayEndPoint == "") || (relayEnv.ConnProfilePath == "") {
		log.Fatalf("please use a valid --local-network. If valid network please check if your environment variables are configured properly")
	}
	networkName := localNetwork
	channel := "mychannel"
	contractName := "interop"
	connProfilePath := relayEnv.ConnProfilePath
	mspId := requestingOrg
	username := "user1"

	_, contract, wallet, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), channel, contractName, connProfilePath,
		networkName, mspId, true, username, "", true)
	if err != nil {
		log.Fatalf("failed helpers.FabricHelper with error: %s", err.Error())
	}
	keyUser, certUser, err := helpers.GetKeyAndCertForRemoteRequestbyUserName(wallet, username)
	if err != nil {
		log.Fatalf("failed helpers.GetKeyAndCertForRemoteRequestbyUserName with error: %s", err.Error())
	}
	log.Debugf("keyUser: %s & certUser: %s", keyUser, certUser)

	applicationFunction := "Create"
	args := []string{key, ""}
	invokeObject := types.Query{
		ContractName: "simplestate",
		Channel:      channel,
		CcFunc:       applicationFunction,
		CcArgs:       args,
	}
	log.Debugf("invokeObject: %+v", invokeObject)

	interopJSON := types.InteropJSON{
		Address:        address,
		ChaincodeFunc:  "Read",
		ChaincodeId:    "simplestate",
		ChannelId:      channel,
		RemoteEndPoint: "localhost:9080",
		NetworkId:      "network1",
		Sign:           true,
		CcArgs:         []string{"a"},
	}
	log.Debugf("interopJSON: %+v", interopJSON)
	interopJSONs := []types.InteropJSON{interopJSON}

	interopArgIndices := []int{1}

	signer := &signer{
		signkeyPEM: []byte(keyUser),
	}

	interopFlowResponse, _, err := interoperablehelper.InteropFlow(contract, networkName, invokeObject, requestingOrg, relayEnv.RelayEndPoint, interopArgIndices, interopJSONs, signer, certUser, false, false)
	if err != nil {
		log.Fatalf("failed interoperablehelper.InteropFlow with error: %s", err.Error())
	}
	log.Debugf("interopFlowResponse: %v", interopFlowResponse[0])
	remoteValue, err := interoperablehelper.GetResponseDataFromView(interopFlowResponse[0])
	if err != nil {
		log.Fatalf("failed interoperablehelper.GetResponseDataFromView with error: %s", err.Error())
	}
	log.Infof("called function %s with args: %s and %s", applicationFunction, invokeObject.CcArgs[0], remoteValue)
}

func main() {

	// need the chaincodes simplestate and interop to exercise the below interop calls
	//interop("a", "network1", "Org1MSP", "localhost:9080/network1/mychannel:simplestate:Read:a")
	//interop("a", "network1", "Org1MSP", "localhost:9083/network2/mychannel:simplestate:Read:Arcturus")

	//configureNetwork("network1")
	//fetchAccessControlPolicy("network1")
	//fetchMembership("network1")
	//fetchVerificationPolicy("network1")

	//connectSimpleStateWithSDK() // needs the chaincode simplestate on the channel
	//connectSimpleAssetWithSDK("a001") // needs the chaincode simpleasset on the channel
	testLockAssetAndClaimAssetOfBondAsset("a020") // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetOfBondAsset("a021") // needs the chaincodes simpleasset and interop on the channel

	//testLockAssetAndClaimAssetUsingContractIdOfBondAsset("a040") // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetUsingContractIdOfBondAsset("a041") // needs the chaincodes simpleasset and interop on the channel

	//testLockAssetAndClaimAssetOfTokenAsset() // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetOfTokenAsset() // needs the chaincodes simpleasset and interop on the channel
}
