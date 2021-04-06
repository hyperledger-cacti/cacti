/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseFabricViewAddress(t *testing.T) {
	// Success case
	validAddressString := "mychannel:interop:Read:a"
	result, err := parseFabricViewAddress(validAddressString)
	validViewAddressStruct := FabricViewAddress{
		Channel:  "mychannel",
		Contract: "interop",
		CCFunc:   "Read",
		Args:     []string{"a"},
	}
	require.NoError(t, err)
	require.Equal(t, &validViewAddressStruct, result)
	// Error cases
	invalidAddressString := "mychannel:interop"
	result, err = parseFabricViewAddress(invalidAddressString)
	require.EqualError(t, err, fmt.Sprintf("View segment not formatted correctly %s", invalidAddressString))
	// Error case View segment has a '/' character
	withSlash := "mychannel/mychannel:interop:Read:a"
	result, err = parseFabricViewAddress(withSlash)
	require.EqualError(t, err, fmt.Sprintf("View segment contains a '/' %s", withSlash))
}

func TestParseAdress(t *testing.T) {
	// Success case
	validAddressString := "localhost:3000/network1/mychannel:interop:Read:a"
	validAddressStruct := Address{
		LocationSegment: []string{"localhost:3000"},
		LedgerSegment:   "network1",
		ViewSegment:     "mychannel:interop:Read:a",
	}
	result, err := parseAddress(validAddressString)
	require.NoError(t, err)
	require.Equal(t, &validAddressStruct, result)
	// Error cases
	emptyAddressString := ""
	_, err = parseAddress(emptyAddressString)
	require.EqualError(t, err, fmt.Sprintf("Invalid Address. Address should have three segments. %s", emptyAddressString))
	closeAddressString := "localhost:9080/network1/mychannel/interop/asdf"
	_, err = parseAddress(closeAddressString)
	require.EqualError(t, err, fmt.Sprintf("Invalid Address. Address should have three segments. %s", closeAddressString))
}

func TestValidPatternString(t *testing.T) {
	//Happy no star
	validPattern := "valid:no:star"
	result := validPatternString(validPattern)
	require.True(t, result)
	//Happy star
	validStarPattern := "valid:star:*"
	result = validPatternString(validStarPattern)
	require.True(t, result)
	//Unhappy too many stars
	tooManyStars := "One*:*too:many"
	result = validPatternString(tooManyStars)
	require.False(t, result)
	//Unhappy invalid star location
	invalidStarLocation := "test:*:star"
	result = validPatternString(invalidStarLocation)
	require.False(t, result)
	//Just star
	result = validPatternString("*")
	require.True(t, result)
}

func TestIsPatternAndAddressMatch(t *testing.T) {
	// Happy case valid star pattern  match
	validPattern := "test:*"
	matchingString := "test:star"
	result := isPatternAndAddressMatch(validPattern, matchingString)
	require.True(t, result)

	// Happy case valid pattern exact match
	validNoStarPattern := "test:exact"
	exactMatchString := "test:exact"
	result = isPatternAndAddressMatch(validNoStarPattern, exactMatchString)
	require.True(t, result)

	// Unhappy case valid pattern doesnt match value
	validPatternNoMatch := "notMatch:*"
	result = isPatternAndAddressMatch(validPatternNoMatch, exactMatchString)
	require.False(t, result)

	// Just star any match
	result = isPatternAndAddressMatch("*", exactMatchString)
	require.True(t, result)

}
