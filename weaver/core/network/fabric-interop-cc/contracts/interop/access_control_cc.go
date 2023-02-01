/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// accesscontrolcc contains all the code related to the AccessControlPolicy struct, including CRUD operations
// and any related verification functions
package main

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

const accessControlObjectType = "accessControl"

// CreateAccessControlPolicy cc is used to store a AccessControlPolicy in the ledger
func (s *SmartContract) CreateAccessControlPolicy(ctx contractapi.TransactionContextInterface, accessControlPolicyJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	accessControlPolicy, err := decodeAccessControlPolicy([]byte(accessControlPolicyJSON))
	if err != nil {
		errorMessage := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	accessControlKey, err := ctx.GetStub().CreateCompositeKey(accessControlObjectType, []string{accessControlPolicy.SecurityDomain})
	acp, err := ctx.GetStub().GetState(accessControlKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	if acp != nil {
		errorMessage := fmt.Sprintf("AccessControlPolicy already exists for securityDomain: %s", accessControlPolicy.SecurityDomain)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	accessControlBytes, err := json.Marshal(accessControlPolicy)
	if err != nil {
		errorMessage := fmt.Sprintf("Marshal error: %s", err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	return ctx.GetStub().PutState(accessControlKey, accessControlBytes)
}

// UpdateAccessControlPolicy cc is used to update an existing AccessControlPolicy in the ledger
func (s *SmartContract) UpdateAccessControlPolicy(ctx contractapi.TransactionContextInterface, accessControlPolicyJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	accessControlPolicy, err := decodeAccessControlPolicy([]byte(accessControlPolicyJSON))
	if err != nil {
		errorMessage := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	accessControlKey, err := ctx.GetStub().CreateCompositeKey(accessControlObjectType, []string{accessControlPolicy.SecurityDomain})
	_, err = s.GetAccessControlPolicyBySecurityDomain(ctx, accessControlPolicy.SecurityDomain)
	if err != nil {
		log.Error(err.Error())
		return err
	}

	accessControlBytes, err := json.Marshal(accessControlPolicy)
	if err != nil {
		errorMessage := fmt.Sprintf("Marshal error: %s", err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	return ctx.GetStub().PutState(accessControlKey, accessControlBytes)
}

// GetAccessControlPolicyBySecurityDomain cc gets the AccessControlPolicy for the provided securityDomain
func (s *SmartContract) GetAccessControlPolicyBySecurityDomain(ctx contractapi.TransactionContextInterface, securityDomain string) (string, error) {
	accessControlKey, err := ctx.GetStub().CreateCompositeKey(accessControlObjectType, []string{securityDomain})
	if err != nil {
		log.Error(err.Error())
		return "", err
	}
	bytes, err := ctx.GetStub().GetState(accessControlKey)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}
	if bytes == nil {
		errorMessage := fmt.Sprintf("Access Control Policy with securityDomain: %s does not exist", securityDomain)
		log.Error(errorMessage)
		return "", errors.New(errorMessage)
	}
	return string(bytes), nil
}

// DeleteAccessControlPolicy cc is used to delete an existing AccessControlPolicy in the ledger
func (s *SmartContract) DeleteAccessControlPolicy(ctx contractapi.TransactionContextInterface, securityDomain string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	accessControlKey, err := ctx.GetStub().CreateCompositeKey(accessControlObjectType, []string{securityDomain})
	bytes, err := ctx.GetStub().GetState(accessControlKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	if bytes == nil {
		errorMessage := fmt.Sprintf("Access Control Policy with securityDomain: %s does not exist", securityDomain)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	err = ctx.GetStub().DelState(accessControlKey)
	if err != nil {
		errorMessage := fmt.Sprintf("failed to delete asset %s: %v", accessControlKey, err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	return nil
}

// verifyAccessToCC looks up the Access Control State for the external network
// and verifies that the requester has the required permission to call the specified CC function.
func verifyAccessToCC(s *SmartContract, ctx contractapi.TransactionContextInterface, viewAddress *FabricViewAddress, viewAddressString string, query *common.Query) error {
	acpString, err := s.GetAccessControlPolicyBySecurityDomain(ctx, query.RequestingNetwork)
	if err != nil {
		errorMessage := fmt.Sprintf("Access control policy does not exist for network: %s", query.RequestingNetwork)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}
	acp, err := decodeAccessControlPolicy([]byte(acpString))
	if err != nil {
		errorMessage := fmt.Sprintf("Failed to unmarshal access control policy: %s", err.Error())
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	for _, rule := range acp.Rules {
		if rule.Resource == viewAddressString || (validPatternString(rule.Resource) && isPatternAndAddressMatch(rule.Resource, viewAddressString)) {
			// TODO: Check if these will be the same format (Or convert to matching formats at some point)
			// TODO: Need to use principalType and perform different validation for type "certificate" and "ca".
			// Code below assumes that requestor's membership has already been authenticated earlier if the type is "ca"
			if (rule.PrincipalType == "certificate" && query.Certificate == rule.Principal) {
				// Break loop as cert is valid.
				log.Infof("Access Control Policy PERMITS the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate)
				return nil
			}
			if (rule.PrincipalType == "ca" && query.RequestingOrg == rule.Principal) {
				// Break loop as cert is valid.
				log.Infof("Access Control Policy PERMITS the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.RequestingOrg)
				return nil
			}
		}

	}
	var errorMessage string
	if (query.Certificate != "") {
        errorMessage = fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.Certificate)
	} else if (query.RequestingOrg != "") {
        errorMessage = fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from '%s:%s'", viewAddressString, query.RequestingNetwork, query.RequestingOrg)
	} else {
		errorMessage = fmt.Sprintf("Access Control Policy DOES NOT PERMIT the request '%s' from a foreign entity", viewAddressString)
	}
	log.Error(errorMessage)
	return errors.New(errorMessage)

}
