/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package helpers

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseAddress(t *testing.T) {

	// Test success with the address passed in the correct format
	address := "localhost:9080/network1/mychannel:simplestate:Read:Arcturus"
	addressParts := []string{"localhost:9080", "network1", "mychannel:simplestate:Read:Arcturus"}
	retValue, err := ParseAddress(address)
	require.NoError(t, err)
	require.Equal(t, retValue.LocationSegment, addressParts[0])
	require.Equal(t, retValue.NetworkSegment, addressParts[1])
	require.Equal(t, retValue.ViewSegment, addressParts[2])
	fmt.Printf("Test success as the address is passed correctly\n")

	// Test failure with address not passed in the correct format
	address = "localhost:9080//network1/mychannel:simplestate:Read:Arcturus"
	expectedErr := "invalid address string " + address
	retValue, err = ParseAddress(address)
	require.Error(t, err)
	require.EqualError(t, err, expectedErr)
	fmt.Printf("Test failed as expected with error: %s\n", err)
}
