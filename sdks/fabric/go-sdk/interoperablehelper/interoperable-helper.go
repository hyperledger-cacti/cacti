/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package interoperablehelper

import (
	"errors"
	"fmt"

	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
	log "github.com/sirupsen/logrus"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
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
