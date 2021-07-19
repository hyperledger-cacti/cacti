/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	log "github.com/sirupsen/logrus"

	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
)

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

func FabricHelper(gni GatewayNetworkInterface, channel string, contractName string, connProfilePath string, networkName string, mspId string, userString string, fileName string) (*gateway.Contract, *gateway.X509Identity, error) {
	var identity *gateway.X509Identity
	log.Infof("fabricHelper(): parameters passed are.. channel: %s, contractName: %s, connProfilePath: %s, networkName: %s, mspId: %s, "+
		"userString: %s", channel, contractName, connProfilePath, networkName, mspId, userString)

	if userString == "" {
		userString = "User1@org1." + networkName + ".com"
	}

	err := os.Setenv("DISCOVERY_AS_LOCALHOST", "true")
	if err != nil {
		return nil, nil, logThenErrorf("error setting DISCOVERY_AS_LOCALHOST environemnt variable: %+v", err)
	}

	wallet, err := gateway.NewFileSystemWallet("wallet/" + networkName)
	if err != nil {
		return nil, nil, logThenErrorf("failed to create wallet: %+v", err)
	}

	if !wallet.Exists(userString) {
		identity, err = populateWallet(wallet, connProfilePath, networkName, mspId, userString, true)
		if err != nil {
			return nil, nil, logThenErrorf("failed to populate wallet contents: %+v", err)
		}
	} else {
		identity, err = populateWallet(wallet, connProfilePath, networkName, mspId, userString, false)
		if err != nil {
			return nil, nil, logThenErrorf("failed to fetch wallet contents: %+v", err)
		}
	}

	ccpPath := filepath.Join(connProfilePath, networkName, "peerOrganizations", "org1."+networkName+".com", fileName)

	gw, err := gateway.Connect(
		gateway.WithConfig(config.FromFile(filepath.Clean(ccpPath))),
		gateway.WithIdentity(wallet, userString),
	)
	if err != nil {
		return nil, nil, logThenErrorf("failed to connect to gateway: %+v", err)
	}
	defer gw.Close()

	network, err := gni.GetNetwork(gw, channel)
	if err != nil {
		return nil, nil, logThenErrorf("failed to get network: %+v", err)
	}

	contract := network.GetContract(contractName)

	return contract, identity, nil
}

func Query(contract *gateway.Contract, ccFunc string, args ...string) error {
	log.Info("query(): ccFunc:", ccFunc, " args:", args)

	result, err := contract.EvaluateTransaction(ccFunc, args...)
	if err != nil {
		logThenErrorf("failed to evaluate transaction: %+v", err)
	}
	log.Println(string(result))

	return nil
}

func Invoke(contract *gateway.Contract, ccFunc string, args ...string) error {
	log.Info("invoke(): ccFunc:", ccFunc, " args:", args)

	result, err := contract.SubmitTransaction(ccFunc, args...)
	if err != nil {
		logThenErrorf("failed to submit transaction: %+v", err)
	}
	log.Println(string(result))

	return nil
}

func populateWallet(wallet *gateway.Wallet, connProfilePath string, networkName string, mspId string, userString string, newUser bool) (*gateway.X509Identity, error) {
	var identity *gateway.X509Identity
	log.Infof("populateWallet(): Populating wallet...")
	credPath := filepath.Join(connProfilePath, networkName, "peerOrganizations", "org1."+networkName+".com", "users", userString, "msp")

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
		return identity, logThenErrorf("keystore folder should have contain one file")
	}
	keyPath := filepath.Join(keyDir, files[0].Name())
	key, err := ioutil.ReadFile(filepath.Clean(keyPath))
	if err != nil {
		return identity, logThenErrorf(err.Error())
	}

	identity = gateway.NewX509Identity(mspId, string(cert), string(key))

	err = nil
	if newUser {
		err = wallet.Put(userString, identity)
	}

	return identity, err
}
