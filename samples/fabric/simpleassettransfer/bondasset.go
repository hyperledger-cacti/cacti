package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

const (
	localNetworkIdKey = "localNetworkID"
)

type BondAsset struct {
	Type         string    `json:"type"`
	ID           string    `json:"id"`
	Owner        string    `json:"owner"`
	Issuer       string    `json:"issuer"`
	FaceValue    int       `json:"facevalue"`
	MaturityDate time.Time `json:"maturitydate"`
}

func getBondAssetKey(assetType string, assetId string) string {
	return assetType + assetId
}

func matchClaimWithAssetPledge(pledgeAssetDetails, claimAssetDetails []byte) bool {
	var pledgeAsset, claimAsset BondAsset
	err := json.Unmarshal(pledgeAssetDetails, &pledgeAsset)
	if err != nil {
		fmt.Println(err)
		return false
	}
	err = json.Unmarshal(claimAssetDetails, &claimAsset)
	if err != nil {
		fmt.Println(err)
		return false
	}
	return (pledgeAsset.Type == claimAsset.Type &&
		pledgeAsset.ID == claimAsset.ID &&
		pledgeAsset.Owner == claimAsset.Owner &&
		pledgeAsset.Issuer == claimAsset.Issuer &&
		pledgeAsset.FaceValue == claimAsset.FaceValue &&
		pledgeAsset.MaturityDate.Equal(claimAsset.MaturityDate))
}

func getBondAsset(ctx contractapi.TransactionContextInterface, assetType, id string) (*BondAsset, error) {
	assetJSON, err := ctx.GetStub().GetState(getBondAssetKey(assetType, id))
	if err != nil {
		return nil, fmt.Errorf("failed to read asset record from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset BondAsset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}
	return &asset, nil
}

// InitBondAssetLedger adds a base set of assets to the ledger
func (s *SmartContract) InitBondAssetLedger(ctx contractapi.TransactionContextInterface, localNetworkId string) error {
	err := ctx.GetStub().PutState(localNetworkIdKey, []byte(localNetworkId))
	if err != nil {
		return fmt.Errorf("failed to put to world state. %v", err)
	}

	assets := []BondAsset{
		{Type: "t1", ID: "a01", Issuer: "Treasury", Owner: "", FaceValue: 300,
			MaturityDate: time.Date(2022, time.April, 1, 12, 0, 0, 0, time.UTC)},
		{Type: "t1", ID: "a02", Issuer: "Treasury", Owner: "", FaceValue: 400,
			MaturityDate: time.Date(2022, time.July, 1, 12, 0, 0, 0, time.UTC)},
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(getBondAssetKey(asset.Type, asset.ID), assetJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state. %v", err)
		}
	}

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, assetType, id, owner, issuer string, faceValue int, maturityDate string) error {
	if assetType == "" {
		return fmt.Errorf("Asset type cannot be blank")
	}
	if id == "" {
		return fmt.Errorf("Asset ID cannot be blank")
	}
	if owner == "" && issuer == "" {
		return fmt.Errorf("Asset Owner and Issuer cannot both be blank")
	}
	exists, err := s.AssetExists(ctx, assetType, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	md_time, err := time.Parse(time.RFC822, maturityDate)
	if err != nil {
		return fmt.Errorf("maturity date provided is not in correct format, please use this format: %s", time.RFC822)
	}

	if md_time.Before(time.Now()) {
		return fmt.Errorf("maturity date can not be in past.")
	}

	asset := BondAsset{
		Type:         assetType,
		ID:           id,
		Owner:        owner,
		Issuer:       issuer,
		FaceValue:    faceValue,
		MaturityDate: md_time,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
// This function is called with the parameter inUpdateOwnerContext value as false, except in the update-owner context
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, assetType, id string) (*BondAsset, error) {
	asset, err := getBondAsset(ctx, assetType, id)
	if err != nil {
		return nil, err
	}
	if !checkAccessToAsset(s, ctx, asset) {
		return nil, fmt.Errorf("cannot access Bond Asset %s", id)
	}
	return asset, nil
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, assetType, id string) error {
	// Read the asset (which internally check access)
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return err
	}
	return ctx.GetStub().DelState(getBondAssetKey(asset.Type, asset.ID))
}

// PledgeAsset locks an asset for transfer to a different ledger/network.
func (s *SmartContract) PledgeAsset(ctx contractapi.TransactionContextInterface, assetType, id, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) (string, error) {
	// Check if asset is pledged already
	bondAssetPledgeMap, err := getAssetPledgeIdMap(ctx, assetType, id)
	if (err == nil) && (bondAssetPledgeMap.RemoteNetworkID == remoteNetworkId) && (bondAssetPledgeMap.Recipient == recipientCert) {
		return bondAssetPledgeMap.PledgeID, nil
	} else if err == nil {
		return bondAssetPledgeMap.PledgeID, fmt.Errorf("asset %s is already pledged with pledgeId %s for different recipient", id, bondAssetPledgeMap.PledgeID)
	}

	// Read the asset (which internally checks access)
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return "", err
	}
	// Create JSON of asset to be used by wutils.PledgeAsset
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return "", err
	}

	// Pledge the asset using common (library) logic
	if pledgeId, err := wutils.PledgeAsset(ctx, assetJSON, assetType, id, remoteNetworkId, recipientCert, expiryTimeSecs); err == nil {
		// Delete asset state using app-specific logic
		return pledgeId, s.DeleteAsset(ctx, assetType, id)
		if err != nil {
			return pledgeId, err
		}
		err = createAssetPledgeIdMap(ctx, pledgeId, assetType, id, remoteNetworkId, recipientCert)
		return pledgeId, err
	} else {
		return "", err
	}
}

// ClaimRemoteAsset gets ownership of an asset transferred from a different ledger/network.
func (s *SmartContract) ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, pledgeId, assetType, id, owner, remoteNetworkId, pledgeBytes64 string) error {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	// Claim the asset using common (library) logic
	claimer, err := wutils.GetECertOfTxCreatorBase64(ctx)
	if err != nil {
		return err
	}
	pledgeAssetDetails, err := wutils.ClaimRemoteAsset(ctx, pledgeId, remoteNetworkId, pledgeBytes64)
	if err != nil {
		return err
	}

	// Validate pledged asset details using app-specific-logic
	var asset BondAsset
	err = json.Unmarshal(pledgeAssetDetails, &asset)
	if err != nil {
		return err
	}
	if asset.ID == "" {
		return fmt.Errorf("cannot claim asset %s as it has not been pledged in %s", id, remoteNetworkId)
	}
	if asset.Type != assetType {
		return fmt.Errorf("cannot claim asset %s as its type doesn't match the pledge", id)
	}
	if asset.ID != id {
		return fmt.Errorf("cannot claim asset %s as its ID doesn't match the pledge", id)
	}
	if asset.Owner != owner {
		return fmt.Errorf("cannot claim asset %s as it has not been pledged by the given owner", id)
	}

	// Recreate the asset in this network and chaincode using app-specific logic: make the recipient the owner of the asset
	return s.CreateAsset(ctx, assetType, id, claimer, asset.Owner, asset.FaceValue, asset.MaturityDate.Format(time.RFC822))
}

// ReclaimAsset gets back the ownership of an asset pledged for transfer to a different ledger/network.
func (s *SmartContract) ReclaimAsset(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, remoteNetworkId, claimStatusBytes64 string) error {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	// Reclaim the asset using common (library) logic
	claimAssetDetails, pledgeAssetDetails, err := wutils.ReclaimAsset(ctx, pledgeId, recipientCert, remoteNetworkId, claimStatusBytes64)
	if err != nil {
		return err
	}

	// Validate reclaimed asset details using app-specific-logic
	var claimAsset, pledgeAsset BondAsset
	err = json.Unmarshal(claimAssetDetails, &claimAsset)
	if err != nil {
		return err
	}
	if claimAsset.Type != "" &&
		claimAsset.ID != "" &&
		claimAsset.Owner != "" {
		// Run checks on the claim parameter to see if it is what we expect and to ensure it has not already been made in the other network
		if !matchClaimWithAssetPledge(pledgeAssetDetails, claimAssetDetails) {
			return fmt.Errorf("claim info for asset with pledge id %s does not match pledged asset details on ledger: %s", pledgeId, pledgeAssetDetails)
		}
	}

	// Recreate the asset in this network and chaincode using app-specific logic
	err = json.Unmarshal(pledgeAssetDetails, &pledgeAsset)
	if err != nil {
		return err
	}

	// Recreate the asset in this network and chaincode using app-specific logic
	err = ctx.GetStub().PutState(getBondAssetKey(pledgeAsset.Type, pledgeAsset.ID), pledgeAssetDetails)
	if err != nil {
		return err
	}
	return delAssetPledgeIdMap(ctx, pledgeAsset.Type, pledgeAsset.ID)
}

// GetAssetPledgeStatus returns the asset pledge status.
func (s *SmartContract) GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, pledgeId, owner, recipientNetworkId, recipientCert string) (string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	// Create blank asset details using app-specific-logic
	blankAsset := BondAsset{
		Type:         "",
		ID:           "",
		Owner:        "",
		Issuer:       "",
		FaceValue:    0,
		MaturityDate: time.Unix(0, 0),
	}
	blankAssetJSON, err := json.Marshal(blankAsset)
	if err != nil {
		return "", err
	}

	// Fetch asset pledge details using common (library) logic
	pledgeAssetDetails, pledgeBytes64, blankPledgeBytes64, err := wutils.GetAssetPledgeStatus(ctx, pledgeId, recipientNetworkId, recipientCert, blankAssetJSON)
	if err != nil {
		return blankPledgeBytes64, err
	}
	if pledgeAssetDetails == nil {
		return blankPledgeBytes64, err
	}

	// Validate returned asset details using app-specific-logic
	var lookupPledgeAsset BondAsset
	err = json.Unmarshal(pledgeAssetDetails, &lookupPledgeAsset)
	if err != nil {
		return blankPledgeBytes64, err
	}
	if lookupPledgeAsset.Owner != owner {
		return blankPledgeBytes64, nil // Return blank
	}

	return pledgeBytes64, nil
}

// GetAssetPledgeDetails returns the asset pledge details.
func (s *SmartContract) GetAssetPledgeDetails(ctx contractapi.TransactionContextInterface, pledgeId string) (string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	// Fetch asset pledge details using common (library) logic
	pledgeAssetDetails, pledgeBytes64, err := wutils.GetAssetPledgeDetails(ctx, pledgeId)
	if err != nil {
		return "", err
	}
	if pledgeAssetDetails == nil {
		return "", err
	}

	// Validate returned asset details using app-specific-logic
	var lookupPledgeAsset BondAsset
	err = json.Unmarshal(pledgeAssetDetails, &lookupPledgeAsset)
	if err != nil {
		return "", err
	}
	if !isCallerAssetOwner(ctx, &lookupPledgeAsset) {
		return "", fmt.Errorf("caller is not the owner of the pledged asset: %s %s", lookupPledgeAsset.Type, lookupPledgeAsset.ID)
	}

	return pledgeBytes64, nil
}

// GetAssetClaimStatus returns the asset claim status and present time (of invocation).
func (s *SmartContract) GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, pledgeId, assetType, id, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64) (string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	// Create blank asset details using app-specific-logic
	blankAsset := BondAsset{
		Type:         "",
		ID:           "",
		Owner:        "",
		Issuer:       "",
		FaceValue:    0,
		MaturityDate: time.Unix(0, 0),
	}
	blankAssetJSON, err := json.Marshal(blankAsset)
	if err != nil {
		return "", err
	}

	// Fetch asset claim details using common (library) logic
	claimAssetDetails, claimBytes64, blankClaimBytes64, err := wutils.GetAssetClaimStatus(ctx, pledgeId, recipientCert, pledger, pledgerNetworkId, pledgeExpiryTimeSecs, blankAssetJSON)
	if err != nil {
		return blankClaimBytes64, err
	}
	if claimAssetDetails == nil {
		// represents the scenario that the asset was not claimed by the remote network
		return blankClaimBytes64, nil
	}

	// Validate returned asset details using app-specific-logic
	// It's not possible to check for the existance of the claimed asset on the ledger, since that asset might got spent already.

	// Match pledger identity in claim with request parameters
	var lookupClaimAsset BondAsset
	err = json.Unmarshal(claimAssetDetails, &lookupClaimAsset)
	if err != nil {
		return blankClaimBytes64, err
	}
	if lookupClaimAsset.Owner != pledger {
		return blankClaimBytes64, fmt.Errorf("asset was not pledged by %s", pledger)
	} else if lookupClaimAsset.Type != assetType {
		return blankClaimBytes64, fmt.Errorf("given asset type %s was not pledged", assetType)
	} else if lookupClaimAsset.ID != id {
		return blankClaimBytes64, fmt.Errorf("given asset id %s was not pledged", id)
	}

	// represents the scenario that the asset was claimed by the remote network
	return claimBytes64, nil
}

// isCallerAssetOwner returns true only if the invoker of the transaction is also the asset owner
func isCallerAssetOwner(ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	caller, err := wutils.GetECertOfTxCreatorBase64(ctx)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	return (asset.Owner == caller)
}

// isBondAssetLocked returns true only if the asset is presently locked
func isBondAssetLocked(s *SmartContract, ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	bondAssetAgreement := &common.AssetExchangeAgreement{
		AssetType:      asset.Type,
		Id:        asset.ID,
		Recipient: "*",
		Locker:    asset.Owner,
	}
	bondAssetAgreementProtoSerialized, err := proto.Marshal(bondAssetAgreement)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	bondAssetAgreementProto64 := base64.StdEncoding.EncodeToString(bondAssetAgreementProtoSerialized)
	locked, err := s.IsAssetLocked(ctx, bondAssetAgreementProto64)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	return locked
}

// isBondAssetLockedForMe returns true only if the asset is presently locked for me
func isBondAssetLockedForMe(s *SmartContract, ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	bondAssetAgreement := &common.AssetExchangeAgreement{
		AssetType:      asset.Type,
		Id:        asset.ID,
		Recipient: "",
		Locker:    asset.Owner,
	}
	bondAssetAgreementProtoSerialized, err := proto.Marshal(bondAssetAgreement)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	bondAssetAgreementProto64 := base64.StdEncoding.EncodeToString(bondAssetAgreementProtoSerialized)
	locked, err := s.IsAssetLocked(ctx, bondAssetAgreementProto64)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	return locked
}

// checkAccessToAsset checks several conditions under which an asset can be put on hold (i.e., not available for regular business operation)
func checkAccessToAsset(s *SmartContract, ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	// Ensure that the client is the owner of the asset
	if !isCallerAssetOwner(ctx, asset) {
		fmt.Printf("Illegal access: caller is not owner of asset %s\n", asset.ID)
		return false
	}

	// Ensure that the asset is not locked
	if isBondAssetLocked(s, ctx, asset) {
		fmt.Printf("Cannot update attributes of locked asset %s\n", asset.ID)
		return false
	}

	return true
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, assetType, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(getBondAssetKey(assetType, id))
	if err != nil {
		return false, fmt.Errorf("failed to read asset record from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// IsAssetReleased returns true if asset maturity date elapses
func (s *SmartContract) IsAssetReleased(ctx contractapi.TransactionContextInterface, assetType, id string) (bool, error) {
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return false, err
	}
	currDate := time.Now()
	if currDate.After(asset.MaturityDate) {
		return true, nil
	}

	return false, nil
}

// UpdateOwner sets the owner of an asset to a new owner.
func (s *SmartContract) UpdateOwner(ctx contractapi.TransactionContextInterface, assetType, id string, newOwner string) error {
	// Read asset (which internally checks access if it is free to modified)
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return err
	}

	asset.Owner = newOwner
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// UpdateMaturityDate sets the maturity date of the asset to an updated date as passed in the parameters.
func (s *SmartContract) UpdateMaturityDate(ctx contractapi.TransactionContextInterface, assetType, id string, newMaturityDate time.Time) error {
	// Read asset (which internally checks access if it is free to modified)
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return err
	}

	asset.MaturityDate = newMaturityDate
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// UpdateFaceValue sets the face value of an asset to the new value passed.
func (s *SmartContract) UpdateFaceValue(ctx contractapi.TransactionContextInterface, assetType, id string, newFaceValue int) error {
	// Read asset (which internally checks access if it is free to modified)
	asset, err := s.ReadAsset(ctx, assetType, id)
	if err != nil {
		return err
	}

	asset.FaceValue = newFaceValue
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// GetMyAssets returns the assets owner by the caller
func (s *SmartContract) GetMyAssets(ctx contractapi.TransactionContextInterface) ([]*BondAsset, error) {
	assets, err := s.GetAllAssets(ctx)
	if err != nil {
		return nil, err
	}

	var myassets []*BondAsset

	for _, asset := range assets {
		if checkAccessToAsset(s, ctx, asset) {
			myassets = append(myassets, asset)
		}
	}
	return myassets, nil
}

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*BondAsset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*BondAsset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset BondAsset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			continue
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}
