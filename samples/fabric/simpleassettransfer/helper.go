/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// helper contains miscelaneous helper functions used throughout the code
package main

import (
	"fmt"
	"errors"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/base64"

	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
)

// functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func createKeyValuePairs(m map[string]uint64) string {
	b := new(bytes.Buffer)
	for key, value := range m {
		fmt.Fprintf(b, "%s=\"%d\"\n", key, value)
	}
	return b.String()
}

func generateSHA256HashInHexForm(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashHex := hex.EncodeToString(shaHash)
	return shaHashHex
}

func getBondAssetFromPledge(pledgeBytes64 string) (BondAsset, error) {
	pledge := &common.AssetPledge{}
	assetPledgeSerialized, err := base64.StdEncoding.DecodeString(assetPledgeBase64)
	if err != nil {
		return nil, err
	}
	if len(assetPledgeSerialized) == 0 {
		return nil, fmt.Errorf("empty asset pledge")
	}
	err = proto.Unmarshal([]byte(assetPledgeSerialized), pledge)
	if err != nil {
		return nil, err
	}
	var asset BondAsset
	err = json.Unmarshal(pledge.AssetDetails, &asset)
	return asset, err
}

func getTokenAssetFromPledge(pledgeBytes64 string) (TokenAsset, error) {
	pledge := &common.AssetPledge{}
	assetPledgeSerialized, err := base64.StdEncoding.DecodeString(assetPledgeBase64)
	if err != nil {
		return nil, err
	}
	if len(assetPledgeSerialized) == 0 {
		return nil, fmt.Errorf("empty asset pledge")
	}
	err = proto.Unmarshal([]byte(assetPledgeSerialized), pledge)
	if err != nil {
		return nil, err
	}
	var asset TokenAsset
	err = json.Unmarshal(pledge.AssetDetails, &asset)
	return asset, err
}

func getBondAssetFromClaimStatus(claimStatusBase64 string) (BondAsset, error) {
	claimStatus := &common.AssetClaimStatus{}
	claimStatusSerialized, err := base64.StdEncoding.DecodeString(claimStatusBase64)
	if err != nil {
		return claimStatus, err
	}
	if len(claimStatusSerialized) == 0 {
		return claimStatus, fmt.Errorf("empty asset claim status")
	}
	err = proto.Unmarshal([]byte(claimStatusSerialized), claimStatus)
	if err != nil {
		return claimStatus, err
	}
	var asset BondAsset
	err = json.Unmarshal(claimStatus.AssetDetails, &asset)
	return asset, err
}

func getTokenAssetFromClaimStatus(claimStatusBase64 string) (TokenAsset, error) {
	claimStatus := &common.AssetClaimStatus{}
	claimStatusSerialized, err := base64.StdEncoding.DecodeString(claimStatusBase64)
	if err != nil {
		return claimStatus, err
	}
	if len(claimStatusSerialized) == 0 {
		return claimStatus, fmt.Errorf("empty asset claim status")
	}
	err = proto.Unmarshal([]byte(claimStatusSerialized), claimStatus)
	if err != nil {
		return claimStatus, err
	}
	var asset TokenAsset
	err = json.Unmarshal(claimStatus.AssetDetails, &asset)
	return asset, err
}