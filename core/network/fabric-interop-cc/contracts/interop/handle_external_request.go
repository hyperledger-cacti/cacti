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
	"github.ibm.com/dlt-interoperability/fabric-interop-cc/contracts/interop/protos-go/common"
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
		errorMessage := fmt.Sprintf("Unable to base64 decode data: %s", err.Error())
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	var query common.Query
	err = protoV2.Unmarshal(queryBytes, &query)
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
	var requestingOrg string
	if query.RequestingOrg != "" {
		requestingOrg = query.RequestingOrg
	} else {
		requestingOrg = x509Cert.Issuer.Organization[0]
	}

	err = verifyMemberInSecurityDomain(s, ctx, x509Cert, query.RequestingNetwork, requestingOrg)
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
	pbResp := ctx.GetStub().InvokeChaincode(viewAddress.Contract, byteArgs, viewAddress.Channel)
	if pbResp.Status != shim.OK {
		errorMessage := fmt.Sprintf("Application chaincode invoke error: %s", string(pbResp.GetMessage()))
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}

	interopPayloadStruct := common.InteropPayload{
		Address: query.Address,
		Payload: pbResp.Payload,
	}
	interopPayloadBytes, err := protoV2.Marshal(&interopPayloadStruct)
	if err != nil {
		errorMessage := fmt.Sprintf("Unable to marshal interop payload: %s", err)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	return string(interopPayloadBytes), nil
}
