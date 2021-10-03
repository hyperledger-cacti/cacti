/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang/protobuf/proto"
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

type AssetPledge struct {
	AssetDetails        []byte      `json:"assetdetails"`
	LocalNetworkID      string      `json:"localnetworkid"`
	RemoteNetworkID     string      `json:"remotenetworkid"`
	RecipientCert       string      `json:"recipientcert"`
	ExpiryTimeSecs      uint64      `json:"expirytimesecs"`
}

type AssetClaimStatus struct {
	AssetDetails        []byte      `json:"assetdetails"`
	LocalNetworkID      string      `json:"localnetworkid"`
	RemoteNetworkID     string      `json:"remotenetworkid"`
	RecipientCert       string      `json:"recipientcert"`
	ClaimStatus         bool        `json:"claimstatus"`
	ExpiryTimeSecs      uint64      `json:"expirytimesecs"`
	ExpirationStatus    bool        `json:"expirationstatus"`
}

func GetLocalNetworkIDKey() string {
	return "localNetworkID"
}

func getAssetPledgeKey(assetType string, assetId string) string {
	return "Pledged_" + assetType + assetId
}

func getAssetClaimKey(assetType string, assetId string) string {
	return "Claimed_" + assetType + assetId
}

// PledgeAsset locks an asset for transfer to a different ledger/network.
func PledgeAsset(ctx contractapi.TransactionContextInterface, assetJSON []byte, assetType, id, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) error {
	pledgeKey := getAssetPledgeKey(assetType, id)
	pledgeJSON, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	var pledge AssetPledge
	if pledgeJSON != nil {
		err = json.Unmarshal(pledgeJSON, &pledge)
		if err != nil {
			return err
		}
		if (pledge.RemoteNetworkID == remoteNetworkId && pledge.RecipientCert == recipientCert && pledge.ExpiryTimeSecs == expiryTimeSecs) {
			return nil
		} else {
			return fmt.Errorf("the asset %s has already been pledged", id)
		}
	}

	// Make sure the pledge has an expiry time in the future
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= expiryTimeSecs {
		return fmt.Errorf("expiry time cannot be less than current time")
	}

	localNetworkId, err := ctx.GetStub().GetState(GetLocalNetworkIDKey())
	if err != nil {
		return err
	}
	pledge = AssetPledge{
		AssetDetails: assetJSON,
		LocalNetworkID: string(localNetworkId),
		RemoteNetworkID: remoteNetworkId,
		RecipientCert: recipientCert,
		ExpiryTimeSecs: expiryTimeSecs,
	}
	pledgeJSON, err = json.Marshal(pledge)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(pledgeKey, pledgeJSON)
}

// ClaimRemoteAsset gets ownership of an asset transferred from a different ledger/network.
func ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, assetType, id, owner, remoteNetworkId, pledgeJSON, claimer string) ([]byte, error) {
	var pledge AssetPledge
    err := json.Unmarshal([]byte(pledgeJSON), &pledge)
	if err != nil {
		return nil, err
	}

	// Make sure the pledge has not expired (we assume the expiry timestamp set by the remote network)
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= pledge.ExpiryTimeSecs {
		return nil, fmt.Errorf("cannot claim asset %s as the expiry time has elapsed", id)
	}
	// Match the pledge recipient with the client
	if pledge.RecipientCert != claimer {
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
	claimStatus := AssetClaimStatus{
		AssetDetails: pledge.AssetDetails,
		LocalNetworkID: string(localNetworkId),
		RemoteNetworkID: remoteNetworkId,
		RecipientCert: claimer,
		ClaimStatus: true,
		ExpiryTimeSecs: pledge.ExpiryTimeSecs,
		ExpirationStatus: false,
	}
	claimJSON, err := json.Marshal(claimStatus)
	if err != nil {
		return nil, err
	}

	claimKey := getAssetClaimKey(assetType, id)
	return pledge.AssetDetails, ctx.GetStub().PutState(claimKey, claimJSON)
}

// ReclaimAsset gets back the ownership of an asset pledged for transfer to a different ledger/network.
func ReclaimAsset(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, remoteNetworkId, claimStatusJSON string) ([]byte, []byte, error) {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	pledgeKey := getAssetPledgeKey(assetType, id)
	pledgeJSON, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if pledgeJSON == nil {
		return nil, nil, fmt.Errorf("the asset %s has not been pledged", id)
	}

	// At this point, a pledge has been recorded, which means the asset isn't on the ledger; so we don't need to check the asset's presence

	// Make sure the pledge has expired
	var pledge AssetPledge
	err = json.Unmarshal(pledgeJSON, &pledge)
	if err != nil {
		return nil, nil, err
	}
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < pledge.ExpiryTimeSecs {
		return nil, nil, fmt.Errorf("cannot reclaim asset %s as the expiry time is not yet elapsed", id)
	}

	// Make sure the asset has not been claimed within the given time
	var claimStatus AssetClaimStatus
	err = json.Unmarshal([]byte(claimStatusJSON), &claimStatus)
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
		claimStatus.RecipientCert != "") {
		// Run checks on the claim parameter to see if it is what we expect and to ensure it has not already been made in the other network
		if claimStatus.LocalNetworkID != remoteNetworkId {
			return nil, nil, fmt.Errorf("cannot reclaim asset %s as it has not been pledged to the given network", id)
		}
		if claimStatus.RecipientCert != recipientCert {
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
func GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, assetType, id, recipientNetworkId, recipientCert string, blankAssetJSON []byte) ([]byte, string, string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	pledge := &AssetPledge{
		AssetDetails: blankAssetJSON,
		LocalNetworkID: "",
		RemoteNetworkID: "",
		RecipientCert: "",
		ExpiryTimeSecs: 0,
	}
	pledgeJSON, err := json.Marshal(pledge)
	if err != nil {
		return nil, "", "", err
	}

	pledgeKey := getAssetPledgeKey(assetType, id)
	lookupPledgeJSON, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return nil, string(pledgeJSON), string(pledgeJSON), fmt.Errorf("failed to read asset pledge status from world state: %v", err)
	}
	if lookupPledgeJSON == nil {
		return nil, string(pledgeJSON), string(pledgeJSON), nil      // Return blank
	}
	var lookupPledge AssetPledge
	err = json.Unmarshal(lookupPledgeJSON, &lookupPledge)
	if err != nil {
		return nil, string(pledgeJSON), string(pledgeJSON), err
	}

	// Match pledge with request parameters
	if lookupPledge.RecipientCert != recipientCert || lookupPledge.RemoteNetworkID != recipientNetworkId {
		return nil, string(pledgeJSON), string(pledgeJSON), nil      // Return blank
	}

	return lookupPledge.AssetDetails, string(lookupPledgeJSON), string(pledgeJSON), nil
}

// GetAssetClaimStatus returns the asset claim status and present time (of invocation).
func GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64, blankAssetJSON []byte) ([]byte, string, string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	claimStatus := &AssetClaimStatus{
		AssetDetails: blankAssetJSON,
		LocalNetworkID: "",
		RemoteNetworkID: "",
		RecipientCert: "",
		ClaimStatus: false,
		ExpiryTimeSecs: pledgeExpiryTimeSecs,
		ExpirationStatus: (uint64(time.Now().Unix()) >= pledgeExpiryTimeSecs),
	}
	claimStatusJSON, err := json.Marshal(claimStatus)
	if err != nil {
		return nil, "", "", err
	}

	// Lookup claim record
	claimKey := getAssetClaimKey(assetType, id)
	lookupClaimJSON, err := ctx.GetStub().GetState(claimKey)
	if err != nil {
		return nil, string(claimStatusJSON), string(claimStatusJSON), fmt.Errorf("failed to read asset claim status from world state: %v", err)
	}
	if lookupClaimJSON == nil {
		return nil, string(claimStatusJSON), string(claimStatusJSON), nil      // Return blank
	}
	var lookupClaim AssetClaimStatus
	err = json.Unmarshal(lookupClaimJSON, &lookupClaim)
	if err != nil {
		return nil, string(claimStatusJSON), string(claimStatusJSON), err
	}

	// Match claim with request parameters
	if lookupClaim.RemoteNetworkID != pledgerNetworkId || lookupClaim.RecipientCert != recipientCert {
		return nil, string(claimStatusJSON), string(claimStatusJSON), nil      // Return blank
	}
	lookupClaim.ExpiryTimeSecs = claimStatus.ExpiryTimeSecs
	lookupClaim.ExpirationStatus = claimStatus.ExpirationStatus
	lookupClaimJSON, err = json.Marshal(lookupClaim)
	if err != nil {
		return nil, string(claimStatusJSON), string(claimStatusJSON), err
	}

	return lookupClaim.AssetDetails, string(lookupClaimJSON), string(claimStatusJSON), nil
}
