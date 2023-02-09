/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// test contains the stubs required for counterfeiter to generate the mocks used for tests
//
// The mocks are created by running `go generate ./...` as described in the counterfeiter readme
package testutils

import (
	"os"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/mocks"
	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/peer"
)

const (
	myOrg1Msp      = "Org1Testmsp"
	myOrg1Clientid = "myOrg1Userid"
)

//go:generate counterfeiter -o mocks/transaction.go -fake-name TransactionContext . transactionContext
type transactionContext interface {
	contractapi.TransactionContextInterface
}

//go:generate counterfeiter -o mocks/chaincodestub.go -fake-name ChaincodeStub . chaincodeStub
type chaincodeStub interface {
	shim.ChaincodeStubInterface
}

//go:generate counterfeiter -o mocks/clientIdentity.go -fake-name ClientIdentity . clientIdentity
type clientIdentity interface {
	cid.ClientIdentity
}

func PrepMockStub() (*mocks.TransactionContext, *mocks.ChaincodeStub) {
	transactionContext, chaincodeStub := prepMocks(myOrg1Msp, myOrg1Clientid)
	return transactionContext, chaincodeStub
}

func SetMockStubCCId(chaincodeStub *mocks.ChaincodeStub, ccName string) {
	chaincodeStub.GetSignedProposalReturns(generateSignedProposal(ccName), nil)
}

func prepMocks(orgMSP, clientID string) (*mocks.TransactionContext, *mocks.ChaincodeStub) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetMSPIDReturns(orgMSP, nil)
	clientIdentity.GetIDReturns(clientID, nil)
	//set matching msp ID using peer shim env variable
	os.Setenv("CORE_PEER_LOCALMSPID", orgMSP)
	transactionContext.GetClientIdentityReturns(clientIdentity)
	return transactionContext, chaincodeStub
}

func generateSignedProposal(ccName string) *peer.SignedProposal {
	cis := &peer.ChaincodeInvocationSpec{
		ChaincodeSpec: &peer.ChaincodeSpec {
			ChaincodeId: &peer.ChaincodeID {
				Name: ccName,
				Version: "v0",	// Any random string will do here
			},
			Input: &peer.ChaincodeInput {
				Args: [][]byte{},
			},
		},
	}
	cisb, _ := proto.Marshal(cis)
	cp := &peer.ChaincodeProposalPayload{ Input: cisb }
	cpb, _ := proto.Marshal(cp)
	prop := &peer.Proposal{ Payload: cpb }
	propb, _ := proto.Marshal(prop)
	sp := &peer.SignedProposal{ ProposalBytes: propb }
	return sp
}
