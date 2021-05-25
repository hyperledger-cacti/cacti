/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package assetmgmt

import (
"os"
"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/mocks"
)

const (
myOrg1Msp               = "Org1Testmsp"
myOrg1Clientid          = "myOrg1Userid"
interopChaincodeId      = "interopcc"
)

func prepMockStub() (*mocks.TransactionContext, *mocks.ChaincodeStub, AssetManagementContract) {
	transactionContext, chaincodeStub := prepMocks(myOrg1Msp, myOrg1Clientid)
	amc := AssetManagementContract{}
	amc.Configure(interopChaincodeId)
	return transactionContext, chaincodeStub, amc
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
