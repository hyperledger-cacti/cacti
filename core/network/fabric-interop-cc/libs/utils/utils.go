/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)



///////////////////////////////////////////////////////
//////        ACCESS CONTROL FUNCTIONS         ////////
///////////////////////////////////////////////////////

func GetInteropChaincodeIDKey() string {
	return "interopChaincodeID"
}

func GetLocalChaincodeIDKey() string {
	return "localChaincodeID"
}

// GetLocalChaincodeID extracts chaincode id from stub
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
	return invocationSpec.ChaincodeSpec.ChaincodeId.Name, nil
}

// Check if the calling client has a relay attribute in its signing certificate
func IsClientRelay(stub shim.ChaincodeStubInterface) (bool, error) {
	// check if caller certificate has the attribute "relay"
	// we don't care about the actual value of the attribute for now
	_, ok, err := cid.GetAttributeValue(stub, "relay")
	return ok, err
}

// Check if the calling client has an attribute in its signing certificate indicating that it is a privileged network administrator
func IsClientNetworkAdmin(ctx contractapi.TransactionContextInterface) (bool, error) {
	// check if caller certificate has the attribute "network-admin"
	// we don't care about the actual value of the attribute for now
	_, ok, err := ctx.GetClientIdentity().GetAttributeValue("network-admin")
	return ok, err
}

// Check if the calling client has an IIN Agent attribute in its signing certificate
func IsClientIINAgent(ctx contractapi.TransactionContextInterface) (bool, error) {
	// check if caller certificate has the attribute "iin-agent"
	// we don't care about the actual value of the attribute for now
	_, ok, err := ctx.GetClientIdentity().GetAttributeValue("iin-agent")
	return ok, err
}

// Check if the caller is the Interop Chaincode
func IsCallerInteropChaincode(stub shim.ChaincodeStubInterface) (bool, error) {
	interopChaincodeID, err := stub.GetState(GetInteropChaincodeIDKey())
	if err != nil {
		return false, err
	}
	callerChaincodeID, err := GetLocalChaincodeID(stub)
	if err != nil {
		return false, err
	}
	if callerChaincodeID != string(interopChaincodeID) {
		return false, nil
	}
	return true, nil
}

// Access guard for Weaver relay requests: return 'true' only if access should be permitted
func CheckAccessIfRelayClient(stub shim.ChaincodeStubInterface) (bool, error) {
	isClientRelay, err := IsClientRelay(stub)
	if err != nil {
		return false, err
	}
	if !isClientRelay {
		return true, nil
	}
	return IsCallerInteropChaincode(stub)
}

func GetECertOfTxCreatorBase64(ctx contractapi.TransactionContextInterface) (string, error) {

	txCreatorBytes, err := ctx.GetStub().GetCreator()
	if err != nil {
	return "", fmt.Errorf("unable to get the transaction creator information: %+v", err)
	}

	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	err = proto.Unmarshal(txCreatorBytes, serializedIdentity)
	if err != nil {
		return "", fmt.Errorf("GetECertOfTxCreatorBase64: unmarshal error: %+v", err)
	}

	eCertBytesBase64 := base64.StdEncoding.EncodeToString(serializedIdentity.IdBytes)

	return eCertBytesBase64, nil
}


///////////////////////////////////////////////////////
//////        ASSET TRANSFER FUNCTIONS         ////////
///////////////////////////////////////////////////////

func GetLocalNetworkIDKey() string {
	return "localNetworkID"
}

func getAssetPledgeKey(pledgeId string) string {
	return "Pledged_" + pledgeId
}

func getAssetClaimKey(pledgeId string) string {
	return "Claimed_" + pledgeId
}

// function to generate a "SHA256" hash in hex format for a given preimage
func generateSHA256HashInHexForm(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashHex := hex.EncodeToString(shaHash)
	return shaHashHex
}

func generatePledgeId(ctx contractapi.TransactionContextInterface, assetType, assetIdOrQuantity, owner, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) string {
	// tmp := assetId
	// if tmp == "" {
	// 	tmp = strconv.Itoa(int(numUnits))
	// }
	preimage := assetType + assetIdOrQuantity + owner + remoteNetworkId + recipientCert + strconv.Itoa(int(expiryTimeSecs)) + ctx.GetStub().GetTxID()
	contractId := generateSHA256HashInHexForm(preimage)
	return contractId
}

func marshalAssetPledge(pledge *common.AssetPledge) (string, error) {
	assetPledgeBytes, err := proto.Marshal(pledge)
	if err != nil {
		return "", err
	}
	assetPledgeBase64 := base64.StdEncoding.EncodeToString(assetPledgeBytes)
	return assetPledgeBase64, nil
}
func unmarshalAssetPledge(assetPledgeBase64 string) (*common.AssetPledge, error) {
	pledge := &common.AssetPledge{}
	assetPledgeSerialized, err := base64.StdEncoding.DecodeString(assetPledgeBase64)
	if err != nil {
		return pledge, err
	}
	if len(assetPledgeSerialized) == 0 {
		return pledge, fmt.Errorf("empty asset pledge")
	}
	err = proto.Unmarshal([]byte(assetPledgeSerialized), pledge)
  if err != nil {
    return pledge, err
  }
	return pledge, nil
}

func marshalAssetClaimStatus(claimStatus *common.AssetClaimStatus) (string, error) {
	claimStatusBytes, err := proto.Marshal(claimStatus)
	if err != nil {
		return "", err
	}
	claimStatusBase64 := base64.StdEncoding.EncodeToString(claimStatusBytes)
	return claimStatusBase64, nil
}
func unmarshalAssetClaimStatus(claimStatusBase64 string) (*common.AssetClaimStatus, error) {
	claimStatus := &common.AssetClaimStatus{}
	claimStatusSerialized, err := base64.StdEncoding.DecodeString(claimStatusBase64)
	if err != nil {
		return claimStatus, err
	}
	if len(claimStatusSerialized) == 0 {
		return claimStatus, fmt.Errorf("empty asset claim status")
	}
	err = proto.Unmarshal([]byte(claimStatusSerialized), claimStatus)
	if err != nil {
		return claimStatus, err
	}
	return claimStatus, nil
}

// PledgeAsset locks an asset for transfer to a different ledger/network.
func PledgeAsset(ctx contractapi.TransactionContextInterface, assetJSON []byte, assetType, assetIdOrQuantity, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) (string, error) {
	if assetIdOrQuantity == "" {
		return "", fmt.Errorf("no asset ID or unit count provided")
	}

	// Get the caller's certificate for assigning pledge ownership
	owner, err := GetECertOfTxCreatorBase64(ctx)
	if err != nil {
		return "", err
	}

	pledgeId := generatePledgeId(ctx, assetType, assetIdOrQuantity, owner, remoteNetworkId, recipientCert, expiryTimeSecs)

	pledgeKey := getAssetPledgeKey(pledgeId)
	pledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return "", fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	pledge := &common.AssetPledge{}
	if pledgeBytes != nil {
		err = proto.Unmarshal(pledgeBytes, pledge)
		if err != nil {
			return "", err
		}
		if (pledge.RemoteNetworkID == remoteNetworkId && pledge.Recipient == recipientCert && pledge.ExpiryTimeSecs == expiryTimeSecs) {
			return pledgeId, nil
		} else {
			return "", fmt.Errorf("the asset %s with id %s has already been pledged", assetType, assetIdOrQuantity)
		}
	}

	// Make sure the pledge has an expiry time in the future
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= expiryTimeSecs {
		return "", fmt.Errorf("expiry time cannot be less than current time")
	}

	localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
	if err != nil {
		return "", err
	}
	pledge = &common.AssetPledge{
		AssetDetails: assetJSON,
		LocalNetworkID: string(localNetworkId),
		RemoteNetworkID: remoteNetworkId,
		Recipient: recipientCert,
		ExpiryTimeSecs: expiryTimeSecs,
	}
	pledgeBytes, err = proto.Marshal(pledge)
	if err != nil {
		return "", err
	}

	err = ctx.GetStub().PutState(pledgeKey, pledgeBytes)
	if err != nil {
		return "", err
	}
	return pledgeId, nil
}

// ClaimRemoteAsset gets ownership of an asset transferred from a different ledger/network.
func ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, pledgeId, remoteNetworkId, pledgeBytes64 string) ([]byte, error) {
	if pledgeId == "" {
		return nil, fmt.Errorf("pledgeId can not be empty")
	}

	pledge, err := unmarshalAssetPledge(pledgeBytes64)
	if err != nil {
		return nil, err
	}

	// Caller of this function is assumed to be the asset claimant
	claimer, err := GetECertOfTxCreatorBase64(ctx)
	if err != nil {
		return nil, err
	}

	// Make sure the pledge has not expired (we assume the expiry timestamp set by the remote network)
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= pledge.ExpiryTimeSecs {
		return nil, fmt.Errorf("cannot claim asset with pledgeId %s as the expiry time has elapsed", pledgeId)
	}
	// Match the pledge recipient with the client
	if pledge.Recipient != claimer {
		return nil, fmt.Errorf("cannot claim asset with pledgeId %s as it has not been pledged to the claimer", pledgeId)
	}
	if pledge.LocalNetworkID != remoteNetworkId {
		return nil, fmt.Errorf("cannot claim asset with pledgeId %s as it has not been pledged by the given network", pledgeId)
	}
	localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
	if err != nil {
		return nil, err
	}
	if pledge.RemoteNetworkID != string(localNetworkId) {
		return nil, fmt.Errorf("cannot claim asset with pledgeId %s as it has not been pledged to a claimer in this network", pledgeId)
	}

	// Record claim on the ledger for later verification by a foreign network
	claimStatus := &common.AssetClaimStatus{
		AssetDetails: pledge.AssetDetails,
		LocalNetworkID: string(localNetworkId),
		RemoteNetworkID: remoteNetworkId,
		Recipient: claimer,
		ClaimStatus: true,
		ExpiryTimeSecs: pledge.ExpiryTimeSecs,
		ExpirationStatus: false,
	}
	claimBytes, err := proto.Marshal(claimStatus)
	if err != nil {
		return nil, err
	}

	claimKey := getAssetClaimKey(pledgeId)
	lookupClaimBytes, err := ctx.GetStub().GetState(claimKey)
	if err != nil {								// No Record of claim
		return pledge.AssetDetails, ctx.GetStub().PutState(claimKey, claimBytes)
	}

	lookupClaimStatus := &common.AssetClaimStatus{}
	err = proto.Unmarshal(lookupClaimBytes, lookupClaimStatus)
	if lookupClaimStatus.ClaimStatus {			// Previous claim was successful
		return nil, fmt.Errorf("asset has already been claimed")
	}

	// Else proceed to claim
	return pledge.AssetDetails, ctx.GetStub().PutState(claimKey, claimBytes)
}

// ReclaimAsset gets back the ownership of an asset pledged for transfer to a different ledger/network.
func ReclaimAsset(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, remoteNetworkId, claimStatusBytes64 string) ([]byte, []byte, error) {
	pledgeKey := getAssetPledgeKey(pledgeId)
	pledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if pledgeBytes == nil {
		return nil, nil, fmt.Errorf("the asset with pledgeId %s has not been pledged", pledgeId)
	}

	// At this point, a pledge has been recorded, which means the asset isn't on the ledger; so we don't need to check the asset's presence

	// Make sure the pledge has expired
	pledge := &common.AssetPledge{}
	err = proto.Unmarshal(pledgeBytes, pledge)
	if err != nil {
		return nil, nil, err
	}
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < pledge.ExpiryTimeSecs {
		return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as the expiry time is not yet elapsed", pledgeId)
	}

	// Make sure the asset has not been claimed within the given time
	claimStatus, err := unmarshalAssetClaimStatus(claimStatusBytes64)
	if err != nil {
		return nil, nil, err
	}
	// We first match the expiration timestamps to ensure that the view address for the claim status was accurate
	if claimStatus.ExpiryTimeSecs != pledge.ExpiryTimeSecs {
		return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as the expiration timestamps in the pledge and the claim don't match", pledgeId)
	}
	if !claimStatus.ExpirationStatus {
		return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as the pledge has not yet expired", pledgeId)
	}
	if claimStatus.ClaimStatus {
		pledgeKey := getAssetPledgeKey(pledgeId)
		err := ctx.GetStub().DelState(pledgeKey)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to delete asset pledge from world state: %v", err)
		}
		return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as it has already been claimed", pledgeId)
	}
	if (claimStatus.LocalNetworkID != "" &&
		claimStatus.RemoteNetworkID != "" &&
		claimStatus.Recipient != "") {
		// Run checks on the claim parameter to see if it is what we expect and to ensure it has not already been made in the other network
		if claimStatus.LocalNetworkID != remoteNetworkId {
			return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as it has not been pledged to the given network", pledgeId)
		}
		if claimStatus.Recipient != recipientCert {
			return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as it has not been pledged to the given recipient", pledgeId)
		}
		localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
		if err != nil {
			return nil, nil, err
		}
		if claimStatus.RemoteNetworkID != string(localNetworkId) {
			return nil, nil, fmt.Errorf("cannot reclaim asset with pledgeId %s as it has not been pledged by a claimer in this network", pledgeId)
		}
	}

	// Now we can safely delete the pledge as it has served its purpose:
	// (1) Pledge time has expired
	// (2) A claim was not submitted in time in the remote network, so the asset can be reclaimed
	err = ctx.GetStub().DelState(pledgeKey)
	if err != nil {
		return nil, nil, err
	}

	return claimStatus.AssetDetails, pledge.AssetDetails, nil
}

// GetAssetPledgeStatus returns the asset pledge status.
func GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientNetworkId, recipientCert string, blankAssetJSON []byte) ([]byte, string, string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	pledge := &common.AssetPledge{
		AssetDetails: blankAssetJSON,
		LocalNetworkID: "",
		RemoteNetworkID: "",
		Recipient: "",
		ExpiryTimeSecs: 0,
	}
	pledgeBytes64, err := marshalAssetPledge(pledge)
	if err != nil {
		return nil, "", "", err
	}

	pledgeKey := getAssetPledgeKey(pledgeId)
	lookupPledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, pledgeBytes64, pledgeBytes64, fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if lookupPledgeBytes == nil {
		return nil, pledgeBytes64, pledgeBytes64, nil      // Return blank
	}
	lookupPledge := &common.AssetPledge{}
	err = proto.Unmarshal(lookupPledgeBytes, lookupPledge)
	if err != nil {
		return nil, pledgeBytes64, pledgeBytes64, err
	}

	// Match pledge with request parameters
	if lookupPledge.Recipient != recipientCert || lookupPledge.RemoteNetworkID != recipientNetworkId {
		return nil, pledgeBytes64, pledgeBytes64, nil      // Return blank
	}

	lookupPledgeBytes64, err := marshalAssetPledge(lookupPledge)
	if err != nil {
		return nil, pledgeBytes64, pledgeBytes64, err
	}

	return lookupPledge.AssetDetails, lookupPledgeBytes64, pledgeBytes64, nil
}

// GetAssetPledgeDetails returns the asset pledge details for local network.
func GetAssetPledgeDetails(ctx contractapi.TransactionContextInterface, pledgeId string) ([]byte, string, error) {
	// (Optional) Ensure that this function is NOT being called by the relay or the Fabric Interop CC

	pledgeKey := getAssetPledgeKey(pledgeId)
	lookupPledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if lookupPledgeBytes == nil {
		return nil, "", fmt.Errorf("pledge with given pledgeId %s doesn't exist", pledgeId)
	}
	lookupPledge := &common.AssetPledge{}
	err = proto.Unmarshal(lookupPledgeBytes, lookupPledge)
	if err != nil {
		return nil, "", err
	}

	lookupPledgeBytes64, err := marshalAssetPledge(lookupPledge)
	if err != nil {
		return nil, "", err
	}

	return lookupPledge.AssetDetails, lookupPledgeBytes64, nil
}

// GetAssetClaimStatus returns the asset claim status and present time (of invocation).
func GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64, blankAssetJSON []byte) ([]byte, string, string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	claimStatus := &common.AssetClaimStatus{
		AssetDetails: blankAssetJSON,
		LocalNetworkID: "",
		RemoteNetworkID: "",
		Recipient: "",
		ClaimStatus: false,
		ExpiryTimeSecs: pledgeExpiryTimeSecs,
		ExpirationStatus: (uint64(time.Now().Unix()) >= pledgeExpiryTimeSecs),
	}
	claimStatusBytes64, err := marshalAssetClaimStatus(claimStatus)
	if err != nil {
		return nil, "", "", err
	}

	// Lookup claim record
	claimKey := getAssetClaimKey(pledgeId)
	lookupClaimBytes, err := ctx.GetStub().GetState(claimKey)
	if err != nil {
		return nil, claimStatusBytes64, claimStatusBytes64, fmt.Errorf("failed to read asset claim status from world state: %v", err)
	}
	if lookupClaimBytes == nil {
		return nil, claimStatusBytes64, claimStatusBytes64, nil      // Return blank
	}
	lookupClaim := &common.AssetClaimStatus{}
	err = proto.Unmarshal(lookupClaimBytes, lookupClaim)
	if err != nil {
		return nil, claimStatusBytes64, claimStatusBytes64, err
	}

	// Match claim with request parameters
	if lookupClaim.RemoteNetworkID != pledgerNetworkId || lookupClaim.Recipient != recipientCert {
		return nil, claimStatusBytes64, claimStatusBytes64, nil      // Return blank
	}
	lookupClaim.ExpiryTimeSecs = claimStatus.ExpiryTimeSecs
	lookupClaim.ExpirationStatus = claimStatus.ExpirationStatus
	lookupClaimBytes64, err := marshalAssetClaimStatus(lookupClaim)
	if err != nil {
		return nil, claimStatusBytes64, claimStatusBytes64, err
	}

	return lookupClaim.AssetDetails, lookupClaimBytes64, claimStatusBytes64, nil
}
