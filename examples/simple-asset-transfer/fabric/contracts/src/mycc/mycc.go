package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"

	"fmt"

	"github.com/ethereum/go-ethereum/crypto/secp256k1"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
	"golang.org/x/crypto/sha3"
)

var logger = shim.NewLogger("mycc")

// MyChaincode example simple Chaincode implementation
type MyChaincode struct {
}

// AssetOrigin defines the asset's origin
type AssetOrigin struct {
	OriginDltID   string `json:"origin_dlt_id"`
	OriginAssetID string `json:"origin_asset_id"`
}

// AssetProperties represent the other functional properties of the asset
type AssetProperties struct {
	Property1 string `json:"property1"`
	Property2 string `json:"property2"`
}

// Asset represents the main object to be manipulated by the chaincode
type Asset struct {
	AssetID     string          `json:"asset_id"`
	DltID       string          `json:"dlt_id"`
	Origin      []AssetOrigin   `json:"origin"`
	Properties  AssetProperties `json:"properties"`
	Locked      bool            `json:"locked"`
	TargetDltID string          `json:"target_dlt_id"`
	ReceiverPK  string          `json:"receiver_pk"`
}

// Init is the function to be called when the chaincode is instantiated
func (t *MyChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

// Invoke catcher, redistribute to according invoke function
func (t *MyChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	logger.Info("########### example_cc0 Invoke ###########")

	function, args := stub.GetFunctionAndParameters()

	switch function {
	case "createAsset":
		return t.createAsset(stub, args)
	case "addPubKey":
		return t.addPubKey(stub, args)
	case "lockAsset":
		return t.lockAsset(stub, args)
	case "setProperty":
		return t.setProperty(stub, args)
	case "verify":
		return t.verify(stub, args)
	case "query":
		return t.query(stub, args)
	default:
		msg := fmt.Sprintf("Unknown action, check the first argument, must be one of "+
			"'delete', 'query', or 'move'. But got: %v", args[0])
		logger.Errorf(msg)
		return shim.Error(msg)
	}
}

func (t *MyChaincode) lockAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 3 " +
			"(asset_id, target_dlt_id, receiver_pk)")
	}

	var assetID = args[0]
	var targetDltID = args[1]
	var receiverPK = args[2]

	var assetKey = getKey(assetID)

	var asset = Asset{}

	var decodeErr error
	var putAssetErr error

	// Check that the asset exists
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes == nil {
		return shim.Error("Failed as asset doesn't exist")
	}

	decodeErr = json.Unmarshal(assetBytes, &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Failed to decode retrieved asset")
	}

	if asset.Locked {
		return shim.Error("Failed as asset is already locked")
	}

	// Lock the asset and update it on the Blockchain
	asset.Locked = true
	asset.TargetDltID = targetDltID
	asset.ReceiverPK = receiverPK

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}

func (t *MyChaincode) setProperty(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 3 " +
			"(assetID, propertyName, propertyValue)")
	}

	var assetID = args[0]
	var propertyName = args[1]
	var propertyValue = args[2]
	var assetKey = getKey(assetID)

	var asset = Asset{}

	var decodeErr error
	var putAssetErr error

	// Check that the asset exists
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes == nil {
		return shim.Error("Failed as asset doesn't exist")
	}

	decodeErr = json.Unmarshal(assetBytes, &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Failed to decode retrieved asset")
	}

	// Check that the asset is not locked before updating asset's properties
	if asset.Locked {
		return shim.Error("Failed as asset is locked, no updates ar allowed")
	}

	// Change the propety's value
	switch propertyName {
	case "property1":
		asset.Properties.Property1 = propertyValue
	case "property2":
		asset.Properties.Property2 = propertyValue
	default:
		return shim.Error("Failed as property to update doesn't exist")
	}

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}

func (t *MyChaincode) createAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("########### creating asset ###########")

	var assetKey string
	var assetStr string

	var decodeErr error
	var getAssetErr error
	var putAssetErr error

	if len(args) != 1 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 1 " +
			"(asset definition object)")
	}

	assetStr = args[0]

	var asset = Asset{}
	decodeErr = json.Unmarshal([]byte(assetStr), &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Bad asset format")
	}

	assetKey = getKey(asset.AssetID)

	// Check that the asset doesn't already exist
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes != nil {
		return shim.Error("Failed as entity already exists")
	}

	// Asset is created unlocked at first
	asset.Locked = false
	asset.DltID = "Accenture_DLT"

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}

func readPubKeysMap(stub shim.ChaincodeStubInterface) (map[string]string, error) {
	pubKeysMap := make(map[string]string)
	pubKeysBytes, err := stub.GetState("pubs")
	if err == nil {
		err = json.Unmarshal(pubKeysBytes, &pubKeysMap)
		return pubKeysMap, nil
	}
	return pubKeysMap, err
}

func parsePubKey(pubKey string, verify bool) ([]byte, error) {
	if len(pubKey) != 66 {
		return nil, errors.New("Public key ie expected in compressed format - 66 hex digits")
	}
	var pub [33]byte
	_, err := hex.Decode(pub[:], []byte(pubKey))
	if err != nil {
		return nil, err
	}
	if verify {
		x, y := secp256k1.DecompressPubkey(pub[:])
		if x == nil || y == nil {
			return nil, errors.New("Invalid public key")
		}
	}
	return pub[:], nil
}

func (t *MyChaincode) addPubKey(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("########### adding public key ###########")

	if len(args) != 2 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 2 " +
			"(public key, name)")
	}

	pubKey := args[0]
	name := args[1]
	_, err := parsePubKey(pubKey, true)
	if err != nil {
		return shim.Error(err.Error())
	}

	pubKeysMap, err := readPubKeysMap(stub)
	if err != nil {
		return shim.Error("Public key storage is broken")
	}
	pubKeysMap[pubKey] = name

	// Put the asset to the blockchain KVS
	pubKeysBytes, _ := json.Marshal(pubKeysMap)
	logger.Infof("%s\n", pubKeysBytes)
	err = stub.PutState("pubs", pubKeysBytes)
	if err != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(pubKeysBytes)
}

func getKey(assetID string) string {
	// initialize Hash for an object
	assetIDHash := sha256.New()
	assetIDHash.Write([]byte(assetID))

	return hex.EncodeToString(assetIDHash.Sum(nil))
}

func (t *MyChaincode) verifyOne(msgStr, pubStr, signatureStr string) bool {
	pub, err := parsePubKey(pubStr, false)
	if err != nil {
		logger.Error(err.Error())
		return false
	}

	var hash [32]byte
	hasher := sha3.NewLegacyKeccak256()
	hasher.Write([]byte(msgStr))
	hasher.Sum(hash[:0])
	logger.Debugf("Msg '%s' hash: %x\n", msgStr, hash)

	var sig [64]byte
	_, _ = hex.Decode(sig[:], []byte(signatureStr))

	valid := secp256k1.VerifySignature(pub[:], hash[:], sig[:])
	logger.Info("Verification: ", valid)
	return valid
}

func (t *MyChaincode) verify(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) >= 3 && len(args)%2 != 1 {
		return shim.Error("Failed because incorrect number of arguments. Expecting:" +
			"(message, pubkey1, signature1, [pubkey2, signature2, [...]])")
	}

	msg := args[0]

	pubKeysMap, err := readPubKeysMap(stub)
	if err != nil {
		return shim.Error("Public key storage is broken")
	}
	results := make([]bool, len(args)/2)
	for i := 0; i < len(args)/2; i++ {
		pubkey := args[1+i*2]
		signature := args[2+i*2]
		_, ok := pubKeysMap[pubkey]
		results[i] = ok && t.verifyOne(msg, pubkey, signature)
	}
	resultBytes, _ := json.Marshal(results)
	return shim.Success(resultBytes)
}

func (t *MyChaincode) query(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("########### querying ###########")
	var key string
	var err error

	if len(args) != 1 && len(args) != 2 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 1")
	}

	key = getKey(args[0])

	// Get the asset from the ledger
	assetBytes, err := stub.GetState(key)
	if err != nil {
		jsonResp := "{Failed to get asset for " + key + "}"
		return shim.Error(jsonResp)
	}

	if assetBytes == nil {
		jsonResp := "{Records not found for " + key + "}"
		return shim.Error(jsonResp)
	}
	if len(args) == 1 {
		return shim.Success(assetBytes)
	}

	return shim.Error(args[1] + " is not yet implemented")
}

func main() {
	err := shim.Start(new(MyChaincode))
	if err != nil {
		logger.Errorf("Error starting my chaincode: %s", err)
	}
}
