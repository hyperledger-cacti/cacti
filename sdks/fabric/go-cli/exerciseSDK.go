/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	log "github.com/sirupsen/logrus"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-cli/helpers"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-cli/helpers/interopsetup"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/interoperablehelper"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/types"
)

func connectSimpleStateWithSDK() {
	connProfilePath := "../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.yaml"
	_, contract, _, _ := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simplestate", connProfilePath, "network1", "Org1MSP", "User1@org1.network1.com")

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
	result, err := helpers.Query(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Query error: %s", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Query result: %s", query.CcFunc, string(result))

	// result, err = contract.SubmitTransaction("CreateAsset", "t1", assetId, "User1", "Treasury", "500", "02 Dec 29 15:04 MST")
	// if err != nil {
	// 	log.Fatalf("failed Invoke with error: %+v", err)
	// }
	// log.Println(string(result))

	/*query = helpers.QueryType{
		ContractName: "simpleasset",
		Channel:      "mychannel",
		CcFunc:       "CreateAsset",
		Args:         []string{"t1", assetId + "3", "User1", "Treasury", "455", "02 Dec 29 15:04 MST"},
	}
	result, err = helpers.Invoke(query, connProfilePath, "network1", "Org1MSP", "")
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %+v", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Invoke %v", query.CcFunc, string(result))*/

	result, err = interopsetup.HelperInvoke("CreateAsset", []string{"t1", assetId, "User1", "Treasury", "455", "02 Dec 29 15:04 MST"}, "simpleasset", "mychannel", connProfilePath, "network1")
	if err != nil {
		log.Fatalf("%s helpers.Invoke error: %s", query.CcFunc, err.Error())
	}
	log.Printf("%s helpers.Invoke %v", query.CcFunc, string(result))

	_, contract, _, _ := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simplestate", connProfilePath, "network1", "Org1MSP", "User1@org1.network1.com")
	result, err = contract.EvaluateTransaction("ReadAsset", "t1", assetId, "true")
	if err != nil {
		log.Fatalf("failed Query with error: %s", err)
	}
	log.Println(string(result))

	/*result, err = contract.SubmitTransaction("CreateTokenAssetType", "token1", "Central Bank", "1")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}
	log.Println(string(result))

	result, err = contract.SubmitTransaction("IssueTokenAssets", "token1", "5", "User1")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}
	log.Println(string(result))

	result, err = contract.EvaluateTransaction("GetBalance", "token1", "User1")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Println(string(result))
	*/
}

/*
func testLockAssetAndClaimAssetOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	// register for chaincode event
	reg, notifier, errEventRegistration := registerEvent(contractU2, "LockAsset")
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	err = helpers.Invoke(contractU2, "CreateAsset", "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier)
	}

	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Going to query if asset is locked using locker ..")
	result, err = am.IsAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Going to query if asset is locked using recipient ..")
	result, err = am.IsAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient ..")
	result, err = am.ClaimAssetInHTLC(am.NewGatewayContractInterface(), contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU1, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndUnlockAssetOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	// register for chaincode event
	reg, notifier, errEventRegistration := registerEvent(contractU2, "LockAsset")
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create asset ", assetId)
	err = helpers.Invoke(contractU2, "CreateAsset", "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	// lock for only few seconds so that unlock/reclaim can be exercised
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		// It's possible that the time elapses hence the query fails. So don't use log.Fatalf so that we can proceed to unlock
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier)
	}

	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset ..")
	result, err = am.ReclaimAssetInHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed ReclaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndClaimAssetUsingContractIdOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	fmt.Println("Going to create asset ", assetId)
	err = helpers.Invoke(contractU2, "CreateAsset", "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Going to query if asset is locked using locker (via contarct-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)
	log.Println("Going to query if asset is locked using recipient (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(am.NewGatewayContractInterface(), contractU1, contractId)
	if err != nil {
		log.Fatalf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient (via contract-id) ..")
	result, err = am.ClaimAssetInHTLCusingContractId(am.NewGatewayContractInterface(), contractU1, contractId, base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLCusingContractId with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU1, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndUnlockAssetUsingContractIdOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	fmt.Println("Going to create asset ", assetId)
	err = helpers.Invoke(contractU2, "CreateAsset", "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)), "Treasury", "500", "02 Dec 29 15:04 MST")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	// lock for only few seconds so that unlock/reclaim can be exercised
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateHTLC(am.NewGatewayContractInterface(), contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Locker going to query if asset is locked (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		// It's possible that the time elapses hence the query fails. So don't use log.Fatalf so that we can proceed to unlock
		log.Printf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked (via contract-id) ..")
	result, err = am.IsAssetLockedInHTLCqueryUsingContractId(am.NewGatewayContractInterface(), contractU1, contractId)
	if err != nil {
		log.Printf("failed IsAssetLockedInHTLCqueryUsingContractId with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset (via contract-id) ..")
	result, err = am.ReclaimAssetInHTLCusingContractId(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		log.Fatalf("failed ReclaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndClaimAssetOfTokenAsset() {

	assetType := "token1"
	numUnits := uint64(5)
	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	// register for chaincode event
	reg, notifier, errEventRegistration := registerEvent(contractU2, "LockFungibleAsset")
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create token assets: ", numUnits)
	err = helpers.Invoke(contractU2, "IssueTokenAssets", assetType, "6", base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}
	log.Println("Query the token balance for locker after issueance ..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 600

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateFungibleHTLC(am.NewGatewayContractInterface(), contractU2, assetType, numUnits, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateFungibleHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result

	if errEventRegistration == nil {
		receiveEvent(notifier)
	}

	log.Println("Query the token balance for locker before claim ..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Println("Query the token balance for recipient before claim ..")
	err = helpers.Query(contractU1, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		log.Fatalf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU1, contractId)
	if err != nil {
		log.Fatalf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to claim a locked asset by recipient ..")
	result, err = am.ClaimFungibleAssetInHTLC(am.NewGatewayContractInterface(), contractU1, contractId, base64.StdEncoding.EncodeToString([]byte(preimage)))
	if err != nil {
		log.Fatalf("failed ClaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Query the token balance for locker after claim..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Println("Query the token balance for recipient after claim..")
	err = helpers.Query(contractU1, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndUnlockAssetOfTokenAsset() {

	assetType := "token1"
	numUnits := uint64(5)
	contractU1, idU1, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), "mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com", "connection-org1.yaml")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	// register for chaincode event
	reg, notifier, errEventRegistration := registerEvent(contractU2, "LockFungibleAsset")
	defer contractU2.Unregister(reg)

	fmt.Println("Going to create token assets: ", numUnits)
	err = helpers.Invoke(contractU2, "IssueTokenAssets", assetType, "6", base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}
	log.Println("Query the token balance for locker after issueance ..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	preimage := "abcd"
	hashBase64 := am.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	expiryTimeSecs := currentTimeSecs + 1

	log.Println("Going to lock asset by locker ..")
	result, err := am.CreateFungibleHTLC(am.NewGatewayContractInterface(), contractU2, assetType, numUnits, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateFungibleHTLC with error: %+v", err)
	}
	log.Println(result)
	contractId := result
	log.Println("Query the token balance for locker before claim ..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Println("Query the token balance for recipient before claim ..")
	err = helpers.Query(contractU1, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Locker going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		log.Printf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Recipient going to query if asset is locked ..")
	result, err = am.IsFungibleAssetLockedInHTLC(am.NewGatewayContractInterface(), contractU1, contractId)
	if err != nil {
		log.Printf("failed IsFungibleAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Locker going to unlock/reclaim a locked asset ..")
	result, err = am.ReclaimFungibleAssetInHTLC(am.NewGatewayContractInterface(), contractU2, contractId)
	if err != nil {
		log.Fatalf("failed ReclaimFungibleAssetInHTLC with error: %+v", err)
	}
	log.Println(result)

	if errEventRegistration == nil {
		receiveEvent(notifier)
	}

	log.Println("Query the token balance for locker after claim..")
	err = helpers.Query(contractU2, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
	log.Println("Query the token balance for recipient after claim..")
	err = helpers.Query(contractU1, "GetBalance", assetType, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}
*/

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
	username := "User1@org1." + localNetwork + ".com"

	_, contract, wallet, err := helpers.FabricHelper(helpers.NewGatewayNetworkInterface(), channel, contractName, connProfilePath,
		networkName, mspId, username)
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
	interoperablehelper.InteropFlow(contract, networkName, invokeObject, requestingOrg, relayEnv.RelayEndPoint, interopArgIndices, interopJSONs, keyUser, certUser, false)

}

func main() {

	interop("a", "network1", "Org1MSP", "localhost:9080/network1/mychannel:simplestate:Read:a")

	//configureNetwork("network1")
	//fetchAccessControlPolicy("network1")
	//fetchMembership("network1")
	//fetchVerificationPolicy("network1")

	//connectSimpleStateWithSDK() // needs the chaincode simplestate on the channel
	//connectSimpleAssetWithSDK("a001") // needs the chaincode simpleasset on the channel
	//testLockAssetAndClaimAssetOfBondAsset("a020")  // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetOfBondAsset("a021") // needs the chaincodes simpleasset and interop on the channel

	//testLockAssetAndClaimAssetUsingContractIdOfBondAsset("a040")  // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetUsingContractIdOfBondAsset("a041") // needs the chaincodes simpleasset and interop on the channel

	//testLockAssetAndClaimAssetOfTokenAsset()  // needs the chaincodes simpleasset and interop on the channel
	//testLockAssetAndUnlockAssetOfTokenAsset() // needs the chaincodes simpleasset and interop on the channel
}
