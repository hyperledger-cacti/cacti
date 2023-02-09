/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package interoperablehelper

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidPatternString(t *testing.T) {

	// Test success with the pattern passed in the correct format with just one "*" at the end
	pattern := "abcd*"
	retValue := validPatternString(pattern)
	require.Equal(t, retValue, true)
	fmt.Printf("Test success as the pattern passed correctly with just one star at the end\n")

	// Test success with the pattern passed in the correct format with no starts
	pattern = "abcd"
	retValue = validPatternString(pattern)
	require.Equal(t, retValue, true)
	fmt.Printf("Test success as with the pattern passed in the correct format with no stars\n")

	// Test failure with the pattern containing more then one "*" character
	pattern = "ab*cd*"
	retValue = validPatternString(pattern)
	require.Equal(t, retValue, false)
	fmt.Printf("Test failed as expected with pattern containing more than one star\n")

	// Test failure with the pattern containing one "*" character NOT at the end
	pattern = "ab*cd"
	retValue = validPatternString(pattern)
	require.Equal(t, retValue, false)
	fmt.Printf("Test failed as expected with pattern containing one star but NOT at the end\n")
}
