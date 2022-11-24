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

	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/mocks"
	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

var accessControlAsset = common.AccessControlPolicy{
	SecurityDomain: "2345",
	Rules: []*common.Rule{{
		Principal:     "23444444",
		PrincipalType: "test",
		Resource:      "test",
		Read:          true,
	}},
}

func TestGetAccessControlPolicyBySecurityDomain(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when no access control policy is found
	acString, getError := interopcc.GetAccessControlPolicyBySecurityDomain(ctx, "2345")
	require.EqualError(t, getError, fmt.Sprintf("Access Control Policy with securityDomain: %s does not exist", "2345"))
	require.Equal(t, acString, "")

	// Case when access control policy is found
	value, err := json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(value, nil)
	assetRead, err := interopcc.GetAccessControlPolicyBySecurityDomain(ctx, "2345")
	require.NoError(t, err)
	require.Equal(t, string(value), assetRead)
}

func TestCreateAccessControlPolicy(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Happy case. No existing access control policy is found creates one.
	accessControlBytes, err := json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	// Case when caller is not an admin
	err = interopcc.CreateAccessControlPolicy(ctx, string(accessControlBytes))
	require.EqualError(t, err, "Caller not a network admin; access denied")
	// Set caller to be admin now
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateAccessControlPolicy(ctx, string(accessControlBytes))
	require.NoError(t, err)
	// Invalid Input check
	err = interopcc.CreateAccessControlPolicy(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))
	// AccessPolicy already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.CreateAccessControlPolicy(ctx, string(accessControlBytes))
	require.EqualError(t, err, fmt.Sprintf("AccessControlPolicy already exists for securityDomain: %s", accessControlAsset.SecurityDomain))
}

func TestUpdateAccessControlPolicy(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when no access control policy is found
	accessControlBytes, err := json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	// Case when caller is not an admin
	err = interopcc.UpdateAccessControlPolicy(ctx, string(accessControlBytes))
	require.EqualError(t, err, "Caller not a network admin; access denied")
	// Set caller to be admin now
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.UpdateAccessControlPolicy(ctx, string(accessControlBytes))
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy with securityDomain: %s does not exist", accessControlAsset.SecurityDomain))
	// Invalid Input check
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = interopcc.UpdateAccessControlPolicy(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))
	// AccessPolicy already exists update the access control policy
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = interopcc.UpdateAccessControlPolicy(ctx, string(accessControlBytes))
	require.NoError(t, err)
}

func TestDeleteAccessControlPolicy(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when a policy exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	// Case when caller is not an admin
	err := interopcc.DeleteAccessControlPolicy(ctx, "2343")
	require.EqualError(t, err, "Caller not a network admin; access denied")
	// Set caller to be admin now
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.DeleteAccessControlPolicy(ctx, "2343")
	require.NoError(t, err)

	// Case when no access control policy is found
	chaincodeStub.GetStateReturns(nil, nil)
	err = interopcc.DeleteAccessControlPolicy(ctx, "2343")
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy with securityDomain: %s does not exist", "2343"))

	// Handle GetState Error
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = interopcc.DeleteAccessControlPolicy(ctx, "2343")
	require.EqualError(t, err, fmt.Sprintf("unable to retrieve asset"))
}

func TestVerifyAccessToCC(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// data for tests
	validAddressStruct := FabricViewAddress{
		Channel:  "mychannel",
		Contract: "interop",
		CCFunc:   "Read",
		Args:     []string{"a"},
	}
	viewAddressString := "mychannel:interop:Read:a"
	query := common.Query{
		Policy:             []string{"Notary"},
		Address:            "localhost:9080/network1/mychannel:interop:Read:a",
		RequestingRelay:    "network1-relay",
		RequestingNetwork:  "network1",
		Certificate:        "cert",
		RequestorSignature: "sig",
		Nonce:              "",
		RequestId:          "1234",
		RequestingOrg:      "Org1MSP",
	}

	var rule = common.Rule{
		Principal:     "cert",
		PrincipalType: "certificate",
		Resource:      "mychannel:interop:Read:a",
		Read:          true,
	}
	var ruleArray = []*common.Rule{&rule}
	var accessControlAsset = common.AccessControlPolicy{
		SecurityDomain: "network1",
		Rules:          ruleArray,
	}
	accessControlBytes, err := json.Marshal(&accessControlAsset)
	require.NoError(t, err)

	// Test: Happy case
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.NoError(t, err)
	newRule := common.Rule{
		Principal:     "cert",
		PrincipalType: "certificate",
		Resource:      "mychannel:interop:Read:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&newRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.NoError(t, err)

	newRule = common.Rule{
		Principal:     "Org1MSP",
		PrincipalType: "ca",
		Resource:      "mychannel:interop:Read:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&newRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.NoError(t, err)

	// Test: Invalid Cert
	invalidPrincipalRule := common.Rule{
		Principal:     "asdfasdf",
		PrincipalType: "certificate",
		Resource:      "mychannel:interop:Read:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&invalidPrincipalRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate))

	// Test: Invalid CA
	invalidPrincipalRule = common.Rule{
		Principal:     "asdfasdf",
		PrincipalType: "ca",
		Resource:      "mychannel:interop:Read:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&invalidPrincipalRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate))

	// Test: No rule for requested resource
	differentResourceRule := common.Rule{
		Principal:     "Org1MSP",
		PrincipalType: "ca",
		Resource:      "mychannel:interop:ReadMe:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&differentResourceRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate))

	differentResourceRule = common.Rule{
		Principal:     "cert",
		PrincipalType: "certificate",
		Resource:      "mychannel:interop:ReadMe:*",
		Read:          true,
	}
	accessControlAsset.Rules = []*common.Rule{&differentResourceRule}
	accessControlBytes, err = json.Marshal(&accessControlAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(accessControlBytes, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.EqualError(t, err, fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate))

	// Test: No Rule for ID
	chaincodeStub.GetStateReturns(nil, nil)
	err = verifyAccessToCC(&interopcc, ctx, &validAddressStruct, viewAddressString, &query)
	require.EqualError(t, err, fmt.Sprintf("Access control policy does not exist for network: %s", query.RequestingNetwork))
}
