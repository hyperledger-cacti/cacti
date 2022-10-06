/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/msp"
	"github.com/hyperledger/fabric-protos-go/peer"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/corda"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/fabric"
	protoV2 "google.golang.org/protobuf/proto"
)

type interop interface {
	WriteExternalState(state string) error
}

// Extract data (i.e., query response) from view
func ExtractAndValidateDataFromView(view *common.View, b64ViewContent string) ([]byte, error) {
	var interopPayload common.InteropPayload
	if view.Meta.Protocol == common.Meta_FABRIC {
		var fabricViewData fabric.FabricView
		err := protoV2.Unmarshal(view.Data, &fabricViewData)
		if err != nil {
			return nil, fmt.Errorf("FabricView Unmarshal error: %s", err)
		}
		err = protoV2.Unmarshal(fabricViewData.Response.Payload, &interopPayload)
		if err != nil {
			return nil, fmt.Errorf("Unable to Unmarshal interopPayload: %s", err.Error())
		}
	} else if view.Meta.Protocol == common.Meta_CORDA {
		var cordaViewData corda.ViewData
		err := protoV2.Unmarshal(view.Data, &cordaViewData)
		if err != nil {
			return nil, fmt.Errorf("CordaView Unmarshal error: %s", err)
		}
		err = protoV2.Unmarshal(cordaViewData.Payload, &interopPayload)
		if err != nil {
			return nil, fmt.Errorf("Unable to Unmarshal interopPayload: %s", err.Error())
		}
	} else {
		return nil, fmt.Errorf("Cannot extract data from view; unsupported DLT type: %+v", view.Meta.Protocol)
	}

	// If view data is encrypted, match it to supplied decrypted data using the hash in the view payload
	if interopPayload.Confidential {
		var confidentialPayload common.ConfidentialPayload
		err := protoV2.Unmarshal(interopPayload.Payload, &confidentialPayload)
		if err != nil {
			return nil, fmt.Errorf("ConfidentialPayload Unmarshal error: %s", err)
		}
		viewB64ContentBytes, err := base64.StdEncoding.DecodeString(b64ViewContent)
		if err != nil {
			return nil, fmt.Errorf("Unable to base64 decode view content: %s", err.Error())
		}
		var confidentialPayloadContents common.ConfidentialPayloadContents
		err = protoV2.Unmarshal(viewB64ContentBytes, &confidentialPayloadContents)
		if err != nil {
			return nil, fmt.Errorf("ConfidentialPayloadContents Unmarshal error: %s", err)
		}
		if confidentialPayload.HashType == common.ConfidentialPayload_HMAC {
			payloadHMAC := hmac.New(sha256.New, confidentialPayloadContents.Random)
			payloadHMAC.Write(confidentialPayloadContents.Payload)
			payloadHMACBytes := payloadHMAC.Sum(nil)
			if !bytes.Equal(confidentialPayload.Hash, payloadHMACBytes) {
				return nil, fmt.Errorf("View payload hash does not match hash of data submitted by client")
			}
		} else {
			return nil, fmt.Errorf("Unsupported hash type in interop view payload: %+v", confidentialPayload.HashType)
		}
		return confidentialPayloadContents.Payload, nil
	} else {
		return interopPayload.Payload, nil
	}
}

// Validate view against address, and extract data (i.e., query response) from view
func (s *SmartContract) ParseAndValidateView(ctx contractapi.TransactionContextInterface, address, b64ViewProto, b64ViewContent string) (string, error) {
	viewB64Bytes, err := base64.StdEncoding.DecodeString(b64ViewProto)
	if err != nil {
		return "", fmt.Errorf("Unable to base64 decode data: %s", err.Error())
	}
	var view common.View
	err = protoV2.Unmarshal(viewB64Bytes, &view)
	if err != nil {
		return "", fmt.Errorf("View Unmarshal error: %s", err)
	}

	// 1. Verify proof
	err = s.VerifyView(ctx, b64ViewProto, address)
	if err != nil {
		log.Errorf("Proof obtained from foreign network for query '%s' is INVALID", address)
		return "", fmt.Errorf("VerifyView error: %s", err)
	}

	// 2. Extract response data for consumption by application chaincode
	viewData, err := ExtractAndValidateDataFromView(&view, b64ViewContent)
	if err != nil {
		return "", err
	}
	fmt.Printf("View data: %s\n", string(viewData))

	return string(viewData), nil
}

// WriteExternalState flow is used to process a response from a foreign network for state.
// 1. Verify Proofs that are returned
// 2. Call application chaincode
func (s *SmartContract) WriteExternalState(ctx contractapi.TransactionContextInterface, applicationID string, applicationChannel string, applicationFunction string, applicationArgs []string, argIndicesForSubstitution []int, addresses []string, b64ViewProtos []string, b64ViewContents []string) error {
	if len(argIndicesForSubstitution) != len(addresses) {
		return fmt.Errorf("Number of argument indices for substitution (%d) does not match number of addresses (%d)", len(argIndicesForSubstitution), len(addresses))
	}
	if len(addresses) != len(b64ViewProtos) {
		return fmt.Errorf("Number of addresses (%d) does not match number of views (%d)", len(addresses), len(b64ViewProtos))
	}
	if len(addresses) != len(b64ViewContents) {
		return fmt.Errorf("Number of addresses (%d) does not match number of view contents (%d)", len(addresses), len(b64ViewContents))
	}

	arr := append([]string{applicationFunction}, applicationArgs...)

	// 1. Verify proofs that are returned
	for i, argIndex := range argIndicesForSubstitution {
		// Validate argument index
		if argIndex >= len(applicationArgs) {
			return fmt.Errorf("Index %d out of bounds of array (length %d)", argIndex, len(applicationArgs))
		}
		// Validate proof and extract view data
		viewData, err := s.ParseAndValidateView(ctx, addresses[i], b64ViewProtos[i], b64ViewContents[i])
		if err != nil {
			return err
		}
		// Substitute argument in list with view data
		arr[argIndex + 1] = viewData        // First argument is the CC function name
	}

	// 2. Call application chaincode with created state as the argument
	byteArgs := strArrToBytesArr(arr)
	log.Info(fmt.Sprintf("Calling invoke chaincode. AppId: %s, appChannel: %s", applicationID, applicationChannel))
	pbResp := ctx.GetStub().InvokeChaincode(applicationID, byteArgs, applicationChannel)
	if pbResp.Status != shim.OK {
		return fmt.Errorf("Application chaincode invoke error: %s", string(pbResp.GetMessage()))
	}
	return nil
}

// VerifyView takes a view that is returned from an external network and verifies
// that it is valid according to the proof type used for the particular protocol.
//
// It first determines from the protocol and proof type in the View's metadata how the
// verification should be done and then calls the appropriate verification function.
func (s *SmartContract) VerifyView(ctx contractapi.TransactionContextInterface, b64ViewProto string, address string) error {
	viewB64Bytes, err := base64.StdEncoding.DecodeString(b64ViewProto)
	if err != nil {
		return fmt.Errorf("Unable to base64 decode data: %s", err.Error())
	}
	var view common.View
	err = protoV2.Unmarshal(viewB64Bytes, &view)
	if err != nil {
		return fmt.Errorf("View Unmarshal error: %s", err)
	}
	addressStruct, err := parseAddress(address)
	if err != nil {
		return fmt.Errorf("Unable to parse address: %s", err.Error())
	}
	// Find the verification policy for the network and view.
	verificationPolicy, err := resolvePolicy(s, ctx, addressStruct.LedgerSegment, addressStruct.ViewSegment)
	if err != nil {
		return fmt.Errorf("Unable to resolve verification policy: %s", err.Error())
	}
	switch view.Meta.Protocol {
	case common.Meta_CORDA:
		switch view.Meta.ProofType {
		case "Notarization":
			return verifyCordaNotarization(s, ctx, view.Data, verificationPolicy, addressStruct.LedgerSegment, address)
		default:
			return fmt.Errorf("Proof type not supported: %s", view.Meta.ProofType)
		}
	case common.Meta_FABRIC:
		switch view.Meta.ProofType {
		case "Notarization":
			return verifyFabricNotarization(
				s,
				ctx,
				view.Data,
				verificationPolicy,
				addressStruct.LedgerSegment,
				address)
		default:
			return fmt.Errorf("Proof type not supported: %s", view.Meta.ProofType)
		}
	default:
		return fmt.Errorf("Verification Error: Unrecognised protocol %s", view.Meta.Protocol)
	}

	// TODO: Somewhere, we need to validate the requestor certificate and the nonce within the InteropPayload
}

// The verifyCordaNotarization function is used to verify views that come from a Corda network
// that were generated with Notarization proofs.
//
// Verification requires the following steps:
// 1. Create [CordaViewData] from the view.
// 2. TODO: Verify address in payload is the same as original address
// 3. Verify each of the signatures in the Notarization array according to the data bytes and certificate.
// 4. Check the certificates are valid according to the Membership.
// 5. Check the notarizations fulfill the verification policy of the request.
func verifyCordaNotarization(s *SmartContract, ctx contractapi.TransactionContextInterface, data []byte, verificationPolicy *common.Policy, securityDomain, address string) error {
	var cordaViewData corda.ViewData
	err := protoV2.Unmarshal(data, &cordaViewData)
	if err != nil {
		return fmt.Errorf("Unable to decode corda view data: %s", err.Error())
	}

	signerList := []string{}
	// 3. Verify each of the signatures in the Notarization array according to the data bytes and certificate.
	for _, value := range cordaViewData.Notarizations {
		x509Cert, err := parseCert(value.Certificate)
		if err != nil {
			return fmt.Errorf("Unable to parse certificate: %s", err.Error())
		}
		var interopPayload common.InteropPayload
		err = protoV2.Unmarshal(cordaViewData.Payload, &interopPayload)
		if err != nil {
			return fmt.Errorf("Unable to decode corda view data: %s", err.Error())
		}
		decodedSignature, err := base64.StdEncoding.DecodeString(value.Signature)
		if err != nil {
			return fmt.Errorf("Corda signature could not be decoded from base64: %s", err.Error())
		}
		err = validateSignature(string(cordaViewData.Payload), x509Cert, string(decodedSignature))
		if err != nil {
			return fmt.Errorf("Unable to Validate Signature: %s", err.Error())
		}
		signerList = append(signerList, value.Id)
		// 4. Check the certificates are valid according to the Membership.
		err = verifyMemberInSecurityDomain(s, ctx, value.Certificate, securityDomain, value.Id)
		if err != nil {
			return fmt.Errorf("Verify membership failed. Certificate not valid: %s", err.Error())
		}
	}

	// 5. Check the notarizations fulfill the verification policy of the request.
	requiredSigners := verificationPolicy.Criteria
	for _, signer := range requiredSigners {
		if !Contains(signerList, signer) {
			return fmt.Errorf("Notarizations missing signer: %s", signer)
		}
	}
	log.Infof("Proof associated with response '%s' from Corda network for query '%s' is VALID", string(cordaViewData.Payload), address)
	return nil
}

// The verifyFabricNotarization function is used to verify views that come from a Fabric network
// that were generated with Notarization proofs.
//
// Verification requires the following checks to be performed:
// 1. Ensure the response is in a valid format - view data should be parsed to [FabricViewData] and the
// list of responses in the [FabricViewData] should be parsed to proposal reponses.
// 2. Verify address in payload is the same as original address
// 3. Verify each of the endorser signatures in the ProposalResponse according to the response payload and certificate.
// 4. Check each of the endorser certificates matches the member's entry in the network's Membership.
// 5. Verify the response matches the response inside the ProposalResponsePayload chaincodeaction
// 6. Check the notarizations fulfill the verification policy of the request.
func verifyFabricNotarization(s *SmartContract, ctx contractapi.TransactionContextInterface, data []byte, verificationPolicy *common.Policy, securityDomain string, address string) error {
	// 1. Ensure the response is in a valid format
	var fabricViewData fabric.FabricView
	err := protoV2.Unmarshal(data, &fabricViewData)
	if err != nil {
		return fmt.Errorf("Unable to decode fabric view data: %s", err.Error())
	}
	// 2. Verify address in payload is the same as original address
	var interopPayload common.InteropPayload
	err = protoV2.Unmarshal(fabricViewData.Response.Payload, &interopPayload)
	if err != nil {
		return fmt.Errorf("Unable to Unmarshal interopPayload: %s", err.Error())
	}
	if address != interopPayload.Address {
		return fmt.Errorf("Address in response does not match original address: Original: %s Response: %s", address, interopPayload.Address)
	}
	signerList := []string{}
	for _, endorsment := range fabricViewData.Endorsements {
		var serialisedIdentity msp.SerializedIdentity
		err := proto.Unmarshal(endorsment.Endorser, &serialisedIdentity)
		x509Cert, err := parseCert(string(serialisedIdentity.IdBytes))
		if err != nil {
			return fmt.Errorf("Unable to parse certificate: %s", err.Error())
		}
		proposalResponsePayloadBytes, err := proto.Marshal(fabricViewData.ProposalResponsePayload)
		if err != nil {
			return fmt.Errorf("Unable to marshal proposal response payload: %s", err.Error())
		}

		// 3. Verify each of the endorser signatures in the ProposalResponse according to the response payload and certificate.
		err = validateSignature(string(append(proposalResponsePayloadBytes, endorsment.Endorser...)), x509Cert, string(endorsment.Signature))
		if err != nil {
			return fmt.Errorf("Unable to Validate Signature: %s", err.Error())
		}
		org := serialisedIdentity.Mspid
		// 4. Check each of the endorser certificates matches the member's entry in the network's Membership.
		err = verifyMemberInSecurityDomain(s, ctx, string(serialisedIdentity.IdBytes), securityDomain, org)
		if err != nil {
			return fmt.Errorf("Verify membership failed. Certificate not valid: %s", err.Error())
		}
		signerList = append(signerList, org)
	}
	// 5. Verify the response matches the response inside the ProposalResponsePayload chaincodeaction
	var chaincodeAction peer.ChaincodeAction
	err = proto.Unmarshal(fabricViewData.ProposalResponsePayload.Extension, &chaincodeAction)
	if err != nil {
		return fmt.Errorf("Unable to Unmarshal ChaincodeAction: %s", err.Error())
	}
	if string(chaincodeAction.Response.Payload) != string(fabricViewData.Response.Payload) {
		return fmt.Errorf("Response in fabric view does not match response in proposal response")
	}
	// 6. Check the notarizations fulfill the verification policy of the request.
	requiredSigners := verificationPolicy.Criteria
	for _, signer := range requiredSigners {
		if !Contains(signerList, signer) {
			return fmt.Errorf("Notarizations missing signer: %s", signer)
		}
	}
	log.Infof("Proof associated with response '%s' from Fabric network for query '%s' is VALID", string(fabricViewData.Response.Payload), address)
	return nil
}
