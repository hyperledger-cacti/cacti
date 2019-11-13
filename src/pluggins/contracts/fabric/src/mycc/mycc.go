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
