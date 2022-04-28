/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// handleExternalRequest contains the chaincode function to process an interop request
// coming from a remote network
package main

import (
	"encoding/base64"
	"errors"
	"fmt"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	protoV2 "google.golang.org/protobuf/proto"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

// HandleExternalRequest chaincode processes requests that come from external networks.
//
// The flow coordinates the following:
// 1. Checks the validity of query signature
// 2. Checks that the certificate of the requester is valid according to the network's Membership
// 3. Checks the access control policy for the requester and view address is met
// 4. Calls application chaincode
func (s *SmartContract) HandleExternalRequest(ctx contractapi.TransactionContextInterface, b64QueryBytes string) (string, error) {
	// Ensure that this function cannot be called by a client without relay permissions
	relayAccessCheck, err := wutils.IsClientRelay(ctx.GetStub())
	if err != nil {
		return "", err
	}
	if !relayAccessCheck {
		return "", fmt.Errorf("Illegal access by relay")
	}
	fmt.Println("Relay access check passed")

	queryBytes, err := base64.StdEncoding.DecodeString(b64QueryBytes)
	if err != nil {
		errorMessage := fmt.Sprintf("Unable to base64 decode data: %s", err.Error())
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	var query common.Query
	err = protoV2.Unmarshal(queryBytes, &query)
	if err != nil {
		errorMessage := fmt.Sprintf("Unable to unmarshal query: %s", err.Error())
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	x509Cert, err := parseCert(query.Certificate)
	if err != nil {
		errorMessage := fmt.Sprintf("Unable to parse certificate: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	// 1. Checks the validity of query signature
	signatureBytes, err := base64.StdEncoding.DecodeString(query.RequestorSignature)
	if err != nil {
		errorMessage := fmt.Sprintf("Signature base64 decoding failed: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	err = validateSignature(query.Address+query.Nonce, x509Cert, string(signatureBytes))
	if err != nil {
		errorMessage := fmt.Sprintf("Invalid Signature: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	// 2. Checks that the certificate of the requester is valid according to the network's Membership
	if query.RequestingOrg == "" {
		query.RequestingOrg = x509Cert.Issuer.Organization[0]
	}

	err = verifyMemberInSecurityDomain(s, ctx, x509Cert, query.RequestingNetwork, query.RequestingOrg)
	if err != nil {
		errorMessage := fmt.Sprintf("Membership Verification failed: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	// 3. Checks the access control policy for the requester and view address is met
	address, err := parseAddress(query.Address)
	if err != nil {
		errorMessage := fmt.Sprintf("Invalid address: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	viewAddress, err := parseFabricViewAddress(address.ViewSegment)
	if err != nil {
		errorMessage := fmt.Sprintf("Invalid view address: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	err = verifyAccessToCC(s, ctx, viewAddress, address.ViewSegment, &query)
	if err != nil {
		errorMessage := fmt.Sprintf("CC Access Denied: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	// 4. Calls application chaincode
	arr := append([]string{viewAddress.CCFunc}, viewAddress.Args...)
	byteArgs := strArrToBytesArr(arr)

	localCCId, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	payload := []byte("")
	confidential := false
	if localCCId == viewAddress.Contract {
		// Interop call to InteropCC itself.
		resp := ""
		if viewAddress.CCFunc == "GetHTLCHash" {
			if len(viewAddress.Args) > 2 {
				errorMessage := fmt.Sprintf("Recieved more arguments than required 2 argument.")
				log.Error(errorMessage)
				return "", errors.New(errorMessage)
			}
			resp, err = s.GetHTLCHash(ctx, viewAddress.Args[0], viewAddress.Args[1])
		} else if viewAddress.CCFunc == "GetHTLCHashByContractId" {
			if len(viewAddress.Args) > 1 {
				errorMessage := fmt.Sprintf("Recieved more arguments than required 1 argument.")
				log.Error(errorMessage)
				return "", errors.New(errorMessage)
			}
			resp, err = s.GetHTLCHashByContractId(ctx, viewAddress.Args[0])
		} else if viewAddress.CCFunc == "GetHTLCHashPreImage" {
			if len(viewAddress.Args) > 2 {
				errorMessage := fmt.Sprintf("Recieved more arguments than required 2 argument.")
				log.Error(errorMessage)
				return "", errors.New(errorMessage)
			}
			resp, err = s.GetHTLCHashPreImage(ctx, viewAddress.Args[0], viewAddress.Args[1])
		} else if viewAddress.CCFunc == "GetHTLCHashPreImageByContractId" {
			if len(viewAddress.Args) > 1 {
				errorMessage := fmt.Sprintf("Recieved more arguments than required 1 argument.")
				log.Error(errorMessage)
				return "", errors.New(errorMessage)
			}
			resp, err = s.GetHTLCHashPreImageByContractId(ctx, viewAddress.Args[0])
		} else {
			errorMessage := fmt.Sprintf("Given function %s can not be invoked in Interop Chaincode.", viewAddress.CCFunc)
			err = errors.New(errorMessage)
		}
		if err != nil {
			log.Error(err)
			return "", err
		}
		payload = []byte(resp)
	} else {
		// General Interop Call to AppCC
		pbResp := ctx.GetStub().InvokeChaincode(viewAddress.Contract, byteArgs, viewAddress.Channel)
		if pbResp.Status != shim.OK {
			errorMessage := fmt.Sprintf("Application chaincode invoke error: %s", string(pbResp.GetMessage()))
			log.Error(errorMessage)
			return "", errors.New(errorMessage)
		}
		// 5. Encrypt payload if necessary
		confFlag, err := ctx.GetStub().GetState(e2eConfidentialityKey)
		if err != nil {
			log.Error(err)
			return "", err
		}
		if query.Confidential || string(confFlag) == "true" {
			confidential = true
			// Generate encrypted payload and corroborating hash (HMAC)
			// Use already authenticated certificate as the source of the public key for encryption
			payload, err = generateConfidentialInteropPayloadAndHash(pbResp.Payload, query.Certificate)
			if err != nil {
				log.Error(err)
				return "", err
			}
		} else {
			payload = pbResp.Payload
		}
	}

	interopPayloadStruct := common.InteropPayload{
		Address: query.Address,
		Payload: payload,
		Confidential: confidential,
		RequestorCertificate: query.Certificate,
		Nonce: query.Nonce,
	}
	interopPayloadBytes, err := protoV2.Marshal(&interopPayloadStruct)
	if err != nil {
		errorMessage := fmt.Sprintf("Unable to marshal interop payload: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	return string(interopPayloadBytes), nil
}
