/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// writeExtenalState contains the chaincode function to process a response
// from a remote network
package main

import (
	"encoding/json"
	"testing"
	"io/ioutil"

	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)


type TestData struct {
	B64View             string      `json:"view64"`
	B64ViewConfidential string      `json:"confidential_view64"`
	B64ViewContents     []string    `json:"confidential_view_content64"`
}

func TestWriteExternalState(t *testing.T) {


	var cordaTestDataBytes, _ = ioutil.ReadFile("./test_data/corda_viewdata.json")
	var cordaTestData TestData
	json.Unmarshal(cordaTestDataBytes, &cordaTestData)
	var cordaRootCACert, _ = ioutil.ReadFile("./test_data/corda_cacert_root.pem")
	var cordaDoormanCACert, _ = ioutil.ReadFile("./test_data/corda_cacert_doorman.pem")
	var cordaNodeCACert, _ = ioutil.ReadFile("./test_data/corda_cacert_node.pem")

	var cordaMember = common.Member{
		Value: "",
		Type:  "certificate",
		Chain: []string{string(cordaRootCACert), string(cordaDoormanCACert), string(cordaNodeCACert)},
	}

	var cordaMembership = common.Membership{
		SecurityDomain: "Corda_Network",
		Members:        map[string]*common.Member{"PartyA": &cordaMember},
	}

	var cordaVerificationPolicy = common.VerificationPolicy{
		SecurityDomain: "Corda_Network",
		Identifiers: []*common.Identifier{{
			Pattern: "localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*",
			Policy: &common.Policy{
				Criteria: []string{"PartyA"},
				Type:     "signature",
			},
		}},
	}

	var fabricNetwork = "network1"
	var fabricRelayEndpoint = "relay-network1:9080"
	var fabricPattern = "mychannel:simplestate:Read:a"
	var fabricViewAddress = fabricRelayEndpoint + "/" + fabricNetwork + "/" + fabricPattern

	var fabricTestDataBytes_1_Org, _ = ioutil.ReadFile("./test_data/fabric_viewdata_1_org.json")
	var fabricTestDataBytes_2_Orgs, _ = ioutil.ReadFile("./test_data/fabric_viewdata_2_orgs.json")
	var fabricTestData_1_Org, fabricTestData_2_Orgs TestData
	json.Unmarshal(fabricTestDataBytes_1_Org, &fabricTestData_1_Org)
	json.Unmarshal(fabricTestDataBytes_2_Orgs, &fabricTestData_2_Orgs)

	var fabricCaCertNetwork1, _ = ioutil.ReadFile("./test_data/fabric_cacert_org1.pem")

	var network1Member = common.Member{
		Value: string(fabricCaCertNetwork1),
		Type:  "ca",
		Chain: []string{},
	}

	var fabricCaCertNetwork2, _ = ioutil.ReadFile("./test_data/fabric_cacert_org2.pem")

	var network2Member = common.Member{
		Value: string(fabricCaCertNetwork2),
		Type:  "ca",
		Chain: []string{},
	}

	var network1Membership_1_Org = common.Membership{
		SecurityDomain: fabricNetwork,
		Members:        map[string]*common.Member{"Org1MSP": &network1Member},
	}

	var network1VerificationPolicy_1_Org = common.VerificationPolicy{
		SecurityDomain: fabricNetwork,
		Identifiers: []*common.Identifier{{
			Pattern: fabricPattern,
			Policy: &common.Policy{
				Criteria: []string{"Org1MSP"},
				Type:     "signature",
			},
		}},
	}

	var network1Membership_2_Orgs = common.Membership{
		SecurityDomain: fabricNetwork,
		Members:        map[string]*common.Member{"Org1MSP": &network1Member, "Org2MSP": &network2Member},
	}

	var network1VerificationPolicy_2_Orgs = common.VerificationPolicy{
		SecurityDomain: fabricNetwork,
		Identifiers: []*common.Identifier{{
			Pattern: fabricPattern,
			Policy: &common.Policy{
				Criteria: []string{"Org1MSP", "Org2MSP"},
				Type:     "signature",
			},
		}},
	}

	// Happy case: Fabric: 1 Org
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	// mock all the calls to the chaincode stub
	network1VerificationPolicyBytes, err := json.Marshal(&network1VerificationPolicy_1_Org)
	require.NoError(t, err)
	network1MembershipBytes, err := json.Marshal(&network1Membership_1_Org)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, network1MembershipBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(peer.Response{
		Status:  200,
		Message: "",
		Payload: []byte("I am a result"),
	})

	decContents := []string{""}
	decContentsList := make([][]string, 1)
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_1_Org.B64View}, decContentsList)
	require.NoError(t, err)

	// Test success with encrypted view payload
	chaincodeStub.GetStateReturnsOnCall(2, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(3, network1MembershipBytes, nil)
	decContents = fabricTestData_1_Org.B64ViewContents
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_1_Org.B64ViewConfidential}, decContentsList)
	require.NoError(t, err)

	// Test failures when invalid or insufficient arguments are supplied
	decContents = []string{""}
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{2}, []string{fabricViewAddress}, []string{fabricTestData_1_Org.B64View}, decContentsList)
	require.EqualError(t, err, "Index 2 out of bounds of array (length 2)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{0, 1}, []string{fabricViewAddress}, []string{fabricTestData_1_Org.B64View}, decContentsList)
	require.EqualError(t, err, "Number of argument indices for substitution (2) does not match number of addresses (1)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{}, decContentsList)
	require.EqualError(t, err, "Number of addresses (1) does not match number of views (0)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_1_Org.B64View}, [][]string{})
	require.EqualError(t, err, "Number of addresses (1) does not match number of view contents (0)")

	// Happy case: Fabric: 2 Orgs
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	// mock all the calls to the chaincode stub
	network1VerificationPolicyBytes, err = json.Marshal(&network1VerificationPolicy_2_Orgs)
	require.NoError(t, err)
	network1MembershipBytes, err = json.Marshal(&network1Membership_2_Orgs)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, network1MembershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(2, network1MembershipBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(peer.Response{
		Status:  200,
		Message: "",
		Payload: []byte("I am a result"),
	})

	decContents = []string{"", ""}
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, decContentsList)
	require.NoError(t, err)

	// Test success with encrypted view payload
	chaincodeStub.GetStateReturnsOnCall(3, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(4, network1MembershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(5, network1MembershipBytes, nil)
	decContents = fabricTestData_2_Orgs.B64ViewContents
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64ViewConfidential}, decContentsList)
	require.NoError(t, err)

	// Test failures when invalid or insufficient arguments are supplied
	decContents = []string{"", ""}
	decContentsList[0] = decContents
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{2}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, decContentsList)
	require.EqualError(t, err, "Index 2 out of bounds of array (length 2)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{0, 1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, decContentsList)
	require.EqualError(t, err, "Number of argument indices for substitution (2) does not match number of addresses (1)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{}, decContentsList)
	require.EqualError(t, err, "Number of addresses (1) does not match number of views (0)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, [][]string{})
	require.EqualError(t, err, "Number of addresses (1) does not match number of view contents (0)")

	// Happy case: Corda
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	// mock all the calls to the chaincode stub
	cordaVerificationPolicyBytes, err := json.Marshal(&cordaVerificationPolicy)
	require.NoError(t, err)
	cordaMembershipBytes, err := json.Marshal(&cordaMembership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, cordaVerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, cordaMembershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(2, cordaMembershipBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(peer.Response{
		Status:  200,
		Message: "",
		Payload: []byte("I am a result"),
	})
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{"localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H"}, []string{cordaTestData.B64View}, decContentsList)
	require.NoError(t, err)

	// Test case: Invalid cert in Membership
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	network1Membership_2_Orgs.Members["Org1MSP"].Value = "invalid cert"
	invalidMembershipBytes, err := json.Marshal(&network1Membership_2_Orgs)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, invalidMembershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(2, invalidMembershipBytes, nil)
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, decContentsList)
	require.EqualError(t, err, "VerifyView error: Verify membership failed. Certificate not valid: Client cert not in a known PEM format")

	// Test case: Invalid policy in verification policy
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	network1VerificationPolicy_2_Orgs.Identifiers[0].Pattern = "not matching policy"
	invalidVerificationPolicyBytes, err := json.Marshal(&network1VerificationPolicy_2_Orgs)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, invalidVerificationPolicyBytes, nil)
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{fabricTestData_2_Orgs.B64View}, decContentsList)
	require.EqualError(t, err, "VerifyView error: Unable to resolve verification policy: Verification Policy Error: Failed to find verification policy matching view address: " + fabricPattern)
}
