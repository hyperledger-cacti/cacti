/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// helper contains miscelaneous helper functions used throughout the code
package main

import (
	"fmt"
	"strings"
)

// Address contains the information that was sent in the address field of a query from an external network
type Address struct {
	ViewSegment     string
	LocationSegment []string
	LedgerSegment   string
}

// FabricViewAddress contains the data relevant to the view sent in the address string by the remote client.
type FabricViewAddress struct {
	Channel  string
	Contract string
	CCFunc   string
	Args     []string
}

// strArrToBytesArr converts an array of strings into an array of []byte
func strArrToBytesArr(strArray []string) [][]byte {
	output := make([][]byte, len(strArray))
	for i, v := range strArray {
		output[i] = []byte(v)
	}
	return output
}

// parseAddress takes the address field of a Query sent from an external network at parses it into its
// local, securityDomain and view segments.
func parseAddress(address string) (*Address, error) {
	addressList := strings.Split(address, "/")
	if len(addressList) != 3 {
		return nil, fmt.Errorf("Invalid Address. Address should have three segments. %s", address)
	}

	return &Address{
		LocationSegment: strings.Split(addressList[0], ";"),
		LedgerSegment:   addressList[1],
		ViewSegment:     addressList[2],
	}, nil

}

// parseFabricViewAddress receives the view segment of an address and constructs a FabricViewAddress from it
// It splits on ':' to get sections in the viewAddress. Channel, Contract, CCFunc, the rest are arguments for the chaincode
func parseFabricViewAddress(viewAddress string) (*FabricViewAddress, error) {
	if strings.Contains(viewAddress, "/") {
		return nil, fmt.Errorf("View segment contains a '/' %s", viewAddress)
	}
	fabricArgs := strings.Split(viewAddress, ":")
	if len(fabricArgs) < 3 {
		return nil, fmt.Errorf("View segment not formatted correctly %s", viewAddress)
	}

	return &FabricViewAddress{Channel: fabricArgs[0], Contract: fabricArgs[1], CCFunc: fabricArgs[2], Args: fabricArgs[3:]}, nil
}

// Contains tells whether a contains x.
func Contains(a []string, x string) bool {
	for _, n := range a {
		if x == n {
			return true
		}
	}
	return false
}

func validPatternString(pattern string) bool {
	// count number of stars in pattern
	numStars := strings.Count(pattern, "*")

	// check if 0 or 1 stars
	if numStars <= 1 {
		// if 0 stars, return true, if 1 star, make sure its at the end
		return strings.HasSuffix(pattern, "*") || numStars == 0
	}

	return false
}

func isPatternAndAddressMatch(pattern string, address string) bool {
	// make sure the pattern is valid
	if !validPatternString(pattern) {
		return false
	}

	// count number of stars in pattern
	numStars := strings.Count(pattern, "*")

	// if 0 stars, and exact match, return true
	if numStars == 0 && pattern == address {
		return true
	}

	// if 1 star and pattern is a substring of address, return true
	if numStars == 1 && strings.Contains(address, strings.TrimRight(pattern, "*")) {
		return true
	}

	return false
}
