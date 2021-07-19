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

func deleteWallet(walletDirName string) {
	userWalletDir := filepath.Join(walletDirName)
	matches, err := filepath.Glob(userWalletDir)
	if err != nil {
		logrus.Fatalf("failed to match %q: %+v", userWalletDir, err)
	}
	for _, match := range matches {
		if err := os.RemoveAll(match); err != nil {
			logrus.Fatalf("failed to remove %q: %+v", match, err)
		}
	}
}

func TestCreateHTLC(t *testing.T) {
	deleteWallet("wallet")

	gnm := fabricGatewayNetworkMock{}
	getNetworkMock = func() (*gateway.Network, error) {
		network := &gateway.Network{}
		return network, nil
	}
	logrus.Printf("Test FabricHelper() success scenario")
	_, _, err := FabricHelper(gnm, "mychannel", "simpleasset", "./testdata", "example", "Org1MSP", "User1@org1.example.com", "connection-tls.yaml")
	if err != nil {
		t.Errorf("failed FabricHelper with error: %+v", err)
		logrus.Errorf("failed FabricHelper with error: %+v", err)
	}
	require.NoError(t, err)

	logrus.Printf("Test FabricHelper() gateway.GetNetwork() failure")
	getNetworkMock = func() (*gateway.Network, error) {
		network := &gateway.Network{}
		return network, errors.New("cannot execute gateway.GetNetwork()")
	}
	expectedError := "failed to get network: cannot execute gateway.GetNetwork()"
	_, _, err = FabricHelper(gnm, "mychannel", "simpleasset", "./testdata", "example", "Org1MSP", "", "connection-tls.yaml")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
	require.Contains(t, err.Error(), expectedError)

	logrus.Printf("Test FabricHelper() failure to connect ot gateway")
	userWalletPath := filepath.Join("wallet", "example", "User1@org1.example.com.id")
	userCredentials, err := ioutil.ReadFile(filepath.Clean(userWalletPath))
	if err != nil {
		logrus.Errorf("failed ioutil.ReadFile with error: %+v", err)
	}
	require.NoError(t, err)
	err = ioutil.WriteFile(filepath.Clean(userWalletPath), []byte(""), 0644)
	if err != nil {
		logrus.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}
	require.NoError(t, err)

	expectedError = "failed to connect to gateway: unexpected end of JSON input"
	_, _, err = FabricHelper(gnm, "mychannel", "simpleasset", "./testdata", "example", "Org1MSP", "", "connection-tls.json")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.Error(t, err)
	require.Contains(t, err.Error(), expectedError)

	err = ioutil.WriteFile(filepath.Clean(userWalletPath), userCredentials, 0644)
	if err != nil {
		logrus.Errorf("failed ioutil.WriteFile with error: %+v", err)
	}
	require.NoError(t, err)
	deleteWallet("keystore")

}
