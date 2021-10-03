package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)


const (
	localNetworkIdKey   = "localNetworkID"
)

type BondAsset struct {
	Type          string      `json:"type"`
	ID            string      `json:"id"`
	Owner         string      `json:"owner"`
	Issuer        string      `json:"issuer"`
	FaceValue     int         `json:"facevalue"`
	MaturityDate  time.Time   `json:"maturitydate"`
}

func getBondAssetKey(assetType string, assetId string) string {
	return assetType + assetId
}

func getBondAssetPledgeKey(assetType string, assetId string) string {
	return "Pledged_" + assetType + assetId
}

func getBondAssetClaimKey(assetType string, assetId string) string {
	return "Claimed_" + assetType + assetId
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

// InitBondAssetLedger adds a base set of assets to the ledger
func (s *SmartContract) InitBondAssetLedger(ctx contractapi.TransactionContextInterface, localNetworkId string) error {
    err := ctx.GetStub().PutState(localNetworkIdKey, []byte(localNetworkId))
	if err != nil {
		return fmt.Errorf("failed to put to world state. %v", err)
	}

	assets := []BondAsset{
		{Type: "t1", ID: "a01", Issuer: "Treasury" , Owner: "", FaceValue: 300,
			 MaturityDate: time.Date(2022, time.April, 1, 12, 0, 0, 0, time.UTC)},
			 {Type: "t1", ID: "a02", Issuer: "Treasury" , Owner: "", FaceValue: 400,
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
		Type: assetType,
		ID: id,
		Owner: owner,
		Issuer: issuer,
		FaceValue: faceValue,
		MaturityDate: md_time,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// PledgeAsset locks an asset for transfer to a different ledger/network.
func (s *SmartContract) PledgeAsset(ctx contractapi.TransactionContextInterface, assetType, id, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) error {
	// Look up the asset details using app-specific-logic
	assetKey := getBondAssetKey(assetType, id)
	assetJSON, err := ctx.GetStub().GetState(assetKey)
	if err != nil {
		return fmt.Errorf("failed to read asset record from world state: %v", err)
	}
	if assetJSON == nil {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	// Ensure that the client is the owner of the asset using app-specific logic
	if !checkAccessToAsset(s, ctx, assetJSON) {
		return fmt.Errorf("Canot pledge asset %s", id)
	}

	// Pledge the asset using common (library) logic
	if err = wutils.PledgeAsset(ctx, assetJSON, assetType, id, remoteNetworkId, recipientCert, expiryTimeSecs); err == nil {
		// Delete asset state using app-specific logic
		return ctx.GetStub().DelState(assetKey)
	} else {
		return err
	}
}

// ClaimRemoteAsset gets ownership of an asset transferred from a different ledger/network.
func (s *SmartContract) ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, assetType, id, owner, remoteNetworkId, pledgeJSON string) error {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	// Claim the asset using common (library) logic
	claimer, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return err
	}
	pledgeAssetDetails, err := wutils.ClaimRemoteAsset(ctx, assetType, id, owner, remoteNetworkId, pledgeJSON, claimer)
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
func (s *SmartContract) ReclaimAsset(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, remoteNetworkId, claimStatusJSON string) error {
	// (Optional) Ensure that this function is being called by the Fabric Interop CC

	// Reclaim the asset using common (library) logic
	claimAssetDetails, pledgeAssetDetails, err := wutils.ReclaimAsset(ctx, assetType, id, recipientCert, remoteNetworkId, claimStatusJSON)
	if err != nil {
		return err
	}

	// Validate reclaimed asset details using app-specific-logic
	var claimAsset BondAsset
	err = json.Unmarshal(claimAssetDetails, &claimAsset)
	if err != nil {
		return err
	}
	if (claimAsset.Type != "" &&
		claimAsset.ID != "" &&
		claimAsset.Owner != "") {
		// Run checks on the claim parameter to see if it is what we expect and to ensure it has not already been made in the other network
		if !matchClaimWithAssetPledge(pledgeAssetDetails, claimAssetDetails) {
			return fmt.Errorf("claim info for asset %s does not match pledged asset details on ledger: %s", id, pledgeAssetDetails)
		}
	}

	// Recreate the asset in this network and chaincode using app-specific logic
	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), pledgeAssetDetails)
}

// ReadAsset returns the asset stored in the world state with given id.
// This function is called with the parameter inUpdateOwnerContext value as false, except in the update-owner context
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, assetType, id string, isUpdateOwnerContext bool) (*BondAsset, error) {
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
	// In the update owner context, the TxCreator will be the newOwner. Hence don't check if the TxCreator is the current owner.
	if !isUpdateOwnerContext {
		owner, err := getECertOfTxCreatorBase64(ctx)
		if err != nil {
			return nil, err
		}
		if asset.Owner != owner {
			return nil, fmt.Errorf("access not allowed to asset of type %s with id %s", assetType, id)
		}
	}

	return &asset, nil
}

// GetAssetPledgeStatus returns the asset pledge status.
func (s *SmartContract) GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, assetType, id, owner, recipientNetworkId, recipientCert string) (string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	// Create blank asset details using app-specific-logic
	blankAsset := BondAsset{
		Type: "",
		ID: "",
		Owner: "",
		Issuer: "",
		FaceValue: 0,
		MaturityDate: time.Unix(0, 0),
	}
	blankAssetJSON, err := json.Marshal(blankAsset)
	if err != nil {
		return "", err
	}

	// Fetch asset pledge details using common (library) logic
	pledgeAssetDetails, pledgeJSON, blankPledgeJSON, err := wutils.GetAssetPledgeStatus(ctx, assetType, id, recipientNetworkId, recipientCert, blankAssetJSON)
	if err != nil {
		return blankPledgeJSON, err
	}
	if pledgeAssetDetails == nil {
		return blankPledgeJSON, err
	}

	// Validate returned asset details using app-specific-logic
	var lookupPledgeAsset BondAsset
	err = json.Unmarshal(pledgeAssetDetails, &lookupPledgeAsset)
	if err != nil {
		return blankPledgeJSON, err
	}
	if lookupPledgeAsset.Owner != owner {
		return blankPledgeJSON, nil      // Return blank
	}

	return pledgeJSON, nil
}

// GetAssetClaimStatus returns the asset claim status and present time (of invocation).
func (s *SmartContract) GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, assetType, id, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64) (string, error) {
	// (Optional) Ensure that this function is being called by the relay via the Fabric Interop CC

	// Create blank asset details using app-specific-logic
	blankAsset := BondAsset{
		Type: "",
		ID: "",
		Owner: "",
		Issuer: "",
		FaceValue: 0,
		MaturityDate: time.Unix(0, 0),
	}
	blankAssetJSON, err := json.Marshal(blankAsset)
	if err != nil {
		return "", err
	}

	// Fetch asset claim details using common (library) logic
	claimAssetDetails, claimJSON, blankClaimJSON, err := wutils.GetAssetClaimStatus(ctx, assetType, id, recipientCert, pledger, pledgerNetworkId, pledgeExpiryTimeSecs, blankAssetJSON)
	if err != nil {
		return blankClaimJSON, err
	}
	if claimAssetDetails == nil {
		return blankClaimJSON, err
	}

	// Validate returned asset details using app-specific-logic

	// The asset should be recorded if it has been claimed, so we should look that up first
	assetJSON, err := ctx.GetStub().GetState(getBondAssetKey(assetType, id))
	if err != nil {
		return blankClaimJSON, fmt.Errorf("failed to read asset record from world state: %v", err)
	}
	if assetJSON == nil {
		return blankClaimJSON, nil      // Return blank
	}

	// Check if this asset is owned by the given recipient
	var asset BondAsset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return blankClaimJSON, err
	}
	if asset.Owner != recipientCert {
		return blankClaimJSON, nil      // Return blank
	}

	// Match pledger identity in claim with request parameters
	var lookupClaimAsset BondAsset
	err = json.Unmarshal(claimAssetDetails, &lookupClaimAsset)
	if err != nil {
		return blankClaimJSON, err
	}
	if lookupClaimAsset.Owner != pledger {
		return blankClaimJSON, nil      // Return blank
	}

	return claimJSON, nil
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, assetType, id string) error {
	assetKey := getBondAssetKey(assetType, id)
	assetJSON, err := ctx.GetStub().GetState(assetKey)
	if err != nil {
		return fmt.Errorf("failed to read asset record from world state: %v", err)
	}
	if assetJSON == nil {
		return fmt.Errorf("the bond asset of type %s and id %s does not exist", assetType, id)
	}
	// Ensure that the client is the owner of the asset
	if !checkAccessToAsset(s, ctx, assetJSON) {
		return fmt.Errorf("Cannot delete asset %s", id)
	}

	return ctx.GetStub().DelState(assetKey)
}

// isCallerAssetOwner returns true only if the invoker of the transaction is also the asset owner
func isCallerAssetOwner(s *SmartContract, ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	caller, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}
	return (asset.Owner == caller)
}

// isBondAssetLocked returns true only if the asset is presently locked
func isBondAssetLocked(s *SmartContract, ctx contractapi.TransactionContextInterface, asset *BondAsset) bool {
	bondAssetAgreement := &common.AssetExchangeAgreement{
		Type: asset.Type,
		Id: asset.ID,
		Recipient: "*",
		Locker: asset.Owner,
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
		Type: asset.Type,
		Id: asset.ID,
		Recipient: "",
		Locker: asset.Owner,
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
func checkAccessToAsset(s *SmartContract, ctx contractapi.TransactionContextInterface, assetJSON []byte) bool {
	var asset BondAsset
	err := json.Unmarshal(assetJSON, &asset)
	if err != nil {
		fmt.Println(err.Error())
		return false
	}

	// Ensure that the client is the owner of the asset
	if !isCallerAssetOwner(s, ctx, &asset) {
		fmt.Printf("Illegal update: caller is not owner of asset %s\n", asset.ID)
		return false
	}

	// Ensure that the asset is not locked
	if isBondAssetLocked(s, ctx, &asset) {
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
	asset, err := s.ReadAsset(ctx, assetType, id, false)
	if err != nil {
		return false, err
	}
	currDate := time.Now()
	if (currDate.After(asset.MaturityDate)) {
		return true, nil
	}

	return false, nil
}

// UpdateOwner sets the owner of an asset to a new owner.
func (s *SmartContract) UpdateOwner(ctx contractapi.TransactionContextInterface, assetType, id string, newOwner string) error {
	asset, err := s.ReadAsset(ctx, assetType, id, true)
	if err != nil {
		return err
	}

	asset.Owner = newOwner
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	// If the asset is locked, only the lock recipient can update the Owner field
	if isBondAssetLocked(s, ctx, asset) {
		return fmt.Errorf("Illegal update: cannot change ownership of locked asset %s in this transaction\n", asset.ID)
	} else {
		// If asset is not locked, only the owner can update the Owner field
		if !isCallerAssetOwner(s, ctx, asset) {
			return fmt.Errorf("Illegal update: caller is not owner of asset %s\n", asset.ID)
		}
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// UpdateMaturityDate sets the maturity date of the asset to an updated date as passed in the parameters.
func (s *SmartContract) UpdateMaturityDate(ctx contractapi.TransactionContextInterface, assetType, id string, newMaturityDate time.Time) error {
	asset, err := s.ReadAsset(ctx, assetType, id, false)
	if err != nil {
		return err
	}

	asset.MaturityDate = newMaturityDate
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	// Ensure that the asset is free to be modified
	if !checkAccessToAsset(s, ctx, assetJSON) {
		return fmt.Errorf("Cannot update maturity date of asset %s", id)
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// UpdateFaceValue sets the face value of an asset to the new value passed.
func (s *SmartContract) UpdateFaceValue(ctx contractapi.TransactionContextInterface, assetType, id string, newFaceValue int) error {
	asset, err := s.ReadAsset(ctx, assetType, id, false)
	if err != nil {
		return err
	}

	asset.FaceValue = newFaceValue
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	// Ensure that the asset is free to be modified
	if !checkAccessToAsset(s, ctx, assetJSON) {
		return fmt.Errorf("Cannot update face value of asset %s", id)
	}

	return ctx.GetStub().PutState(getBondAssetKey(assetType, id), assetJSON)
}

// GetMyAssets returns the assets owner by the caller
func (s *SmartContract) GetMyAssets(ctx contractapi.TransactionContextInterface) ([]*BondAsset, error) {
	owner, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return nil, err
	}
	assets, err := s.GetAllAssets(ctx)
	if err != nil {
		return nil, err
	}

	var myassets []*BondAsset

	for _, asset := range assets {
		if asset.Owner == owner {
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
			return nil, err
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}
