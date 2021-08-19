/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package utils

import (
	"errors"
	"fmt"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shim"
    "github.com/hyperledger/fabric-chaincode-go/pkg/cid"
    pb "github.com/hyperledger/fabric-protos-go/peer"
)

// getLocalChaincodeID extracts chaincode id from stub
func GetLocalChaincodeID(stub shim.ChaincodeStubInterface) (string, error) {
	sp, err := stub.GetSignedProposal()
	if err != nil {
		return "", err
	}
	proposal := &pb.Proposal{}
	if sp == nil || sp.ProposalBytes == nil {
		return "", errors.New("No proposal found")
	}
	err = proto.Unmarshal(sp.ProposalBytes, proposal)
	if err != nil {
		return "", errors.New("Unable to unmarshal the proposal in ESCC")
	}
	payload := &pb.ChaincodeProposalPayload{}
	if proposal.Payload == nil {
		return "", errors.New("No chaincode found in proposal payload")
	}
	err = proto.Unmarshal(proposal.Payload, payload)
	if err != nil {
		return "", errors.New("Unable to unmarshal the proposal payload in ESCC")
	}
	invocationSpec := &pb.ChaincodeInvocationSpec{}
	if payload.Input == nil {
		return "", errors.New("No chaincode invocation spec found in proposal payload")
	}
	err = proto.Unmarshal(payload.Input, invocationSpec)
	if err != nil {
		return "", errors.New("Unable to unmarshal the proposal payload spec in ESCC")
	}
    fmt.Printf("Chaincode spec: %+v\n", invocationSpec.ChaincodeSpec)
	return invocationSpec.ChaincodeSpec.ChaincodeId.Name, nil
}

func IsClientRelay(stub shim.ChaincodeStubInterface) (bool, error) {
	// check if caller certificate has the attribute "relay"
	// we don't care about the actual value of the attribute for now
	_, ok, err := cid.GetAttributeValue(stub, "relay")
    return ok, err
}
