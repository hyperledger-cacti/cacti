/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"encoding/base64"
	"fmt"
	"time"

	log "github.com/sirupsen/logrus"

	am "github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/asset-manager"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/helpers"
)

func connectSimpleStateWithSDK() {
	contractU1, _, _ := helpers.FabricHelper("mychannel", "simplestate", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com")

	err := helpers.Query(contractU1, "Read", "a")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	err = helpers.Invoke(contractU1, "Create", "key01", "value")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	err = helpers.Query(contractU1, "Read", "key01")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
}

func connectSimpleAssetWithSDK(assetId string) {
	contractU1, _, _ := helpers.FabricHelper("mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com")

	err := helpers.Query(contractU1, "GetAllAssets")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	err = helpers.Invoke(contractU1, "CreateAsset", "t1", assetId, "User1", "Treasury", "500", "02 Dec 29 15:04 MST")
	if err != nil {
		log.Fatalf("failed Invoke with error: %+v", err)
	}

	err = helpers.Query(contractU1, "ReadAsset", "t1", assetId, "true")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}
}

func testLockAssetAndClaimAssetOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper("mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper("mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com")
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
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
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
	err = helpers.Query(contractU1, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func testLockAssetAndUnlockAssetOfBondAsset(assetId string) {

	contractU1, idU1, err := helpers.FabricHelper("mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "User1@org1.network1.com")
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}
	contractU2, idU2, err := helpers.FabricHelper("mychannel", "simpleasset", "../../../tests/network-setups/fabric/shared", "network1", "Org1MSP", "Admin@org1.network1.com")
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
	result, err := am.CreateHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), hashBase64, expiryTimeSecs)
	if err != nil {
		log.Fatalf("failed CreateHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

	log.Println("Going to query if asset is locked using locker ..")
	result, err = am.IsAssetLockedInHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		// It's possible that the time elapses hence the query fails. So don't use log.Fatalf so that we can proceed to unlock
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)
	log.Println("Going to query if asset is locked using recipient ..")
	result, err = am.IsAssetLockedInHTLC(contractU1, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)), base64.StdEncoding.EncodeToString([]byte(idU2.Credentials.Certificate)))
	if err != nil {
		log.Printf("failed IsAssetLockedInHTLC with error: %+v", err)
	}
	log.Println(result)

	log.Println("Going to unlock/reclaim a locked asset using recipient ..")
	result, err = am.ReclaimAssetInHTLC(contractU2, "t1", assetId, base64.StdEncoding.EncodeToString([]byte(idU1.Credentials.Certificate)))
	if err != nil {
		log.Fatalf("failed ReclaimAssetInHTLC with error: %+v", err)
	}
	log.Println(result)
	err = helpers.Query(contractU2, "ReadAsset", "t1", assetId, "false")
	if err != nil {
		log.Fatalf("failed Query with error: %+v", err)
	}

}

func main() {
	connectSimpleStateWithSDK()
	connectSimpleAssetWithSDK("a001")
	testLockAssetAndClaimAssetOfBondAsset("a040")
	testLockAssetAndUnlockAssetOfBondAsset("a041")
}
