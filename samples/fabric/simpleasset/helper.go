/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// helper contains miscelaneous helper functions used throughout the code
package main

import (
	"fmt"
	"errors"
	"encoding/base64"
	"bytes"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	log "github.com/sirupsen/logrus"
)

// functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func getECertOfTxCreatorBase64(ctx contractapi.TransactionContextInterface) (string, error) {

	txCreatorBytes, err := ctx.GetStub().GetCreator()
	if err != nil {
	return "", fmt.Errorf("unable to get the transaction creator information: %+v", err)
	}

	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	err = proto.Unmarshal(txCreatorBytes, serializedIdentity)
	if err != nil {
		return "", fmt.Errorf("getECertOfTxCreatorBase64: unmarshal error: %+v", err)
	}

	eCertBytesBase64 := base64.StdEncoding.EncodeToString(serializedIdentity.IdBytes)

	return eCertBytesBase64, nil
}

func createKeyValuePairs(m map[string]uint64) string {
	b := new(bytes.Buffer)
	for key, value := range m {
		fmt.Fprintf(b, "%s=\"%d\"\n", key, value)
	}
	return b.String()
}
