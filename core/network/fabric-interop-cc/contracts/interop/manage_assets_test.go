/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

func TestLockAsset(t *testing.T) {
	ctx, _, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// Test success with asset agreement specified properly
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
}

func TestUnLockAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// Lock asset as per the agreement specified
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Completed locking as asset. Proceed to test unlock asset.")

	assetLockVal := locker + ":" + recipient
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
}
