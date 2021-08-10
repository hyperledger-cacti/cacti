/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
)

type QueryType struct {
	ContractName string   `json:"contractName"`
	Channel      string   `json:"channel"`
	CcFunc       string   `json:"ccFunc"`
	Args         []string `json:"args"`
}

type GatewayNetworkInterface interface {
	GetNetwork(*gateway.Gateway, string) (*gateway.Network, error)
}

type fabricGatewayNetwork struct{}

func (f fabricGatewayNetwork) GetNetwork(gw *gateway.Gateway, channel string) (*gateway.Network, error) {
	return gw.GetNetwork(channel)
}

func NewGatewayNetworkInterface() GatewayNetworkInterface {
	return fabricGatewayNetwork{}
}

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func FabricHelper(gni GatewayNetworkInterface, channel string, contractName string, connProfilePath string, networkName string, mspId string, userString string) (*gateway.Gateway, *gateway.Contract, *gateway.Wallet, error) {
	log.Infof("fabricHelper(): parameters passed are.. channel: %s, contractName: %s, connProfilePath: %s, networkName: %s, mspId: %s, "+
		"userString: %s", channel, contractName, connProfilePath, networkName, mspId, userString)

	if userString == "" {
		userString = "User1@org1." + networkName + ".com"
	}

	err := os.Setenv("DISCOVERY_AS_LOCALHOST", "true")
	if err != nil {
		return nil, nil, nil, logThenErrorf("error setting DISCOVERY_AS_LOCALHOST environemnt variable: %+v", err)
	}

	wallet, err := gateway.NewFileSystemWallet("wallet/" + networkName)
	if err != nil {
		return nil, nil, nil, logThenErrorf("failed to create wallet: %+v", err)
	}

	if !wallet.Exists(userString) {
		_, err = populateWallet(wallet, connProfilePath, networkName, mspId, userString)
		if err != nil {
			return nil, nil, nil, logThenErrorf("failed to populate wallet contents: %+v", err)
		}
	}

	ccpPath := filepath.Join(connProfilePath)

	gw, err := gateway.Connect(
		gateway.WithConfig(config.FromFile(filepath.Clean(ccpPath))),
		gateway.WithIdentity(wallet, userString),
	)
	if err != nil {
		return nil, nil, nil, logThenErrorf("failed to connect to gateway: %+v", err)
	}
	defer gw.Close()

	network, err := gni.GetNetwork(gw, channel)
	if err != nil {
		return nil, nil, nil, logThenErrorf("failed to get network: %+v", err)
	}

	contract := network.GetContract(contractName)

	return gw, contract, wallet, nil
}

func GetIdentityFromWallet(wallet *gateway.Wallet, userString string) (*gateway.X509Identity, error) {
	var identity gateway.Identity
	if !wallet.Exists(userString) {
		return nil, logThenErrorf("username %s doesn't exist in the wallet", userString)
	}
	identity, err := wallet.Get(userString)
	if err != nil {
		return nil, logThenErrorf("fetching username %s from wallet error: %s", userString, err.Error())
	}
	return identity.(*gateway.X509Identity), nil
}

func populateWallet(wallet *gateway.Wallet, connProfilePath string, networkName string, mspId string, userString string) (*gateway.X509Identity, error) {
	var identity *gateway.X509Identity
	log.Infof("populateWallet(): Populating wallet...")

	if !strings.Contains(connProfilePath, "org1."+networkName+".com") {
		return identity, logThenErrorf("cannot populate wallet since connection profile path %s doesn't contain %s", connProfilePath, "org1."+networkName+".com")
	}
	ccpParts := strings.Split(connProfilePath, "org1."+networkName+".com")
	credPath := filepath.Join(ccpParts[0], "org1."+networkName+".com", "users", userString, "msp")

	certPath := filepath.Join(credPath, "signcerts", "cert.pem")
	// read the certificate pem
	cert, err := ioutil.ReadFile(filepath.Clean(certPath))
	if err != nil {
		return identity, logThenErrorf(err.Error())
	}

	keyDir := filepath.Join(credPath, "keystore")
	// there's a single file in this dir containing the private key
	files, err := ioutil.ReadDir(keyDir)
	if err != nil {
		return identity, logThenErrorf(err.Error())
	}
	if len(files) != 1 {
		return identity, logThenErrorf("keystore folder should contain one file")
	}
	keyPath := filepath.Join(keyDir, files[0].Name())
	key, err := ioutil.ReadFile(filepath.Clean(keyPath))
	if err != nil {
		return identity, logThenErrorf(err.Error())
	}

	identity = gateway.NewX509Identity(mspId, string(cert), string(key))

	err = wallet.Put(userString, identity)
	if err != nil {
		return identity, logThenErrorf(err.Error())
	}

	return identity, err
}

func Query(query QueryType, connProfilePath string, networkName string, mspId string, userString string) ([]byte, error) {
	log.Info("query(): running query on Fabric network")
	log.Infof("query: %+v, connProfilePath: %s, networkName: %s", query, connProfilePath, networkName)

	_, contract, _, err := FabricHelper(NewGatewayNetworkInterface(), query.Channel, query.ContractName, connProfilePath, networkName, mspId, userString)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	result, err := contract.EvaluateTransaction(query.CcFunc, query.Args...)
	if err != nil {
		logThenErrorf("failed to evaluate transaction: %+v", err)
	}
	log.Println("state from network:", string(result))

	return result, nil
}

func Invoke(query QueryType, connProfilePath string, networkName string, mspId string, userString string) ([]byte, error) {
	log.Info("invoke(): running invoke on Fabric network")

	_, contract, _, err := FabricHelper(NewGatewayNetworkInterface(), query.Channel, query.ContractName, connProfilePath, networkName, mspId, userString)
	if err != nil {
		log.Fatalf("failed FabricHelper with error: %+v", err)
	}

	result, err := contract.SubmitTransaction(query.CcFunc, query.Args...)
	if err != nil {
		return nil, logThenErrorf("failed to submit transaction: %+v", err)
	}
	log.Println("state from network:", string(result))

	return result, nil
}

func GetCredentialPath() string {
	credentialsPath := filepath.Join("./data", "credentials")
	return credentialsPath
}

func GetCurrentNetworkCredentialPath(networkId string) string {
	credentialsPath := filepath.Join("./data", "credentials", networkId)
	return credentialsPath
}

func GenerateMembership(channel, contractName, connProfilePath, networkName, mspId, userString string) error {
	gni := NewGatewayNetworkInterface()
	gw, _, _, err := FabricHelper(gni, channel, contractName, connProfilePath, networkName, mspId, userString)
	if err != nil {
		logThenErrorf("failed calling FabricHelper with error: %+v", err)
	}

	_, err = gni.GetNetwork(gw, channel)
	if err != nil {
		return logThenErrorf("generateMembership failed to get network: %+v", err)
	}

	credentialsPath := GetCurrentNetworkCredentialPath(networkName)
	log.Infof("credentialsPath: %s", credentialsPath)
	fileExists, err := CheckIfFileOrDirectoryExists(credentialsPath)
	if err != nil {
		logThenErrorf("failed to find credentialsPath %q: %+s", credentialsPath, err.Error())
	} else if !fileExists {
		log.Infof("creating directory %s", credentialsPath)
		err = os.Mkdir(credentialsPath, 0755)
		if err != nil {
			logThenErrorf("failed to create directory %s", credentialsPath)
		}
	}

	membershipBytes, err := formatMSP()
	if err != nil {
		logThenErrorf(err.Error())
	}
	err = ioutil.WriteFile(filepath.Join(credentialsPath, "membership.json"), membershipBytes, 0755)
	if err != nil {
		log.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}

	return nil
}

type Member struct {
	Value string   `json:"value"`
	Type  string   `json:"type"`
	Chain []string `json:"chain"`
}

type Membership struct {
	SecurityDomain string            `json:"securityDomain"`
	Members        map[string]Member `json:"members"`
}

func formatMSP() ([]byte, error) {
	member := Member{
		Value: "membervalue",
		Type:  "membertype",
		Chain: []string{"chain"},
	}
	membership := Membership{
		SecurityDomain: "network1",
		Members:        map[string]Member{"member1": member},
	}
	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		logThenErrorf("failed to marshal membership.json file with error: %+v", err)
	}

	log.Infof("membershipBytes: %s", string(membershipBytes))

	return membershipBytes, nil
}

func CheckIfFileOrDirectoryExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		// file exists
		return true, nil
	} else if os.IsNotExist(err) {
		// file not exists
		return false, nil
	}
	// error calling os.Stat()
	return false, err
}

func getMspConfig(network string) error {
	return nil
}

type Rule struct {
	Principal     string `json:"principal"`
	PrincipalType string `json:"principalType"`
	Resource      string `json:"resource"`
	Read          bool   `json:"read"`
}

type AccessControlPolicy struct {
	SecurityDomain string `json:"securityDomain"`
	Rules          []Rule `json:"rules"`
}

func GenerateAccessControl(channel, contractName, connProfilePath, networkName, templatePath, mspId, userString string) error {
	gni := NewGatewayNetworkInterface()
	_, _, wallet, err := FabricHelper(gni, channel, contractName, connProfilePath, networkName, mspId, userString)
	if err != nil {
		logThenErrorf("failed calling FabricHelper with error: %+v", err)
	}

	templateBytes, err := ioutil.ReadFile(filepath.Clean(templatePath))
	if err != nil {
		logThenErrorf("failed reading file %s with error: %s", templatePath, err.Error())
	}
	log.Infof("templateBytes: %s", string(templateBytes))

	accessControlJSON := AccessControlPolicy{}
	err = json.Unmarshal(templateBytes, &accessControlJSON)
	if err != nil {
		logThenErrorf("failed to unmarshal the content of the file %s with error: %s", templatePath, err.Error())
	}
	log.Infof("accessControlJSON: %+v", accessControlJSON)

	_, cert, err := GetKeyAndCertForRemoteRequestbyUserName(wallet, userString)
	if err != nil {
		logThenErrorf("error fetching key and certificate from network: %s", err.Error())
	}

	accessControlJSON.SecurityDomain = networkName
	accessControlJSON.Rules[0].Principal = cert
	accessControlJSON.Rules[0].PrincipalType = "certificate"

	accessControlPath := filepath.Join(GetCurrentNetworkCredentialPath(networkName), "access-control.json")

	accessControlJSONbytes, err := json.Marshal(accessControlJSON)
	if err != nil {
		logThenErrorf("failed to marshal the content of the file %s with error: %s", accessControlPath, err.Error())
	}

	err = ioutil.WriteFile(accessControlPath, accessControlJSONbytes, 0755)
	if err != nil {
		logThenErrorf("failed ioutil.WriteFile for the file %s with error: %s", accessControlPath, err.Error())
	}
	return nil
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

func GenerateVerificationPolicy(channel, contractName, connProfilePath, networkName, templatePath, mspId, userString string) error {
	gni := NewGatewayNetworkInterface()
	_, _, _, err := FabricHelper(gni, channel, contractName, connProfilePath, networkName, mspId, userString)
	if err != nil {
		logThenErrorf("failed calling FabricHelper with error: %+v", err)
	}

	templateBytes, err := ioutil.ReadFile(filepath.Clean(templatePath))
	if err != nil {
		logThenErrorf("failed reading file %s with error: %s", templatePath, err.Error())
	}
	log.Infof("templateBytes: %s", string(templateBytes))

	verificationPolicyJSON := VerificationPolicy{}
	err = json.Unmarshal(templateBytes, &verificationPolicyJSON)
	if err != nil {
		logThenErrorf("failed to unmarshal the content of the file %s with error: %s", templatePath, err.Error())
	}
	verificationPolicyJSON.SecurityDomain = networkName
	log.Infof("verificationPolicyJSON: %+v", verificationPolicyJSON)

	// update the verification policy

	verificationPolicyPath := filepath.Join(GetCurrentNetworkCredentialPath(networkName), "verification-policy.json")

	verificationPolicyJSONbytes, err := json.Marshal(verificationPolicyJSON)
	if err != nil {
		logThenErrorf("failed to marshal the content of the file %s with error: %s", verificationPolicyPath, err.Error())
	}

	err = ioutil.WriteFile(verificationPolicyPath, verificationPolicyJSONbytes, 0755)
	if err != nil {
		logThenErrorf("failed ioutil.WriteFile for the file %s with error: %s", verificationPolicyPath, err.Error())
	}
	return nil
}

func GetKeyAndCertForRemoteRequestbyUserName(wallet *gateway.Wallet, username string) (string, string, error) {
	if wallet == nil {
		return "", "", logThenErrorf("No wallet passed")
	}
	if username == "" {
		return "", "", logThenErrorf("No username passed")
	}

	identity, err := wallet.Get(username)
	if err != nil {
		return "", "", logThenErrorf("fetching username %s from wallet error: %s", username, err.Error())
	}

	// Assume the identity is of type 'fabric-network.X509Identity'
	return identity.(*gateway.X509Identity).Key(), identity.(*gateway.X509Identity).Certificate(), nil
}
