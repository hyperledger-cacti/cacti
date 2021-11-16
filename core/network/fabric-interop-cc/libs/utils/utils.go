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
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
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


///////////////////////////////////////////////////////
//////        ASSET TRANSFER FUNCTIONS         ////////
///////////////////////////////////////////////////////

func GetLocalNetworkIDKey() string {
	return "localNetworkID"
}

func getAssetPledgeKey(assetType string, assetId string) string {
	return "Pledged_" + assetType + assetId
}

func getAssetClaimKey(assetType string, assetId string) string {
	return "Claimed_" + assetType + assetId
}

// function to generate a "SHA256" hash in hex format for a given preimage
func generateSHA256HashInHexForm(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashHex := hex.EncodeToString(shaHash)
	return shaHashHex
}

func generateAssetPledgeContractId(ctx contractapi.TransactionContextInterface, assetType string, numUnits uint64, owner, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) string {
	preimage := assetType + strconv.Itoa(int(numUnits)) + owner + remoteNetworkId + recipientCert + strconv.Itoa(int(expiryTimeSecs)) + ctx.GetStub().GetTxID()
	contractId := generateSHA256HashInHexForm(preimage)
	return contractId
}

// PledgeAsset locks an asset for transfer to a different ledger/network.
func PledgeAsset(ctx contractapi.TransactionContextInterface, assetJSON []byte, assetType, id string, numUnits uint64, owner, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) (string, error) {
	if id == "" && numUnits == 0 {
		return "", fmt.Errorf("no asset ID or unit count provided")
	}
	if id != "" && numUnits > 0 {
        return "", fmt.Errorf("ambiguous pledge instruction: both asset ID and unit count provided")
	}
	assetId := id           // Non-fungible asset
	if assetId == "" {      // Fungible asset
		assetId = generateAssetPledgeContractId(ctx, assetType, numUnits, owner, remoteNetworkId, recipientCert, expiryTimeSecs)
	}
	
	pledgeKey := getAssetPledgeKey(assetType, assetId)
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
			return assetId, nil
		} else {
			return "", fmt.Errorf("the asset %s has already been pledged", id)
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
	return assetId, nil
}

// ClaimRemoteAsset gets ownership of an asset transferred from a different ledger/network.
func ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, assetType, id, owner, remoteNetworkId string, pledgeBytes []byte, claimer string) ([]byte, error) {
	pledge := &common.AssetPledge{}
	err := proto.Unmarshal(pledgeBytes, pledge)
	if err != nil {
		return nil, err
	}

	// Make sure the pledge has not expired (we assume the expiry timestamp set by the remote network)
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= pledge.ExpiryTimeSecs {
		return nil, fmt.Errorf("cannot claim asset %s as the expiry time has elapsed", id)
	}
	// Match the pledge recipient with the client
	if pledge.Recipient != claimer {
		return nil, fmt.Errorf("cannot claim asset %s as it has not been pledged to the claimer", id)
	}
	if pledge.LocalNetworkID != remoteNetworkId {
		return nil, fmt.Errorf("cannot claim asset %s as it has not been pledged by the given network", id)
	}
	localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
	if err != nil {
		return nil, err
	}
	if pledge.RemoteNetworkID != string(localNetworkId) {
		return nil, fmt.Errorf("cannot claim asset %s as it has not been pledged to a claimer in this network", id)
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

	claimKey := getAssetClaimKey(assetType, id)
	return pledge.AssetDetails, ctx.GetStub().PutState(claimKey, claimBytes)
}

// ReclaimAsset gets back the ownership of an asset pledged for transfer to a different ledger/network.
func ReclaimAsset(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, remoteNetworkId string, claimStatusBytes []byte) ([]byte, []byte, error) {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	pledgeKey := getAssetPledgeKey(assetType, id)
	pledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if pledgeBytes == nil {
		return nil, nil, fmt.Errorf("the asset %s has not been pledged", id)
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
		return nil, nil, fmt.Errorf("cannot reclaim asset %s as the expiry time is not yet elapsed", id)
	}

	// Make sure the asset has not been claimed within the given time
	claimStatus := &common.AssetClaimStatus{}
	err = proto.Unmarshal(claimStatusBytes, claimStatus)
	if err != nil {
		return nil, nil, err
	}
	// We first match the expiration timestamps to ensure that the view address for the claim status was accurate
	if claimStatus.ExpiryTimeSecs != pledge.ExpiryTimeSecs {
		return nil, nil, fmt.Errorf("cannot reclaim asset %s as the expiration timestamps in the pledge and the claim don't match", id)
	}
	if !claimStatus.ExpirationStatus {
		return nil, nil, fmt.Errorf("cannot reclaim asset %s as the pledge has not yet expired", id)
	}
	if claimStatus.ClaimStatus {
		return nil, nil, fmt.Errorf("cannot reclaim asset %s as it has already been claimed", id)
	}
	if (claimStatus.LocalNetworkID != "" &&
		claimStatus.RemoteNetworkID != "" &&
		claimStatus.Recipient != "") {
		// Run checks on the claim parameter to see if it is what we expect and to ensure it has not already been made in the other network
		if claimStatus.LocalNetworkID != remoteNetworkId {
			return nil, nil, fmt.Errorf("cannot reclaim asset %s as it has not been pledged to the given network", id)
		}
		if claimStatus.Recipient != recipientCert {
			return nil, nil, fmt.Errorf("cannot reclaim asset %s as it has not been pledged to the given recipient", id)
		}
		localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
		if err != nil {
			return nil, nil, err
		}
		if claimStatus.RemoteNetworkID != string(localNetworkId) {
			return nil, nil, fmt.Errorf("cannot reclaim asset %s as it has not been pledged by a claimer in this network", id)
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
func GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, assetType, id, recipientNetworkId, recipientCert string, blankAssetJSON []byte) ([]byte, []byte, []byte, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	pledge := &common.AssetPledge{
		AssetDetails: blankAssetJSON,
		LocalNetworkID: "",
		RemoteNetworkID: "",
		Recipient: "",
		ExpiryTimeSecs: 0,
	}
	pledgeBytes, err := proto.Marshal(pledge)
	if err != nil {
		return nil, []byte(""), []byte(""), err
	}

	pledgeKey := getAssetPledgeKey(assetType, id)
	lookupPledgeBytes, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, pledgeBytes, pledgeBytes, fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if lookupPledgeBytes == nil {
		return nil, pledgeBytes, pledgeBytes, nil      // Return blank
	}
	lookupPledge := &common.AssetPledge{}
	err = proto.Unmarshal(lookupPledgeBytes, lookupPledge)
	if err != nil {
		return nil, pledgeBytes, pledgeBytes, err
	}

	// Match pledge with request parameters
	if lookupPledge.Recipient != recipientCert || lookupPledge.RemoteNetworkID != recipientNetworkId {
		return nil, pledgeBytes, pledgeBytes, nil      // Return blank
	}

	return lookupPledge.AssetDetails, lookupPledgeBytes, pledgeBytes, nil
}

// GetAssetClaimStatus returns the asset claim status and present time (of invocation).
func GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64, blankAssetJSON []byte) ([]byte, []byte, []byte, error) {
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
	claimStatusBytes, err := proto.Marshal(claimStatus)
	if err != nil {
		return nil, []byte(""), []byte(""), err
	}

	// Lookup claim record
	claimKey := getAssetClaimKey(assetType, id)
	lookupClaimBytes, err := ctx.GetStub().GetState(claimKey)
	if err != nil {
		return nil, claimStatusBytes, claimStatusBytes, fmt.Errorf("failed to read asset claim status from world state: %v", err)
	}
	if lookupClaimBytes == nil {
		return nil, claimStatusBytes, claimStatusBytes, nil      // Return blank
	}
	lookupClaim := &common.AssetClaimStatus{}
	err = proto.Unmarshal(lookupClaimBytes, lookupClaim)
	if err != nil {
		return nil, claimStatusBytes, claimStatusBytes, err
	}

	// Match claim with request parameters
	if lookupClaim.RemoteNetworkID != pledgerNetworkId || lookupClaim.Recipient != recipientCert {
		return nil, claimStatusBytes, claimStatusBytes, nil      // Return blank
	}
	lookupClaim.ExpiryTimeSecs = claimStatus.ExpiryTimeSecs
	lookupClaim.ExpirationStatus = claimStatus.ExpirationStatus
	lookupClaimBytes, err = proto.Marshal(lookupClaim)
	if err != nil {
		return nil, claimStatusBytes, claimStatusBytes, err
	}

	return lookupClaim.AssetDetails, lookupClaimBytes, claimStatusBytes, nil
}
