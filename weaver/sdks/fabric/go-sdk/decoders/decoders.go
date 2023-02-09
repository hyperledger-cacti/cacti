/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package decoders

import (
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-protos-go/peer"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	log "github.com/sirupsen/logrus"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func DeserializeRemoteProposal(proposalBytes []byte) (*pb.Proposal, error) {
	proposal := &pb.Proposal{}
	err := proto.Unmarshal(proposalBytes, proposal)
	if err != nil {
		return proposal, logThenErrorf(err.Error())
	}

	return proposal, nil
}

func DeserializeRemoteProposalResponse(proposalResponseBytes []byte) (*pb.ProposalResponse, error) {
	proposalResponse := &pb.ProposalResponse{}
	err := proto.Unmarshal(proposalResponseBytes, proposalResponse)
	if err != nil {
		return proposalResponse, logThenErrorf(err.Error())
	}

	return proposalResponse, nil
}

func DeserializeRemoteProposalHex(proposalBytesHex []byte) (*pb.Proposal, error) {
	proposalBytes, err := hex.DecodeString(string(proposalBytesHex))
	if err != nil {
		return nil, logThenErrorf("cannot decode 'hex' string (%s) to bytes error: %s", proposalBytesHex, err.Error())
	}

	return DeserializeRemoteProposal(proposalBytes)
}

func DeserializeRemoteProposalResponseHex(proposalResponseBytesHex []byte) (*pb.ProposalResponse, error) {
	proposalResponseBytes, err := hex.DecodeString(string(proposalResponseBytesHex))
	if err != nil {
		return nil, logThenErrorf("cannot decode 'hex' string (%s) to bytes error: %s", proposalResponseBytesHex, err.Error())
	}

	return DeserializeRemoteProposalResponse(proposalResponseBytes)
}

func DeserializeRemoteProposalBase64(proposalBytesBase64 []byte) (*pb.Proposal, error) {
	proposalBytes := base64.StdEncoding.EncodeToString(proposalBytesBase64)

	return DeserializeRemoteProposal([]byte(proposalBytes))
}

func DeserializeRemoteProposalResponseBase64(proposalResponseBytesBase64 []byte) (*pb.ProposalResponse, error) {
	proposalResponseBytes := base64.StdEncoding.EncodeToString(proposalResponseBytesBase64)

	return DeserializeRemoteProposalResponse([]byte(proposalResponseBytes))
}

func SerializeRemoteProposalResponse(proposalResponse *peer.ProposalResponse) ([]byte, error) {
	proposalResponseBytes, err := proto.Marshal(proposalResponse)
	if err != nil {
		return nil, logThenErrorf(err.Error())
	}

	return proposalResponseBytes, nil
}
