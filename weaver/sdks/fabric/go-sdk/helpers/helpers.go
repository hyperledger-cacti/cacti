/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"errors"
	"fmt"
	"strings"

	log "github.com/sirupsen/logrus"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

type ParsedAddress struct {
	LocationSegment string
	NetworkSegment  string
	ViewSegment     string
}

/**
 * Parses address string into location, network and view segments.
 * @param address
 **/
func ParseAddress(address string) (*ParsedAddress, error) {
	addressParts := &ParsedAddress{}
	addressList := strings.Split(address, "/")
	if len(addressList) != 3 {
		return addressParts, logThenErrorf("invalid address string %s", address)
	}

	addressParts = &ParsedAddress{
		LocationSegment: addressList[0],
		NetworkSegment:  addressList[1],
		ViewSegment:     addressList[2],
	}

	return addressParts, nil
}
