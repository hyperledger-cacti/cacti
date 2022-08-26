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
	"strings"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
	protoV2 "google.golang.org/protobuf/proto"
)

// HandleExternalRequest chaincode processes requests that come from external networks.
//
// The flow coordinates the following:
// 1. Checks the validity of query signature
// 2. Checks that the certificate of the requester is valid according to the network's Membership
// 3. Checks the access control policy for the requester and view address is met
// 4. Calls application chaincode
func (s *SmartContract) HandleExternalRequest(ctx contractapi.TransactionContextInterface, b64QueryBytes string) (string, error) {
	queryBytes, err := base64.StdEncoding.DecodeString(b64QueryBytes)
	if err != nil {
		return "", logThenErrorf("Unable to base64 decode data: %s", err.Error())
	}
	var query common.Query
	err = protoV2.Unmarshal(queryBytes, &query)
	if err != nil {
		return "", logThenErrorf("Unable to unmarshal query: %s", err.Error())
	}
	resp, err := handleRequest(s, ctx, query, query.Address)
	return resp, err
}

func (s *SmartContract) HandleEventRequest(ctx contractapi.TransactionContextInterface, b64QueryBytes string, dynamicQueryArg string) (string, error) {
	queryBytes, err := base64.StdEncoding.DecodeString(b64QueryBytes)
	if err != nil {
		return "", logThenErrorf("Unable to base64 decode data: %s", err.Error())
	}
	var query common.Query
	err = protoV2.Unmarshal(queryBytes, &query)
	if err != nil {
		return "", logThenErrorf("Unable to unmarshal query: %s", err.Error())
	}

	queryAddress := query.Address
	dynamicArgCount := strings.Count(query.Address, ":?")
	// TODO: this is a stopgap logic and will be reviewed and possibly changed later
	if dynamicArgCount > 1 {
		return "", logThenErrorf("Expected 1 dynamic argument in the event query address, but found %d", dynamicArgCount)
	} else if dynamicArgCount == 1 {
		queryAddress = strings.Replace(query.Address, ":?", ":"+dynamicQueryArg, 1)
		fmt.Println("There is 1 dynamic argument in the event query address, queryArg: ", dynamicQueryArg)
	} else {
		fmt.Println("There are no dynamic arguments in the event query address, queryArg: ", dynamicQueryArg)
	}

	resp, err := handleRequest(s, ctx, query, queryAddress)
	return resp, err
}

// This function handleRequest handle requests that originate in external requests and have come through relays.
//
// The flow coordinates the following:
// 1. Checks the validity of query signature
// 2. Checks that the certificate of the requester is valid according to the network's Membership
// 3. Checks the access control policy for the requester and view address is met
// 4. Calls application chaincode
func handleRequest(s *SmartContract, ctx contractapi.TransactionContextInterface, query common.Query, queryAddress string) (string, error) {
	// Ensure that this function cannot be called by a client without relay permissions
	relayAccessCheck, err := wutils.IsClientRelay(ctx.GetStub())
	if err != nil {
		return "", err
	}
	if !relayAccessCheck {
		return "", fmt.Errorf("Illegal access by client without relay permissions")
	}
	fmt.Println("Relay access check passed")

	x509Cert, err := parseCert(query.Certificate)
	if err != nil {
		return "", logThenErrorf("Unable to parse certificate: %s", err)
	}
	// 1. Checks the validity of query signature
	signatureBytes, err := base64.StdEncoding.DecodeString(query.RequestorSignature)
	if err != nil {
		return "", logThenErrorf("Signature base64 decoding failed: %s", err)
	}
	err = validateSignature(query.Address+query.Nonce, x509Cert, string(signatureBytes))
	if err != nil {
		return "", logThenErrorf("Invalid Signature: %s", err)
	}
	// 2. Checks that the certificate of the requester is valid according to the network's Membership
	if query.RequestingOrg == "" {
		query.RequestingOrg = x509Cert.Issuer.Organization[0]
	}

	err = verifyMemberInSecurityDomain(s, ctx, query.Certificate, query.RequestingNetwork, query.RequestingOrg)
	if err != nil {
		return "", logThenErrorf("Membership Verification failed: %s", err)
	}
	// 3. Checks the access control policy for the requester and view address is met
	address, err := parseAddress(queryAddress)
	if err != nil {
		return "", logThenErrorf("Invalid address: %s", err)
	}
	viewAddress, err := parseFabricViewAddress(address.ViewSegment)
	if err != nil {
		return "", logThenErrorf("Invalid view address: %s", err)
	}
	err = verifyAccessToCC(s, ctx, viewAddress, address.ViewSegment, &query)
	if err != nil {
		return "", logThenErrorf("CC Access Denied: %s", err)
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
				return "", logThenErrorf("Recieved more arguments than required 2 argument.")
			}
			resp, err = s.GetHTLCHash(ctx, viewAddress.Args[0], viewAddress.Args[1])
		} else if viewAddress.CCFunc == "GetHTLCHashByContractId" {
			if len(viewAddress.Args) > 1 {
				return "", logThenErrorf("Recieved more arguments than required 1 argument.")
			}
			resp, err = s.GetHTLCHashByContractId(ctx, viewAddress.Args[0])
		} else if viewAddress.CCFunc == "GetHTLCHashPreImage" {
			if len(viewAddress.Args) > 2 {
				return "", logThenErrorf("Recieved more arguments than required 2 argument.")
			}
			resp, err = s.GetHTLCHashPreImage(ctx, viewAddress.Args[0], viewAddress.Args[1])
		} else if viewAddress.CCFunc == "GetHTLCHashPreImageByContractId" {
			if len(viewAddress.Args) > 1 {
				return "", logThenErrorf("Recieved more arguments than required 1 argument.")
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
			return "", logThenErrorf("Application chaincode invoke error: %s", string(pbResp.GetMessage()))
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
				return "", logThenErrorf(err.Error())
			}
		} else {
			payload = pbResp.Payload
		}
	}

	interopPayloadStruct := common.InteropPayload{
		Address:              queryAddress,
		Payload:              payload,
		Confidential:         confidential,
		RequestorCertificate: query.Certificate,
		Nonce:                query.Nonce,
	}
	interopPayloadBytes, err := protoV2.Marshal(&interopPayloadStruct)
	if err != nil {
		return "", logThenErrorf("Unable to marshal interop payload: %s", err)
	}
	return string(interopPayloadBytes), nil
}
