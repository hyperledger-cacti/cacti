package main

import (
	"encoding/base64"
	"encoding/json"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
)

func logWarnings(warnMsgs ...string) {
	for _, warnMsg := range warnMsgs {
		log.Warn(warnMsg)
	}
}

// Object used in the map, contractId --> contracted-asset
type ContractedAsset struct {
	Type string `json:"type"`
	Id   string `json:"id"`
}

// Object used in the map, contractId --> contracted-fungible-asset
type ContractedFungibleAsset struct {
	Type     string `json:"type"`
	NumUnits uint64 `json:"id"`
}

func getAssetLockLookupMapKey(ctx contractapi.TransactionContextInterface, Type, Id string) (string, error) {
	assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{Type, Id})
	if err != nil {
		return "", logThenErrorf("error while creating composite key: %+v", err)
	}

	return assetLockKey, nil
}

func getAssetContractIdMapKey(contractId string) string {
	return "AssetContract_" + contractId
}

func getFungibleAssetContractIdMapKey(contractId string) string {
	return "FungibleAssetContract_" + contractId
}

// write to the ledger the details needed at the time of unlock/claim
func (s *SmartContract) ContractIdFungibleAssetsLookupMap(ctx contractapi.TransactionContextInterface, assetType string, numUnits uint64, contractId string) error {
	contractedFungibleAsset := &ContractedFungibleAsset{
		Type:     assetType,
		NumUnits: numUnits,
	}
	contractedFungibleAssetBytes, err := json.Marshal(contractedFungibleAsset)
	if err != nil {
		return logThenErrorf("marshal error: %+v", err)
	}
	err = ctx.GetStub().PutState(getFungibleAssetContractIdMapKey(contractId), contractedFungibleAssetBytes)
	if err != nil {
		return logThenErrorf("failed to write to the fungible asset ledger: %+v", err)
	}

	return nil
}

// write to the ledger the details needed at the time of unlock/claim
func (s *SmartContract) ContractIdAssetsLookupMap(ctx contractapi.TransactionContextInterface, assetType, assetId, contractId string) error {
	contractedAsset := &ContractedAsset{
		Type: assetType,
		Id:   assetId,
	}
	contractedAssetBytes, err := json.Marshal(contractedAsset)
	if err != nil {
		return logThenErrorf("marshal error: %+v", err)
	}
	assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	err = ctx.GetStub().PutState(getAssetContractIdMapKey(assetLockKey), []byte(contractId))
	if err != nil {
		return logThenErrorf("failed to write to the asset ledger: %+v", err)
	}
	err = ctx.GetStub().PutState(getAssetContractIdMapKey(contractId), contractedAssetBytes)
	if err != nil {
		return logThenErrorf("failed to write to the asset ledger: %+v", err)
	}

	return nil
}

func (s *SmartContract) DeleteAssetLookupMapsUsingContractId(ctx contractapi.TransactionContextInterface, assetType, assetId, contractId string) error {
	// delete the lookup maps
	assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(assetLockKey))
	if err != nil {
		return logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", contractId, err)
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete contractId %s from bond asset network ledger: %+v", contractId, err)
	}

	return nil
}

func (s *SmartContract) DeleteAssetLookupMapsOnlyUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {
	// delete the lookup maps
	contractedAssetBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to read from asset ledger: %+v", err)
	}
	contractedAsset := ContractedAsset{}
	err = json.Unmarshal(contractedAssetBytes, &contractedAsset)
	if err != nil {
		return logThenErrorf("unmarshal error: %+v", err)
	}
	assetLockKey, err := getAssetLockLookupMapKey(ctx, contractedAsset.Type, contractedAsset.Id)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(assetLockKey))
	if err != nil {
		return logThenErrorf("failed to delete entry associated with contractId %s from asset ledger: %+v", contractId, err)
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete contractId %s from asset ledger: %+v", contractId, err)
	}

	return nil
}

func (s *SmartContract) DeleteFungibleAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) error {
	err := ctx.GetStub().DelState(getFungibleAssetContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete contractId %s from fungible asset ledger: %+v", contractId, err)
	}

	return nil
}

func (s *SmartContract) DeleteAssetLookupMaps(ctx contractapi.TransactionContextInterface, assetType, assetId string) error {
	// delete the lookup details
	assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	contractIdBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(assetLockKey))
	if err != nil {
		return logThenErrorf("unable to fetch from bond asset network ledger: %+v", err.Error())
	}
	if contractIdBytes == nil {
		return logThenErrorf("contractId not found on bond asset network ledger")
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(string(contractIdBytes)))
	if err != nil {
		return logThenErrorf("failed to delete entry contractId %s from bond asset network ledger: %+v", string(contractIdBytes), err)
	}
	err = ctx.GetStub().DelState(getAssetContractIdMapKey(assetLockKey))
	if err != nil {
		return logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", string(contractIdBytes), err)
	}

	return nil
}

// Fetch the contracted fungible asset type from the ledger
func (s *SmartContract) FetchAssetTypeFromContractIdFungibleAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	contractedFungibleAssetBytes, err := ctx.GetStub().GetState(getFungibleAssetContractIdMapKey(contractId))
	if err != nil {
		return "", logThenErrorf("failed to read from fungible asset network ledger: %+v", err)
	}
	contractedFungibleAsset := ContractedFungibleAsset{}
	err = json.Unmarshal(contractedFungibleAssetBytes, &contractedFungibleAsset)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %+v", err)
	}

	return contractedFungibleAsset.Type, nil
}

// Fetch the contracted fungible asset numUnits from the ledger
func (s *SmartContract) FetchNumUnitsFromContractIdFungibleAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (uint64, error) {
	contractedFungibleAssetBytes, err := ctx.GetStub().GetState(getFungibleAssetContractIdMapKey(contractId))
	if err != nil {
		return 0, logThenErrorf("failed to read from fungible asset network ledger: %+v", err)
	}
	contractedFungibleAsset := ContractedFungibleAsset{}
	err = json.Unmarshal(contractedFungibleAssetBytes, &contractedFungibleAsset)
	if err != nil {
		return 0, logThenErrorf("unmarshal error: %+v", err)
	}

	return contractedFungibleAsset.NumUnits, nil
}

// Fetch the contracted bond asset type from the ledger
func (s *SmartContract) FetchAssetTypeFromContractIdAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	contractedAssetBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(contractId))
	if err != nil {
		return "", logThenErrorf("failed to read from asset network ledger: %+v", err)
	}
	contractedAsset := ContractedAsset{}
	err = json.Unmarshal(contractedAssetBytes, &contractedAsset)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %+v", err)
	}

	return contractedAsset.Type, nil
}

// Fetch the contracted bond asset id from the ledger
func (s *SmartContract) FetchAssetIdFromContractIdAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	contractedAssetBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(contractId))
	if err != nil {
		return "", logThenErrorf("failed to read from asset network ledger: %+v", err)
	}
	contractedAsset := ContractedAsset{}
	err = json.Unmarshal(contractedAssetBytes, &contractedAsset)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %+v", err)
	}

	return contractedAsset.Id, nil
}

type AssetExchangeAgreement struct {
	Type      string `json:"type"`
	Id        string `json:"id"`
	Locker    string `json:"locker"`
	Recipient string `json:"recipient"`
}

func (s *SmartContract) ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64 string) (*AssetExchangeAgreement, error) {
	assetAgreement := &common.AssetExchangeAgreement{}
	var assetAgreementJson AssetExchangeAgreement
	// Decoding from base64
	assetAgreementSerializedProto, err := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
	if err != nil {
		return &assetAgreementJson, logThenErrorf(err.Error())
	}
	if len(assetAgreementSerializedProto) == 0 {
		return &assetAgreementJson, logThenErrorf("empty asset agreement")
	}
	err = proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
	if err != nil {
		return &assetAgreementJson, logThenErrorf(err.Error())
	}

	assetAgreementJson.Type = assetAgreement.Type
	assetAgreementJson.Id = assetAgreement.Id
	assetAgreementJson.Locker = assetAgreement.Locker
	assetAgreementJson.Recipient = assetAgreement.Recipient

	return &assetAgreementJson, nil
}

type FungibleAssetExchangeAgreement struct {
	Type      string `json:"type"`
	NumUnits  uint64 `json:"numUnits"`
	Locker    string `json:"locker"`
	Recipient string `json:"recipient"`
}

func (s *SmartContract) ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64 string) (*FungibleAssetExchangeAgreement, error) {
	assetAgreement := &common.FungibleAssetExchangeAgreement{}
	var assetAgreementJson FungibleAssetExchangeAgreement
	// Decoding from base64
	fungibleAssetExchangeAgreementSerializedProto, err := base64.StdEncoding.DecodeString(fungibleAssetExchangeAgreementSerializedProto64)
	if err != nil {
		return &assetAgreementJson, logThenErrorf(err.Error())
	}
	if len(fungibleAssetExchangeAgreementSerializedProto) == 0 {
		return &assetAgreementJson, logThenErrorf("empty asset agreement")
	}
	err = proto.Unmarshal([]byte(fungibleAssetExchangeAgreementSerializedProto), assetAgreement)
	if err != nil {
		return &assetAgreementJson, logThenErrorf(err.Error())
	}

	assetAgreementJson.Type = assetAgreement.Type
	assetAgreementJson.NumUnits = assetAgreement.NumUnits
	assetAgreementJson.Locker = assetAgreement.Locker
	assetAgreementJson.Recipient = assetAgreement.Recipient

	return &assetAgreementJson, nil
}

/*func (s *SmartContract) ValidateAndExtractLockInfo(lockInfoSerializedProto64 string) (*common.AssetLock, error) {
	lockInfo := &common.AssetLock{}
	// Decoding from base64
	lockInfoSerializedProto, err := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
	if err != nil {
		return lockInfo, logThenErrorf(err.Error())
	}
	if len(lockInfoSerializedProto) == 0 {
		return lockInfo, logThenErrorf("empty lock info")
	}
	err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
	if err != nil {
		return lockInfo, logThenErrorf(err.Error())
	}

	return lockInfo, nil
}*/
