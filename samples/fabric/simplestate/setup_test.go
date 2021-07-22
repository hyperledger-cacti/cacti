/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main_test

import (
	"os"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simplestate/mocks"
	ss "github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simplestate"
)

const (
	myOrg1Msp               = "Org1Testmsp"
	myOrg1Clientid          = "myOrg1Userid"
)

func prepMockStub() (*mocks.TransactionContext, *mocks.ChaincodeStub, ss.SmartContract) {
	transactionContext, chaincodeStub := prepMocks(myOrg1Msp, myOrg1Clientid)
	sc := ss.SmartContract{}
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
