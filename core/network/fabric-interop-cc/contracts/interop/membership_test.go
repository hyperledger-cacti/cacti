/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"bytes"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

var member = common.Member{
	Value: "membervalue",
	Type:  "membertype",
	Chain: []string{"chain"},
}

var membershipAsset = common.Membership{
	SecurityDomain: "2345",
	Members:        map[string]*common.Member{"member1": &member},
}

func TestGetMembershipBySecurityDomain(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when no Membership is found
	acString, getError := interopcc.GetMembershipBySecurityDomain(ctx, "2345")
	require.EqualError(t, getError, fmt.Sprintf("Membership with id: %s does not exist", "2345"))
	require.Equal(t, acString, "")
	value, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(value, nil)
	// Case when Membership is found
	assetRead, err := interopcc.GetMembershipBySecurityDomain(ctx, "2345")
	require.NoError(t, err)
	require.Equal(t, assetRead, string(value))
}

func TestCreateMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)
	// Case when no a Membership is found
	err = interopcc.CreateMembership(ctx, string(membershipBytes))
	require.NoError(t, err)
	// Invalid Input check
	err = interopcc.CreateMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))
	// Membership already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.CreateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, fmt.Sprintf("Membership already exists for membership id: %s", membershipAsset.SecurityDomain))
}

func TestUpdateMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)
	err = interopcc.UpdateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", membershipAsset.SecurityDomain))
	// Invalid Input check
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = interopcc.UpdateMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))

	// Membership already exists update the Membership
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = interopcc.UpdateMembership(ctx, string(membershipBytes))
	require.NoError(t, err)
}

func TestDeleteMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when a Membership exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err := interopcc.DeleteMembership(ctx, "2343")
	require.NoError(t, err)

	// Case when no Membership is found
	chaincodeStub.GetStateReturns(nil, nil)
	err = interopcc.DeleteMembership(ctx, "2343")
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", "2343"))

	// Handle GetState Error
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = interopcc.DeleteMembership(ctx, "2343")
	require.EqualError(t, err, fmt.Sprintf("unable to retrieve asset"))
}

func TestVerifyMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// 1. create all mock data for tests

	// make certificate and convert to PEM format
	now := time.Now()
	threeDays := time.Hour * 24 * 3
	template := x509.Certificate{
		Subject: pkix.Name{
			CommonName: "example-a.com",
		},
		NotBefore:    now.Add(-threeDays),
		NotAfter:     now.Add(threeDays),
		SerialNumber: big.NewInt(1337),
	}

	certDERBytes, _, err := createECDSACertAndKeyFromTemplate(template)
	require.NoError(t, err)

	// Generate PEM cert from DER format
	out := &bytes.Buffer{}
	pem.Encode(out, &pem.Block{Type: "CERTIFICATE", Bytes: certDERBytes})
	pemCert := out.Bytes()

	// convert pem cert to x509 cert
	x509Cert, err := parseCert(string(pemCert))
	require.NoError(t, err)

	// make membership
	var member = common.Member{
		Value: string(pemCert),
		Type:  "ca",
		Chain: []string{"chain"},
	}

	var membershipAsset = common.Membership{
		SecurityDomain: "2345",
		Members:        map[string]*common.Member{"member1": &member},
	}
	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)

	// 2. Test Cases

	// Test: Happy case
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = verifyMemberInSecurityDomain(&interopcc, ctx, x509Cert, "test", "member1")
	require.NoError(t, err)

	// Test: Unknown requesting Org
	err = verifyMemberInSecurityDomain(&interopcc, ctx, x509Cert, "test", "unknown_member")
	require.EqualError(t, err, "Member does not exist for org: unknown_member")

	// Test: Unknown cert type
	membershipAsset.Members["member1"].Type = "unknown"
	membershipBytes, err = json.Marshal(&membershipAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = verifyMemberInSecurityDomain(&interopcc, ctx, x509Cert, "test", "member1")
	require.EqualError(t, err, "Certificate type not supported: unknown")
}
