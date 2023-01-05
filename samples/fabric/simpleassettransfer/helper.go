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
	"bytes"
	"crypto/sha256"
	"encoding/hex"

	log "github.com/sirupsen/logrus"
)

// functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func createKeyValuePairs(m map[string]uint64) string {
	b := new(bytes.Buffer)
	for key, value := range m {
		fmt.Fprintf(b, "%s=\"%d\"\n", key, value)
	}
	return b.String()
}

func generateSHA256HashInHexForm(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashHex := hex.EncodeToString(shaHash)
	return shaHashHex
}
