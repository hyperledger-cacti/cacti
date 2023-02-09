/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// verficationpolicycc contains all the code related to the VerificiatonPolicy struct, including CRUD operations
// and any related verification functions
package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

const verificationPolicyObjectType = "verificationPolicy"

// CreateVerificationPolicy cc is used to store a VerificationPolicy in the ledger
func (s *SmartContract) CreateVerificationPolicy(ctx contractapi.TransactionContextInterface, verificationPolicyJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	verificationPolicy, err := decodeVerificationPolicy([]byte(verificationPolicyJSON))
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}
	verificationPolicyKey, err := ctx.GetStub().CreateCompositeKey(verificationPolicyObjectType, []string{verificationPolicy.SecurityDomain})
	acp, getErr := ctx.GetStub().GetState(verificationPolicyKey)
	if getErr != nil {
		return getErr
	}
	if acp != nil {
		return fmt.Errorf("VerificationPolicy already exists with id: %s", verificationPolicy.SecurityDomain)
	}

	verificationPolicyBytes, err := json.Marshal(verificationPolicy)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(verificationPolicyKey, verificationPolicyBytes)
}

// UpdateVerificationPolicy cc is used to update an existing VerificationPolicy in the ledger
func (s *SmartContract) UpdateVerificationPolicy(ctx contractapi.TransactionContextInterface, verificationPolicyJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	verificationPolicy, err := decodeVerificationPolicy([]byte(verificationPolicyJSON))
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}
	verificationPolicyKey, err := ctx.GetStub().CreateCompositeKey(verificationPolicyObjectType, []string{verificationPolicy.SecurityDomain})
	_, err = s.GetVerificationPolicyBySecurityDomain(ctx, verificationPolicy.SecurityDomain)
	if err != nil {
		return err
	}

	verificationPolicyBytes, err := json.Marshal(verificationPolicy)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(verificationPolicyKey, verificationPolicyBytes)
}

// DeleteVerificationPolicy cc is used to delete an existing VerificationPolicy in the ledger
func (s *SmartContract) DeleteVerificationPolicy(ctx contractapi.TransactionContextInterface, verificationPolicyID string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	verificationPolicyKey, err := ctx.GetStub().CreateCompositeKey(verificationPolicyObjectType, []string{verificationPolicyID})
	bytes, err := ctx.GetStub().GetState(verificationPolicyKey)
	if err != nil {
		return err
	}
	if bytes == nil {
		return fmt.Errorf("VerificationPolicy with id: %s does not exist", verificationPolicyID)
	}
	err = ctx.GetStub().DelState(verificationPolicyKey)
	if err != nil {
		return fmt.Errorf("failed to delete asset %s: %v", verificationPolicyKey, err)
	}

	return nil
}

// GetVerificationPolicyBySecurityDomain cc gets the VerificationPolicy for the provided id
func (s *SmartContract) GetVerificationPolicyBySecurityDomain(ctx contractapi.TransactionContextInterface, verificationPolicyID string) (string, error) {
	verificationPolicyKey, err := ctx.GetStub().CreateCompositeKey(verificationPolicyObjectType, []string{verificationPolicyID})
	if err != nil {
		return "", err
	}
	bytes, err := ctx.GetStub().GetState(verificationPolicyKey)
	if err != nil {
		return "", err
	}
	if bytes == nil {
		return "", fmt.Errorf("VerificationPolicy with id: %s does not exist", verificationPolicyID)
	}

	return string(bytes), nil

}

// resolvePolicy takes the securityDomain and viewAddress for the external network that
// a Corda client wishes to receive the state for and looks up the corresponding endorsement policy
// for the external network that needs to be satisfied in order for the response to be accepted.
func resolvePolicy(s *SmartContract, ctx contractapi.TransactionContextInterface, securityDomain string, viewAddress string) (*common.Policy, error) {
	// Find verification policy for the network
	verificationPolicyString, err := s.GetVerificationPolicyBySecurityDomain(ctx, securityDomain)
	if err != nil {
		return nil, fmt.Errorf("Unable to get verification policy: %s", err.Error())
	}
	verificationPolicy, err := decodeVerificationPolicy([]byte(verificationPolicyString))
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal verification policy: %s", err.Error())
	}
	currentBestMatch := &common.Identifier{}
	for _, identifier := range verificationPolicy.Identifiers {
		// short circuit if there is an exact match
		if identifier.Pattern == viewAddress {
			return identifier.Policy, nil
		}

		// check if the identifier pattern is valid, that it matches the address and it's longer (i.e. more specific) than the currentBestMatch
		if validPatternString(identifier.Pattern) && isPatternAndAddressMatch(identifier.Pattern, viewAddress) && len(identifier.Pattern) > len(currentBestMatch.Pattern) {
			currentBestMatch = identifier
		}
	}

	// return the bestMatch if there was one
	if currentBestMatch.Pattern != "" {
		return currentBestMatch.Policy, nil
	}

	return nil, fmt.Errorf("Verification Policy Error: Failed to find verification policy matching view address: %s", viewAddress)
}
