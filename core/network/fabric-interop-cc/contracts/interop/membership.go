/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// membershipcc contains all the code related to the Membership struct, including CRUD operations
// and any related verification functions
package main

import (
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/identity"
	protoV2 "google.golang.org/protobuf/proto"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

const membershipObjectType = "membership"
const membershipLocalSecurityDomain = "local-security-domain"

// Check the validity of each certificate chain in this membership
func validateMemberCertChains(membership *common.Membership) error {
	for _, member := range membership.Members {
		if len(member.Chain) > 1 {
			err := verifyCertificateChain(nil, member.Chain)
			if err != nil {
				return fmt.Errorf("Certificate chain corresponding to member %+v in security domain %s is invalid: %s", member, membership.SecurityDomain, err)
			}
		}
	}
	return nil
}

// Validate 'identity.Attestation' object against a message byte array
// returns parsed Certificate if attestation is valid
func parseAndValidateAttestation(attestation *identity.Attestation, messageBytes string) (*x509.Certificate, error) {
	// Parse local IIN Agent's certificate
	cert, err := parseCert(attestation.Certificate)
	if err != nil {
		return nil, fmt.Errorf("Unable to parse attester certificate: %v", err)
	}
	// We assume the signature is base64-encoded as it is a string type in the 'Attestation' protobuf
	decodedSignature, err := base64.StdEncoding.DecodeString(attestation.Signature)
	if err != nil {
		return nil, fmt.Errorf("Attestation signature could not be decoded from base64: %s", err.Error())
	}
	err = validateSignature(messageBytes, cert, string(decodedSignature))
	if err != nil {
		return nil, fmt.Errorf("Unable to Validate Signature: %s", err.Error())
	}
	return cert, nil
}

// Parse 'identity.CounterAttestedMembership' object and extract structures
func parseCounterAttestedMembership(counterAttestedMembershipSerialized string) (*identity.CounterAttestedMembership, *identity.CounterAttestedMembership_AttestedMembershipSet, *common.Membership, error) {
	counterAttestedMembership, err := decodeCounterAttestedMembership(counterAttestedMembershipSerialized)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("Counter Attested Membership Unmarshal error: %s", err)
	}
	attestedMembershipSet64 := counterAttestedMembership.GetAttestedMembershipSet()
	if attestedMembershipSet64 == "" {
		return nil, nil, nil, fmt.Errorf("Attested Membership Set empty with error: %s", counterAttestedMembership.GetError())
	}
	decodedAttestedMembershipSet, err := base64.StdEncoding.DecodeString(attestedMembershipSet64)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("Attested membership set could not be decoded from base64: %s", err.Error())
	}
	var attestedMembershipSet identity.CounterAttestedMembership_AttestedMembershipSet
	err = protoV2.Unmarshal(decodedAttestedMembershipSet, &attestedMembershipSet)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("Unable to unmarshal attested membership set: %s", err.Error())
	}
	decodedForeignMembership, err := base64.StdEncoding.DecodeString(attestedMembershipSet.Membership)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("Foreign membership could not be decoded from base64: %s", err.Error())
	}
	var foreignMembership common.Membership
	err = protoV2.Unmarshal(decodedForeignMembership, &foreignMembership)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("Unable to unmarshal membership: %s", err.Error())
	}
	return counterAttestedMembership, &attestedMembershipSet, &foreignMembership, nil
}

/* Validate for each attester:
 * 1. Attestation/Signature against a message byte array
 * 2. Membership of attester in the given membership
 * 3. One attester from each member of membership
 */
func validateAttestationsList(membership *common.Membership, attestations []*identity.Attestation, messageBytes string) error {
	// Ensure authentic and valid attestations from all foreign IIN Agents
	var attestationsMap = make(map[string]bool)
	for _, attestation := range attestations {
		if attestation.UnitIdentity.SecurityDomain != membership.SecurityDomain {
			return fmt.Errorf("IIN Agent security domain %s does not match with membership security domain %s",
				attestation.UnitIdentity.SecurityDomain, membership.SecurityDomain)
		}

		// Validate Attestation
		attesterCert, err := parseAndValidateAttestation(attestation, messageBytes)
		if err != nil {
			return err
		}

		// Verify membership of attester
		err = verifyMemberInSecurityDomain2("", attesterCert, membership, attestation.UnitIdentity.MemberId)
		if err != nil {
			return fmt.Errorf("Attester with certificate %+v is not a designated IIN Agent of org %s in security domain %s: %+v",
				attesterCert, attestation.UnitIdentity.MemberId, attestation.UnitIdentity.SecurityDomain, err)
		}

		attestationsMap[attestation.UnitIdentity.MemberId] = true
	}
	for memberId := range membership.Members {
		if _, ok := attestationsMap[memberId]; !ok {
			return fmt.Errorf("Missing attestation from %s of security domain %s", memberId, membership.SecurityDomain)
		}
	}
	return nil
}

// Validate 'identity.CounterAttestedMembership' object and its embedded structures
func validateCounterAttestedMembership(s *SmartContract, ctx contractapi.TransactionContextInterface, counterAttestedMembership *identity.CounterAttestedMembership, attestedMembershipSet *identity.CounterAttestedMembership_AttestedMembershipSet, foreignMembership *common.Membership) error {
	var err error

	// Match nonces across all attestations, local and foreign
	matchedNonce := ""
	for _, attestation := range append(counterAttestedMembership.Attestations, attestedMembershipSet.Attestations...) {
		if matchedNonce == "" {
			matchedNonce = attestation.Nonce
		} else {
			if matchedNonce != attestation.Nonce {
				return fmt.Errorf("Mismatched nonces across two attestations: %s, %s", matchedNonce, attestation.Nonce)
			}
		}
	}

	// Ensure valid attestations from all local IIN Agents
	localMembershipString, err := s.GetMembershipBySecurityDomain(ctx, membershipLocalSecurityDomain)
	if err != nil {
		return err
	}
	localMembership, err := decodeMembership([]byte(localMembershipString))
	if err != nil {
		return fmt.Errorf("Failed to unmarshal membership: %s", err.Error())
	}
	err = validateAttestationsList(localMembership, counterAttestedMembership.Attestations, counterAttestedMembership.GetAttestedMembershipSet() + matchedNonce)
	if err != nil {
		return err
	}

	// Validate foreign membership cert chains
	err = validateMemberCertChains(foreignMembership)
	if err != nil {
		return err
	}

	// Ensure authentic and valid attestations from all foreign IIN Agents
	err = validateAttestationsList(foreignMembership, attestedMembershipSet.Attestations, attestedMembershipSet.Membership + matchedNonce)
	if err != nil {
		return err
	}

	return nil
}

// CreateLocalMembership cc is used to store the local security domain's Membership in the ledger
func (s *SmartContract) CreateLocalMembership(ctx contractapi.TransactionContextInterface, membershipSerialized64 string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	membership, err := decodeMembershipSerialized64(membershipSerialized64)
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}

	membershipLocalKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membershipLocalSecurityDomain})
	acp, getErr := ctx.GetStub().GetState(membershipLocalKey)
	if getErr != nil {
		return getErr
	}
	if acp != nil {
		return fmt.Errorf("Membership already exists for local membership id: %s. Use 'UpdateLocalMembership' to update.", membershipLocalSecurityDomain)
	}

	// Check if certificates chains in this membership record are valid
	err = validateMemberCertChains(membership)
	if err != nil {
		return err
	}

	fmt.Printf("Recording Local Membership with securityDomain: %s\n", membershipLocalSecurityDomain)
	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipLocalKey, membershipBytes)
}

// UpdateLocalMembership cc is used to update the existing local security domain's Membership in the ledger
func (s *SmartContract) UpdateLocalMembership(ctx contractapi.TransactionContextInterface, membershipSerialized64 string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %+v", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	membership, err := decodeMembershipSerialized64(membershipSerialized64)
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}

	membershipLocalKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membershipLocalSecurityDomain})
	_, getErr := s.GetMembershipBySecurityDomain(ctx, membershipLocalSecurityDomain)
	if getErr != nil {
		return getErr
	}

	// Check if certificates chains in this membership record are valid
	err = validateMemberCertChains(membership)
	if err != nil {
		return err
	}

	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipLocalKey, membershipBytes)

}

// CreateMembership cc is used to store a Membership in the ledger
// TODO: Remove call to 'createMembership' after creating Corda IIN Agents.
func (s *SmartContract) CreateMembership(ctx contractapi.TransactionContextInterface, counterAttestedMembershipSerialized string) error {
	// Check if the caller has IIN agent privileges
	if isIINAgent, err := wutils.IsClientIINAgent(ctx); err != nil {
		return fmt.Errorf("IIN Agent client check error: %s", err)
	} else if !isIINAgent {
		// Check if the caller has network admin privileges
		if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
			return fmt.Errorf("Admin client check error: %s", err)
		} else if !isAdmin {
			return fmt.Errorf("Caller neither a network admin nor an IIN Agent; access denied")
		}
		return createMembership(ctx, counterAttestedMembershipSerialized)		// HACK to handle unattested memberships (for Corda) for backward compatibility
	}

	// Parse the counter attested membership structure and extract the relevant objects
	counterAttestedMembership, attestedMembershipSet, foreignMembership, err := parseCounterAttestedMembership(counterAttestedMembershipSerialized)
	if err != nil {
		return err
	}

	// Check presence of membership on ledger first
	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{foreignMembership.SecurityDomain})
	acp, getErr := ctx.GetStub().GetState(membershipKey)
	if getErr != nil {
		return getErr
	}
	if acp != nil {
		return fmt.Errorf("Membership already exists for membership id: %s. Use 'UpdateMembership' to update.", foreignMembership.SecurityDomain)
	}

	// Validate the counter attested membership structure and the structures embedded in it
	err = validateCounterAttestedMembership(s, ctx, counterAttestedMembership, attestedMembershipSet, foreignMembership)
	if err != nil {
		return err
	}

	fmt.Printf("Recording Foreign Membership with securityDomain: %s\n", foreignMembership.SecurityDomain)
	membershipBytes, err := json.Marshal(foreignMembership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)
}

// createMembership is used by a network admin to store a Membership in the ledger with an unattested membership
// TODO: Remove this function after creating Corda IIN Agents. Retaining this temporarily for backward compatibility.
func createMembership(ctx contractapi.TransactionContextInterface, membershipJSON string) error {
	membership, err := decodeMembership([]byte(membershipJSON))
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}
	// Check if certificates chains in this membership record are valid
	err = validateMemberCertChains(membership)
	if err != nil {
		return err
	}

	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membership.SecurityDomain})
	acp, getErr := ctx.GetStub().GetState(membershipKey)
	if getErr != nil {
		return getErr
	}
	if acp != nil {
		return fmt.Errorf("Membership already exists for membership id: %s. Use 'UpdateMembership' to update.", membership.SecurityDomain)
	}

	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)
}

// UpdateMembership cc is used to update an existing Membership in the ledger
// TODO: Remove call to 'updateMembership' after creating Corda IIN Agents.
func (s *SmartContract) UpdateMembership(ctx contractapi.TransactionContextInterface, counterAttestedMembershipSerialized string) error {
	// Check if the caller has IIN agent privileges
	if isIINAgent, err := wutils.IsClientIINAgent(ctx); err != nil {
		return fmt.Errorf("IIN Agent client check error: %s", err)
	} else if !isIINAgent {
		// Check if the caller has network admin privileges
		if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
			return fmt.Errorf("Admin client check error: %s", err)
		} else if !isAdmin {
			return fmt.Errorf("Caller neither a network admin nor an IIN Agent; access denied")
		}
		return updateMembership(s, ctx, counterAttestedMembershipSerialized)		// HACK to handle unattested memberships (for Corda) for backward compatibility
	}

	// Parse the counter attested membership structure and extract the relevant objects
	counterAttestedMembership, attestedMembershipSet, foreignMembership, err := parseCounterAttestedMembership(counterAttestedMembershipSerialized)
	if err != nil {
		return err
	}

	// Check presence of membership on ledger first
	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{foreignMembership.SecurityDomain})
	_, getErr := s.GetMembershipBySecurityDomain(ctx, foreignMembership.SecurityDomain)
	if getErr != nil {
		return getErr
	}

	// Validate the counter attested membership structure and the structures embedded in it
	err = validateCounterAttestedMembership(s, ctx, counterAttestedMembership, attestedMembershipSet, foreignMembership)
	if err != nil {
		return err
	}

	membershipBytes, err := json.Marshal(foreignMembership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)

}

// updateMembership is used by a network admin to update an existing Membership in the ledger with an unattested membership
// TODO: Remove this function after creating Corda IIN Agents. Retaining this temporarily for backward compatibility.
func updateMembership(s *SmartContract, ctx contractapi.TransactionContextInterface, membershipJSON string) error {
	membership, err := decodeMembership([]byte(membershipJSON))
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}
	// Check if certificates chains in this membership record are valid
	err = validateMemberCertChains(membership)
	if err != nil {
		return err
	}

	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membership.SecurityDomain})
	_, getErr := s.GetMembershipBySecurityDomain(ctx, membership.SecurityDomain)
	if getErr != nil {
		return getErr
	}

	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)

}

// DeleteLocalMembership cc is used to delete the local security domain Membership in the ledger
func (s *SmartContract) DeleteLocalMembership(ctx contractapi.TransactionContextInterface) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := wutils.IsClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	membershipLocalKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membershipLocalSecurityDomain})
	bytes, err := ctx.GetStub().GetState(membershipLocalKey)
	if err != nil {
		return err
	}
	if bytes == nil {
		return fmt.Errorf("Local membership with id: %s does not exist", membershipLocalSecurityDomain)
	}
	err = ctx.GetStub().DelState(membershipLocalKey)
	if err != nil {
		return fmt.Errorf("failed to delete asset %s: %v", membershipLocalKey, err)
	}

	return nil
}

// DeleteMembership cc is used to delete an existing Membership in the ledger
func (s *SmartContract) DeleteMembership(ctx contractapi.TransactionContextInterface, membershipID string) error {
	// Check if the caller has IIN agent privileges
	if isIINAgent, err := wutils.IsClientIINAgent(ctx); err != nil {
		return fmt.Errorf("IIN Agent client check error: %s", err)
	} else if !isIINAgent {
		return fmt.Errorf("Caller not an IIN Agent; access denied")
	}

	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{membershipID})
	bytes, err := ctx.GetStub().GetState(membershipKey)
	if err != nil {
		return err
	}
	if bytes == nil {
		return fmt.Errorf("Membership with id: %s does not exist", membershipID)
	}
	err = ctx.GetStub().DelState(membershipKey)
	if err != nil {
		return fmt.Errorf("failed to delete asset %s: %v", membershipKey, err)
	}

	return nil
}

// GetMembershipBySecurityDomain cc gets the Membership for the provided id
func (s *SmartContract) GetMembershipBySecurityDomain(ctx contractapi.TransactionContextInterface, securityDomain string) (string, error) {
	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{securityDomain})
	bytes, err := ctx.GetStub().GetState(membershipKey)
	if err != nil {
		return "", err
	}
	if bytes == nil {
		return "", fmt.Errorf("Membership with id: %s does not exist", securityDomain)
	}

	return string(bytes), nil

}

// verifyMemberInSecurityDomain function verifies the identity of the requester according to
// the Membership for the external network the request originated from.
// This takes a certificate encoded in PEM format as argument.
// It assumes that the relevant membership info is on the ledger.
func verifyMemberInSecurityDomain(s *SmartContract, ctx contractapi.TransactionContextInterface, certPEM string, securityDomain string, requestingOrg string) error {
	cert, err := parseCert(certPEM)
	if err != nil {
		return fmt.Errorf("Unable to parse certificate: %s", err.Error())
	}
	return verifyMemberInSecurityDomain1(s, ctx, certPEM, cert, securityDomain, requestingOrg)
}

// verifyMemberInSecurityDomain1 function verifies the identity of the requester according to
// the Membership for the external network the request originated from.
// This takes a decoded X.509 certificate as argument (and optionally the certificate in PEM format too).
// It assumes that the relevant membership info is on the ledger.
func verifyMemberInSecurityDomain1(s *SmartContract, ctx contractapi.TransactionContextInterface, certPEM string, cert *x509.Certificate, securityDomain string, requestingOrg string) error {
	membershipString, err := s.GetMembershipBySecurityDomain(ctx, securityDomain)
	if err != nil {
		return err
	}
	membership, err := decodeMembership([]byte(membershipString))
	if err != nil {
		return fmt.Errorf("Failed to unmarshal membership: %s", err.Error())
	}
	return verifyMemberInSecurityDomain2(certPEM, cert, membership, requestingOrg)
}

// verifyMemberInSecurityDomain2 function verifies the identity of the requester according to
// the Membership for the external network the request originated from.
// This takes a decoded X.509 certificate as argument (and optionally the certificate in PEM format too).
// It takes a membership structure as argument.
func verifyMemberInSecurityDomain2(certPEM string, cert *x509.Certificate, membership *common.Membership, requestingOrg string) error {
	err := isCertificateWithinExpiry(cert)
	if err != nil {
		return err
	}
	member, ok := membership.Members[requestingOrg]
	if ok == false {
		return fmt.Errorf("Member does not exist for org: %s", requestingOrg)
	}
	switch member.Type {
	case "ca":
		if member.Value == "" {
			return fmt.Errorf("CA member certificate is blank")
		}
		if certPEM != member.Value {	// The CA is automatically a member of the security domain
			err := verifyCaCertificate(cert, member.Value)
			if err != nil {
				return err
			}
		}
	case "certificate":
		chain := member.Chain
		if len(chain) == 0 {
			chain = []string{member.Value}
		}
		err := verifyCertificateChain(cert, chain)
		if err != nil {
			return err
		}
	default:
		return fmt.Errorf("Certificate type not supported: %s", member.Type)
	}
	return nil
}
