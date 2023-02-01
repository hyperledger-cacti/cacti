/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"errors"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

var getNetworkMock func() (*gateway.Network, error)

type fabricGatewayNetworkMock struct{}

func (fMock fabricGatewayNetworkMock) GetNetwork(gw *gateway.Gateway, channel string) (*gateway.Network, error) {
	return getNetworkMock()
}

func deleteDir(dirName string) {
	dirPath := filepath.Join("./", dirName)
	matches, err := filepath.Glob(dirPath)
	if err != nil {
		logrus.Fatalf("failed to match %q: %+v", dirPath, err)
	}
	for _, match := range matches {
		if err := os.RemoveAll(match); err != nil {
			logrus.Fatalf("failed to remove %q: %+v", match, err)
		}
	}
}

func TestFarbicHelper(t *testing.T) {
	deleteDir("wallets")

	gnm := fabricGatewayNetworkMock{}
	getNetworkMock = func() (*gateway.Network, error) {
		network := &gateway.Network{}
		return network, nil
	}
	logrus.Printf("Test FabricHelper() success scenario")
	_, _, _, err := FabricHelper(gnm, "mychannel", "simpleasset", "./testdata/example/peerOrganizations/org1.example.com/connection-tls.yaml", "example", "Org1MSP", true, "User1@org1.example.com", "", false)
	if err != nil {
		t.Errorf("failed FabricHelper with error: %+v", err)
		logrus.Errorf("failed FabricHelper with error: %+v", err)
	}
	require.NoError(t, err)

	logrus.Printf("Test FabricHelper() failure to execute gateway.GetNetwork()")
	getNetworkMock = func() (*gateway.Network, error) {
		network := &gateway.Network{}
		return network, errors.New("cannot execute gateway.GetNetwork()")
	}
	expectedError := "failed to get network: cannot execute gateway.GetNetwork()"
	_, _, _, err = FabricHelper(gnm, "mychannel", "simpleasset", "./testdata/example/peerOrganizations/org1.example.com/connection-tls.yaml", "example", "Org1MSP", true, "User1@org1.example.com", "", false)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
	require.Contains(t, err.Error(), expectedError)

	logrus.Printf("Test FabricHelper() failure to connect to gateway")
	userWalletPath := filepath.Join("./wallets/example/", "User1@org1.example.com.id")
	// store the user credentials to restore it later
	userCredentials, err := ioutil.ReadFile(filepath.Clean(userWalletPath))
	if err != nil {
		logrus.Errorf("failed ioutil.ReadFile with error: %+v", err)
	}
	require.NoError(t, err)
	// set user credentials to empty
	err = ioutil.WriteFile(filepath.Clean(userWalletPath), []byte(""), 0644)
	if err != nil {
		logrus.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}
	require.NoError(t, err)

	//expectedError = "Invalid identity format: unexpected end of JSON input"
	expectedError = "failed to connect to gateway: unexpected end of JSON input"
	_, _, _, err = FabricHelper(gnm, "mychannel", "simpleasset", "./testdata/example/peerOrganizations/org1.example.com/connection-tls.json", "example", "Org1MSP", true, "User1@org1.example.com", "", true)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.Error(t, err)
	require.Contains(t, err.Error(), expectedError)

	// restore the user credentials
	err = ioutil.WriteFile(filepath.Clean(userWalletPath), userCredentials, 0644)
	if err != nil {
		logrus.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}
	require.NoError(t, err)
	deleteDir("keystore")

}
