/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package interopsetup

import (
	"errors"
	"fmt"
	"io/ioutil"
	"path/filepath"

	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/go-cli/helpers"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func HelperInvoke(ccFunc string, ccArgs []string, contractName, channelName, connProfilePath, networkName string) ([]byte, error) {
	query := helpers.QueryType{
		ContractName: contractName,
		Channel:      channelName,
		CcFunc:       ccFunc,
		Args:         ccArgs,
	}

	result, err := helpers.Invoke(query, connProfilePath, networkName, "Org1MSP", "")
	if err != nil {
		return nil, logThenErrorf("%s helpers.Invoke error: %+v", ccFunc, err.Error())
	}
	log.Infof("%s helpers.Invoke result: %s", ccFunc, result)

	return result, nil
}

func ConfigureNetwork(mainNetwork string) error {
	networkEnv, err := helpers.GetNetworkConfig(mainNetwork)
	if err != nil {
		return logThenErrorf("failure of helpers.GetNetworkConfig for network %s with error: %s", mainNetwork, err.Error())
	}
	log.Infof("network configuration for the network %s is: %+v", mainNetwork, networkEnv)

	if networkEnv.RelayEndPoint == "" || networkEnv.ConnProfilePath == "" {
		return logThenErrorf("please use a valid --local-network. If valid network please check if your environment variables are configured properly")
	}

	credentialFolderPath := helpers.GetCredentialPath()
	fileExists, err := helpers.CheckIfFileOrDirectoryExists(credentialFolderPath)
	if err != nil {
		logThenErrorf("failed to find credentialFolderPath %q: %+s", credentialFolderPath, err.Error())
	} else if !fileExists {
		logThenErrorf("credentials folder %s doesn't exist", credentialFolderPath)
	}

	accessControlPath := filepath.Join(helpers.GetCurrentNetworkCredentialPath(mainNetwork), "access-control.json")
	fileExists, err = helpers.CheckIfFileOrDirectoryExists(accessControlPath)
	if err != nil {
		logThenErrorf("failed to find accessControlPath %q: %+s", accessControlPath, err.Error())
	} else if !fileExists {
		logThenErrorf("file access-control.json doesn't exist")
	}

	membershipPath := filepath.Join(helpers.GetCurrentNetworkCredentialPath(mainNetwork), "membership.json")
	fileExists, err = helpers.CheckIfFileOrDirectoryExists(membershipPath)
	if err != nil {
		logThenErrorf("failed to find membershipPath %q: %+s", membershipPath, err.Error())
	} else if !fileExists {
		logThenErrorf("file membership.json doesn't exist")
	}

	verificationPolicyPath := filepath.Join(helpers.GetCurrentNetworkCredentialPath(mainNetwork), "verification-policy.json")
	_, err = filepath.Glob(verificationPolicyPath)
	if err != nil {
		logThenErrorf("failed to find verificationPolicyPath %q: %+s", verificationPolicyPath, err.Error())
	}
	fileExists, err = helpers.CheckIfFileOrDirectoryExists(verificationPolicyPath)
	if err != nil {
		logThenErrorf("failed to find verificationPolicyPath %q: %+s", verificationPolicyPath, err.Error())
	} else if !fileExists {
		logThenErrorf("file verification-policy.json doesn't exist")
	}

	return configureNetworkHelper(networkEnv.ConnProfilePath, mainNetwork, "mychannel", "interop", accessControlPath, membershipPath, verificationPolicyPath)
}

func configureNetworkHelper(connProfilePath, networkName, channelName, contractName, accessControlPath, membershipPath, verificationPolicyPath string) error {
	accessControlBytes, err := ioutil.ReadFile(filepath.Clean(accessControlPath))
	if err != nil {
		logThenErrorf("failed reading access-control.json with error: %s", err.Error())
	}
	log.Infof("accessControl: %s", string(accessControlBytes))

	ccArgs := []string{string(accessControlBytes)}
	ccFunc := "CreateAccessControlPolicy"
	//ccFunc := "UpdateAccessControlPolicy"
	result, err := HelperInvoke(ccFunc, ccArgs, contractName, channelName, connProfilePath, networkName)
	if err != nil {
		logThenErrorf("%s interopsetup.HelperInvoke error: %+v", ccFunc, err.Error())
	}
	log.Printf("%s interopsetup.HelperInvoke result: %s", ccFunc, string(result))

	membershipBytes, err := ioutil.ReadFile(filepath.Clean(membershipPath))
	if err != nil {
		logThenErrorf("failed reading membership.json with error: %s", err.Error())
	}
	log.Infof("membership: %s", string(membershipBytes))

	ccArgs = []string{string(membershipBytes)}
	ccFunc = "CreateMembership"
	//ccFunc = "UpdateMembership"
	result, err = HelperInvoke(ccFunc, ccArgs, contractName, channelName, connProfilePath, networkName)
	if err != nil {
		logThenErrorf("%s interopsetup.HelperInvoke error: %s", ccFunc, err.Error())
	}
	log.Printf("%s interopsetup.HelperInvoke result: %s", ccFunc, string(result))

	verificationPolicyBytes, err := ioutil.ReadFile(filepath.Clean(verificationPolicyPath))
	if err != nil {
		logThenErrorf("failed reading membership.json with error: %s", err.Error())
	}
	log.Infof("verificationPolicy: %s", string(verificationPolicyBytes))

	ccArgs = []string{string(verificationPolicyBytes)}
	ccFunc = "CreateVerificationPolicy"
	//ccFunc = "UpdateVerificationPolicy"
	result, err = HelperInvoke(ccFunc, ccArgs, contractName, channelName, connProfilePath, networkName)
	if err != nil {
		logThenErrorf("%s interopsetup.HelperInvoke error: %s", ccFunc, err.Error())
	}
	log.Printf("%s interopsetup.HelperInvoke result: %s", ccFunc, string(result))

	return nil
}
