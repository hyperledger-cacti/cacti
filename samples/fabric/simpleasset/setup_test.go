/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main_test

import (
	"os"
	"github.com/hyperledger-labs/weaver/samples/simpleasset/mocks"
	sa "github.com/hyperledger-labs/weaver/samples/simpleasset"
)

const (
	myOrg1Msp               = "Org1Testmsp"
	myOrg1Clientid          = "myOrg1Userid"
	interopChaincodeId      = "interopcc"
)

func prepMockStub() (*mocks.TransactionContext, *mocks.ChaincodeStub, sa.SmartContract) {
	transactionContext, chaincodeStub := prepMocks(myOrg1Msp, myOrg1Clientid)
	sc := sa.SmartContract{}
	sc.ConfigureInterop(interopChaincodeId)
	return transactionContext, chaincodeStub, sc
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

func prepMockStubwithIterator() (*mocks.TransactionContext, *mocks.ChaincodeStub, *mocks.StateQueryIterator, sa.SmartContract) {
	transactionContext, chaincodeStub := prepMocks(myOrg1Msp, myOrg1Clientid)
	iterator := &mocks.StateQueryIterator{}
	sc := sa.SmartContract{}
	sc.ConfigureInterop(interopChaincodeId)
	return transactionContext, chaincodeStub, iterator, sc
}
