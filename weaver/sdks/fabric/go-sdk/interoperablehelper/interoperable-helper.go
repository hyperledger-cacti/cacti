/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package interoperablehelper

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/corda"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/fabric"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/helpers"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/relay"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/types"
	log "github.com/sirupsen/logrus"
	protoV2 "google.golang.org/protobuf/proto"
)

type GatewayContract interface {
	EvaluateTransaction(name string, args ...string) ([]byte, error)
	SubmitTransaction(name string, args ...string) ([]byte, error)
}

type Signer interface {
	Sign(msg []byte) ([]byte, error)
}

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func InteropFlow(interopContract GatewayContract, networkId string, invokeObject types.Query, org, localRelayEndpoint string,
	interopArgIndices []int, interopJSONs []types.InteropJSON, signer Signer, certUser string, returnWithoutLocalInvocation bool, confidential bool) ([]*common.View, []byte, error) {
	if len(interopArgIndices) != len(interopJSONs) {
		logThenErrorf("number of argument indices %d does not match number of view addresses %d", len(interopArgIndices), len(interopJSONs))
	}

	// Step 1: Iterate through the view addresses, and send remote requests and get views in response for each
	var views []*common.View
	var viewsSerializedBase64 []string
	var computedAddresses []string
	var viewContentsBase64 []string

	for i := 0; i < len(interopJSONs); i++ {
		requestResponseView, requestResponseAddress, err := getRemoteView(interopContract, networkId, org, localRelayEndpoint, interopJSONs[i], signer, certUser)
		if err != nil {
			return views, nil, logThenErrorf("InteropFlow remote view request error: %s", err.Error())
		}

		viewBytes, err := protoV2.Marshal(requestResponseView)
		if err != nil {
			return views, nil, logThenErrorf("failed to marshal view with error: %s", err.Error())
		}

		views = append(views, requestResponseView)
		computedAddresses = append(computedAddresses, requestResponseAddress)
		viewsSerializedBase64 = append(viewsSerializedBase64, base64.StdEncoding.EncodeToString(viewBytes))

		if confidential {
			// TODO
			respDataContents, _ := GetResponseDataFromView(requestResponseView)
			viewContentsBase64 = append(viewContentsBase64, base64.StdEncoding.EncodeToString(respDataContents))
		} else {
			viewContentsBase64 = append(viewContentsBase64, "")
		}
	}

	// Return here if caller just wants the views and doesn't want to invoke a local chaincode
	if returnWithoutLocalInvocation {
		ccArgs, err := getCCArgsForProofVerification(invokeObject, interopArgIndices, computedAddresses, viewsSerializedBase64, viewContentsBase64)
		if err != nil {
			return views, nil, logThenErrorf("InteropFlow getCCArgsForProofVerification error: %s", err.Error())
		}
		ccArgsBytes, err := json.Marshal(ccArgs)
		if err != nil {
			return views, nil, logThenErrorf("InteropFlow failed Marshal with error: %s", ccArgsBytes)
		}
		return views, ccArgsBytes, nil
	}

	// Step 2
	result, err := submitTransactionWithRemoteViews(interopContract, invokeObject, interopArgIndices, computedAddresses, viewsSerializedBase64, viewContentsBase64)
	if err != nil {
		return views, nil, logThenErrorf("InteropFlow submit transaction with remote view error: %s", err.Error())
	}

	return views, result, nil
}

/**
 * Submit local chaincode transaction to verify a view and write data to ledger.
 * - Prepare arguments and call WriteExternalState.
 **/
func submitTransactionWithRemoteViews(interopContract GatewayContract, invokeObject types.Query,
	interopArgIndices []int, viewAddresses []string, viewsSerializedBase64 []string, viewContentsBase64 []string) ([]byte, error) {
	ccArgs, err := getCCArgsForProofVerification(invokeObject, interopArgIndices, viewAddresses, viewsSerializedBase64, viewContentsBase64)
	if err != nil {
		return nil, logThenErrorf("failed calling getCCArgsForProofVerification with error: %s", err.Error())
	}
	result, err := interopContract.SubmitTransaction("WriteExternalState", ccArgs...)
	if err != nil {
		return result, logThenErrorf("submitTransaction Error: %s", err.Error())
	}

	return result, nil
}

type IdentifierAccessPolicy struct {
	Type     string   `json:"type"`
	Criteria []string `json:"criteria"`
}

type Identifier struct {
	Pattern string                 `json:"pattern"`
	Policy  IdentifierAccessPolicy `json:"policy"`
}

type VerificationPolicy struct {
	SecurityDomain string       `json:"securityDomain"`
	Identifiers    []Identifier `json:"identifiers"`
}

/**
 * Lookup verification policy in the interop chaincode and get the criteria related to query
 **/
func getPolicyCriteriaForAddress(contract GatewayContract, address string) ([]string, error) {
	emptyCriteria := []string{}

	parsedAddress, err := helpers.ParseAddress(address)
	if err != nil {
		logThenErrorf("failed helpers.ParseAddress for %s with error: %s", address, err.Error())
	}
	queryResponse, err := contract.EvaluateTransaction("GetVerificationPolicyBySecurityDomain", parsedAddress.NetworkSegment)
	if err != nil {
		logThenErrorf("failed to evaluate transaction GetVerificationPolicyBySecurityDomain with error: %s", err.Error())
	}

	if string(queryResponse) == "" {
		return emptyCriteria, logThenErrorf("no verification policy for address: %s", address)
	}

	verificationPolicy := VerificationPolicy{}
	err = json.Unmarshal(queryResponse, &verificationPolicy)
	if err != nil {
		return emptyCriteria, logThenErrorf("failed to unmarshal verification policy with error: %s", err.Error())
	}

	// Get policy criteria matching the requested information in the address
	matchingIdentifier := Identifier{
		Pattern: "",
		Policy: IdentifierAccessPolicy{
			Type:     "",
			Criteria: []string{},
		},
	}
	for i := 0; i < len(verificationPolicy.Identifiers); i++ {
		item := verificationPolicy.Identifiers[i]
		if item.Pattern == parsedAddress.ViewSegment {
			matchingIdentifier = item
			break
		}
		if validPatternString(item.Pattern) && isPatternAndAddressMatch(item.Pattern, parsedAddress.ViewSegment) &&
			(matchingIdentifier.Pattern == "") || (len(item.Pattern) > len(matchingIdentifier.Pattern)) {
			matchingIdentifier = item
			break
		}
	}

	return matchingIdentifier.Policy.Criteria, nil
}

func validPatternString(pattern string) bool {
	// count number of stars in pattern
	numStars := strings.Count(pattern, "*")

	// check if 0 or 1 stars
	if numStars <= 1 {
		// if 0 stars, return true, if 1 star, make sure its at the end
		return (numStars == 0) || (strings.Index(pattern, "*")+1 == len(pattern))
	}

	return false
}

func isPatternAndAddressMatch(pattern string, address string) bool {
	// make sure the pattern is valid
	if !validPatternString(pattern) {
		return false
	}

	// count number of stars in pattern
	numStars := strings.Count(pattern, "*")

	// if 0 stars, and exact match, return true
	if numStars == 0 && pattern == address {
		return true
	}

	// if 1 star and pattern is a substring of address, return true
	if numStars == 1 && strings.Contains(address, pattern) {
		return true
	}

	return false
}

/**
 * Extracts actual remote query response embedded in view structure.
 * Argument is a View protobuf ('statePb.View')
 **/
func GetResponseDataFromView(view *common.View) ([]byte, error) {
	var interopPayload common.InteropPayload
	if view.Meta.Protocol == common.Meta_FABRIC {
		var fabricViewData fabric.FabricView
		err := protoV2.Unmarshal(view.Data, &fabricViewData)
		if err != nil {
			return nil, logThenErrorf("fabricView unmarshal error: %s", err.Error())
		}
		err = protoV2.Unmarshal(fabricViewData.Response.Payload, &interopPayload)
		if err != nil {
			return nil, logThenErrorf("unable to unmarshal interopPayload: %s", err.Error())
		}
	} else if view.Meta.Protocol == common.Meta_CORDA {
		var cordaViewData corda.ViewData
		err := protoV2.Unmarshal(view.Data, &cordaViewData)
		if err != nil {
			return nil, fmt.Errorf("cordaView unmarshal error: %s", err.Error())
		}
		err = protoV2.Unmarshal(cordaViewData.Payload, &interopPayload)
		if err != nil {
			return nil, fmt.Errorf("unable to unmarshal interopPayload: %s", err.Error())
		}
	} else {
		return nil, logThenErrorf("cannot extract data from view; unsupported DLT type: %+v", view.Meta.Protocol)
	}
	return interopPayload.Payload, nil
}

func verifyView(contract GatewayContract, b64ViewProto string, address string) error {
	_, err := contract.EvaluateTransaction("VerifyView", b64ViewProto, address)
	if err != nil {
		return logThenErrorf("VerifyView error: %s", err)
	}
	return nil
}

/**
 * Prepare arguments for WriteExternalState chaincode transaction to verify a view and write data to ledger.
 **/
func getCCArgsForProofVerification(invokeObject types.Query, interopArgIndices []int, viewAddresses []string,
	viewsSerializedBase64 []string, viewContentsBase64 []string) ([]string, error) {

	invokeObjectCcArgsBytes, err := json.Marshal(invokeObject.CcArgs)
	if err != nil {
		return nil, logThenErrorf("failed to Marshal invokeObject.CcArgs: %s", invokeObject.CcArgs)
	}

	interopArgIndicesBytes, err := json.Marshal(interopArgIndices)
	if err != nil {
		return nil, logThenErrorf("failed to Marshal interopArgIndices: %v", interopArgIndices)
	}

	viewAddressesBytes, err := json.Marshal(viewAddresses)
	if err != nil {
		return nil, logThenErrorf("failed to Marshal viewAddresses: %s", viewAddresses)
	}

	viewsSerializedBase64Bytes, err := json.Marshal(viewsSerializedBase64)
	if err != nil {
		return nil, logThenErrorf("failed to Marshal viewsSerializedBase64: %s", viewsSerializedBase64)
	}

	viewContentsBase64Bytes, err := json.Marshal(viewContentsBase64)
	if err != nil {
		return nil, logThenErrorf("failed to Marshal viewContentsBase64: %s", viewContentsBase64)
	}

	ccArgs := []string{
		invokeObject.ContractName,
		invokeObject.Channel,
		invokeObject.CcFunc,
		string(invokeObjectCcArgsBytes),
		string(interopArgIndicesBytes),
		string(viewAddressesBytes),
		string(viewsSerializedBase64Bytes),
		string(viewContentsBase64Bytes)}

	return ccArgs, nil
}

/**
 * Creates an address string based on a query object, networkid and remote url.
 **/
func createAddress(query types.Query, networkId, remoteURL string) string {
	addressString := remoteURL + "/" + networkId + "/" + query.Channel + ":" + query.ContractName + ":" + query.CcFunc + ":" + query.CcArgs[0]
	return addressString
}

/**
 * Creates an address string based on a flow object, networkid and remote url.
 **/
func createFlowAddress(flow types.Flow, networkId string, remoteURL string) string {
	addressString := remoteURL + "/" + networkId + "/" + flow.CordappAddress + "#" + flow.CordappId + "." + flow.FlowId + ":"
	// + flow.FlowArgs + ":"
	return addressString
}

func signMessage(computedAddress string, uuidStr string, signer Signer) (string, error) {
	message := computedAddress + uuidStr
	signature, err := signer.Sign([]byte(message))
	if err != nil {
		return "", fmt.Errorf("signing failed: %s", err)
	}
	signatureBase64 := base64.StdEncoding.EncodeToString(signature)
	return signatureBase64, nil
}

/**
 * Send a relay request with a view address and get a view in response
 * 1. Will get address from input, if address not there it will create the address from interopJSON
 * 2. Get policy from chaincode for supplied address.
 * 3. Call the relay Process request which will send a request to the remote network via local relay and poll for an update in the request status.
 * 4. Call the local chaincode to verify the view before trying to submit to chaincode.
 **/
func getRemoteView(interopContract GatewayContract, networkId, org, localRelayEndPoint string, interopJSON types.InteropJSON,
	signer Signer, certUser string) (*common.View, string, error) {

	// Step 1
	query := types.Query{
		ContractName: interopJSON.ChaincodeId,
		Channel:      interopJSON.ChannelId,
		CcFunc:       interopJSON.ChaincodeFunc,
		CcArgs:       interopJSON.CcArgs,
	}
	var computedAddress string
	if interopJSON.Address == "" {
		computedAddress = createAddress(query, interopJSON.NetworkId, interopJSON.RemoteEndPoint)
	} else {
		computedAddress = interopJSON.Address
	}

	// Step 2
	policyCriteria, err := getPolicyCriteriaForAddress(interopContract, computedAddress)
	if err != nil {
		return nil, "", logThenErrorf("InteropFlow failed to get policy criteria for address %s with error: %s", computedAddress, err.Error())
	}

	//relay = new Relay(localRelayEndpoint);
	uuidValue := uuid.New()
	uuidStr := base64.StdEncoding.EncodeToString([]byte(uuidValue.String()))

	// Step 3
	// TODO fix types here so can return proper view

	log.Infof("localRelayEndPoint: %s, computedAddress: %s, policyCriteria: %s, networkId: %s, certUser: %s, uuidStr: %s, org: %s",
		localRelayEndPoint, computedAddress, policyCriteria, networkId, certUser, uuidStr, org)

	signatureBase64, err := signMessage(computedAddress, uuidStr, signer)
	if err != nil {
		return nil, "", logThenErrorf("failed signMessage with error: %s", err.Error())
	}

	relayObj := relay.NewRelay(localRelayEndPoint, 600)
	relayResponse, err := relayObj.ProcessRequest(computedAddress, policyCriteria, networkId, certUser, signatureBase64, uuidStr, org)
	if err != nil {
		return nil, "", logThenErrorf("InteropFlow relay response error: %s", err.Error())
	}

	// Step 4
	// Verify view to ensure it is valid before starting expensive WriteExternalState flow.

	viewBytes, err := protoV2.Marshal(relayResponse.GetView())
	if err != nil {
		return nil, "", logThenErrorf("failed to marshal view with error: %s", err.Error())
	}
	err = verifyView(interopContract, base64.StdEncoding.EncodeToString(viewBytes), computedAddress)
	if err != nil {
		return nil, "", logThenErrorf("view verification failed with error: %s", err.Error())
	}
	return relayResponse.GetView(), computedAddress, nil
}
