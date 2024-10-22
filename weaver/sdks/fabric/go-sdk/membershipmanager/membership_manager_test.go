/*
 Copyright 2020 IBM All Rights Reserved.
 
 SPDX-License-Identifier: Apache-2.0
 */

package membershipmanager_test

import (
	"fmt"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	mmsdk "github.com/hyperledger-cacti/cacti/weaver/sdks/fabric/go-sdk/v2/membershipmanager"
 )


func TestMembershipManager(t *testing.T) {

	cacti_root := os.Getenv("CACTI_ROOT")
	walletPath := cacti_root + "/weaver/samples/fabric/fabric-cli/src/wallet-network1"    // e.g., <cacti-root>/weaver/samples/fabric/fabric-cli/src/wallet-network1/
	userName := "networkadmin"          // e.g., networkadmin
	connectionProfilePath := cacti_root + "/weaver/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json"    // e.g., <cacti-root>/weaver/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.docker.json"

	fmt.Printf("Wallet Path: %s\n", walletPath)
	fmt.Printf("Connection Profile Path: %s\n", connectionProfilePath)

	fmt.Printf("Get Recorded local Membership: ")
	member, err := mmsdk.GetMembershipUnit(walletPath, userName, connectionProfilePath, "mychannel", "Org1MSP")
	require.NoError(t, err)
	fmt.Printf("%+v\n", member)

	fmt.Printf("Get MSP Configuration for Org2MSP: ")
	membership, err := mmsdk.GetMSPConfigurations(walletPath, userName, connectionProfilePath, "mychannel", []string{"Org1MSP", "Org2MSP"})
	require.NoError(t, err)
	fmt.Printf("%+v\n", membership)

	fmt.Printf("Get All MSP Configuration for Org1MSP: ")
	membership, err = mmsdk.GetAllMSPConfigurations(walletPath, userName, connectionProfilePath, "mychannel", []string{"Org1MSP"})
	require.NoError(t, err)
	fmt.Printf("%+v\n", membership)

	fmt.Printf("Create Local Membership: ")
	err = mmsdk.CreateLocalMembership(walletPath, userName, connectionProfilePath, "network1", "mychannel", "interop", []string{"Org1MSP"})
	require.NoError(t, err)

	fmt.Printf("Update Local Membership: ")
	err = mmsdk.UpdateLocalMembership(walletPath, userName, connectionProfilePath, "network1", "mychannel", "interop", []string{"Org1MSP"})
	require.NoError(t, err)

	fmt.Printf("Read Local Membership: ")
	m, err := mmsdk.ReadMembership(walletPath, userName, connectionProfilePath, "mychannel", "interop", "local-security-domain", []string{"Org1MSP"})
	require.NoError(t, err)
	fmt.Println(m)

	fmt.Printf("Delete Local Membership: ")
	err = mmsdk.DeleteLocalMembership(walletPath, userName, connectionProfilePath, "mychannel", "interop", []string{"Org1MSP"})
	require.NoError(t, err)
}
