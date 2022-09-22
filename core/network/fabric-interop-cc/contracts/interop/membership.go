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
	"encoding/pem"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/identity"
	protoV2 "google.golang.org/protobuf/proto"
)

const membershipObjectType = "membership"
const membershipLocalSecurityDomain = "local-security-domain"

// Check if the calling client has an attribute in its signing certificate indicating that it is a privileged network administrator
//func isClientNetworkAdmin(stub shim.ChaincodeStubInterface) (bool, error) {
func isClientNetworkAdmin(ctx contractapi.TransactionContextInterface) (bool, error) {
	// check if caller certificate has the attribute "network-admin"
	// we don't care about the actual value of the attribute for now
	_, ok, err := ctx.GetClientIdentity().GetAttributeValue("network-admin")
	return ok, err
}

// Check if the calling client has an IIN Agent attribute in its signing certificate
//func isClientIINAgent(stub shim.ChaincodeStubInterface) (bool, error) {
func isClientIINAgent(ctx contractapi.TransactionContextInterface) (bool, error) {
	// check if caller certificate has the attribute "iin-agent"
	// we don't care about the actual value of the attribute for now
	_, ok, err := ctx.GetClientIdentity().GetAttributeValue("iin-agent")
	return ok, err
}

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

// Check whether the given user certificate belongs to the given security domain membership
func checkUserInMembership(userCert *x509.Certificate, membership *common.Membership) error {
	for _, member := range membership.Members {
		if member.Type == "ca" && member.Value != "" {
			decodedCACert, _ := pem.Decode([]byte(member.Value))
			if decodedCACert == nil {
				fmt.Printf("Unable to decode CA cert PEM: %s\n", member.Value)
			}
			caCert, err := x509.ParseCertificate(decodedCACert.Bytes)
			if err != nil {
				fmt.Printf("Unable to parse CA certificate: %s\n", member.Value)
			}
			err = validateCertificateUsingCA(userCert, caCert, true)
			if err == nil {
				return nil
			}
		} else if member.Type == "certificate" && len(member.Chain) > 0 {
			err := verifyCertificateChain(userCert, member.Chain)
			if err == nil {
				return nil
			}
		} else {
			fmt.Printf("Invalid member info: %+v\n", member)
		}
	}
	return fmt.Errorf("User cert %+v could not be validated against any CA certificate chain in membership %+v", userCert, membership)
}

// Validate 'identity.Attestation' object against a message byte array
func validateAttestation(attestation *identity.Attestation, messageBytes []byte) error {
	// Parse local IIN Agent's certificate
	certDecoded, _ := pem.Decode([]byte(attestation.Certificate))
	if certDecoded == nil {
		fmt.Printf("Unable to decode cert PEM: %s\n", attestation.Certificate)
	}
	cert, err := x509.ParseCertificate(certDecoded.Bytes)
	if err != nil {
		fmt.Printf("Unable to parse certificate: %s\n", attestation.Certificate)
	}
	// We assume the signature is base64-encoded as it is a string type in the 'Attestation' protobuf
	decodedSignature, err := base64.StdEncoding.DecodeString(attestation.Signature)
	if err != nil {
		return fmt.Errorf("Attestation signature could not be decoded from base64: %s", err.Error())
	}
	err = validateSignature(string(messageBytes), cert, string(decodedSignature))
	if err != nil {
		return fmt.Errorf("Unable to Validate Signature: %s", err.Error())
	}
	return nil
}

// CreateLocalMembership cc is used to store the local security domain's Membership in the ledger
func (s *SmartContract) CreateLocalMembership(ctx contractapi.TransactionContextInterface, membershipJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := isClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %s", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	membership, err := decodeMembership([]byte(membershipJSON))
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

	membershipBytes, err := json.Marshal(membership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipLocalKey, membershipBytes)
}

// UpdateLocalMembership cc is used to update the existing local security domain's Membership in the ledger
func (s *SmartContract) UpdateLocalMembership(ctx contractapi.TransactionContextInterface, membershipJSON string) error {
	// Check if the caller has network admin privileges
	if isAdmin, err := isClientNetworkAdmin(ctx); err != nil {
		return fmt.Errorf("Admin client check error: %+v", err)
	} else if !isAdmin {
		return fmt.Errorf("Caller not a network admin; access denied")
	}

	membership, err := decodeMembership([]byte(membershipJSON))
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
	if isIINAgent, err := isClientIINAgent(ctx); err != nil {
		return fmt.Errorf("IIN Agent client check error: %s", err)
	} else if !isIINAgent {
		// Check if the caller has network admin privileges
		if isAdmin, err := isClientNetworkAdmin(ctx); err != nil {
			return fmt.Errorf("Admin client check error: %s", err)
		} else if !isAdmin {
			return fmt.Errorf("Caller neither a network admin nor an IIN Agent; access denied")
		}
		return s.createMembership(ctx, counterAttestedMembershipSerialized)		// HACK to handle unattested memberships (for Corda) for backward compatibility
	}

	// Check if caller is one of the authorized IIN agents
	membershipLocal, err := s.GetMembershipBySecurityDomain(ctx, membershipLocalSecurityDomain)
	if err != nil {
		return err
	}
	membershipLocalDecoded, err := decodeMembership([]byte(membershipLocal))
	if err != nil {
		return fmt.Errorf("Local Membership JSON Unmarshal error: %s", err)
	}
	callerId := ctx.GetClientIdentity()
	callerCert, err := callerId.GetX509Certificate()
	if err != nil {
		return err
	}
	err = checkUserInMembership(callerCert, membershipLocalDecoded)
	if err != nil {
		return fmt.Errorf("Caller with identity %+v is not a designated IIN Agent: %+v", callerId, err)
	}

	counterAttestedMembership, err := decodeCounterAttestedMembership(counterAttestedMembershipSerialized)
	if err != nil {
		return fmt.Errorf("Counter Attested Membership Unmarshal error: %s", err)
	}
	decodedAttestedMembershipSet, err := base64.StdEncoding.DecodeString(string(counterAttestedMembership.AttestedMembershipSet))
	if err != nil {
		return fmt.Errorf("Attested membership set could not be decoded from base64: %s", err.Error())
	}
	var attestedMembershipSet identity.CounterAttestedMembership_AttestedMembershipSet
	err = protoV2.Unmarshal(decodedAttestedMembershipSet, &attestedMembershipSet)
	if err != nil {
		return fmt.Errorf("Unable to unmarshal attested membership set: %s", err.Error())
	}
	decodedForeignMembership, err := base64.StdEncoding.DecodeString(string(attestedMembershipSet.Membership))
	if err != nil {
		return fmt.Errorf("Foreign membership could not be decoded from base64: %s", err.Error())
	}
	var foreignMembership common.Membership
	err = protoV2.Unmarshal(decodedForeignMembership, &foreignMembership)
	if err != nil {
		return fmt.Errorf("Unable to unmarshal membership: %s", err.Error())
	}

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
	for _, attestation := range counterAttestedMembership.Attestations {
		err = validateAttestation(attestation, append(counterAttestedMembership.AttestedMembershipSet, attestation.Nonce...))
		if err != nil {
			return err
		}
	}

	// Validate foreign membership cert chains
	err = validateMemberCertChains(&foreignMembership)
	if err != nil {
		return err
	}

	// Ensure authentic and valid attestations from all foreign IIN Agents
	for _, attestation := range attestedMembershipSet.Attestations {
		if attestation.UnitIdentity.SecurityDomain != foreignMembership.SecurityDomain {
			return fmt.Errorf("Foreign agent security domain %s does not match attested membership security domain %s",
				attestation.UnitIdentity.SecurityDomain, foreignMembership.SecurityDomain)
		}
		foundMemberMatch := false
		for _, member := range foreignMembership.Members {
			var isSignerRoot bool
			var leafCertPEM string
			if member.Type == "ca" {
				leafCertPEM = member.Value
				isSignerRoot = true
			} else if member.Type == "certificate" {
				leafCertPEM = member.Chain[len(member.Chain) - 1]
				isSignerRoot = (len(member.Chain) == 1)
			}
			attesterCert, err := parseCert(attestation.Certificate)
			if err != nil {
				continue
			}
			leafCert, err := parseCert(leafCertPEM)
			if err != nil {
				continue
			}
			err = validateCertificateUsingCA(attesterCert, leafCert, isSignerRoot)
			if err == nil {
				foundMemberMatch = true
				break
			}
		}
		if !foundMemberMatch {
			return fmt.Errorf("No matching member certificate chain found for attester")
		}
		// Validate signature
		err = validateAttestation(attestation, append(attestedMembershipSet.Membership, attestation.Nonce...))
		if err != nil {
			return err
		}
	}

	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{foreignMembership.SecurityDomain})
	acp, getErr := ctx.GetStub().GetState(membershipKey)
	if getErr != nil {
		return getErr
	}
	if acp != nil {
		return fmt.Errorf("Membership already exists for membership id: %s. Use 'UpdateMembership' to update.", foreignMembership.SecurityDomain)
	}

	membershipBytes, err := json.Marshal(foreignMembership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)
}

// createMembership is used by a network admin to store a Membership in the ledger with an unattested membership
// TODO: Remove this function after creating Corda IIN Agents. Retaining this temporarily for backward compatibility.
func (s *SmartContract) createMembership(ctx contractapi.TransactionContextInterface, membershipJSON string) error {
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
	if isIINAgent, err := isClientIINAgent(ctx); err != nil {
		return fmt.Errorf("IIN Agent client check error: %s", err)
	} else if !isIINAgent {
		// Check if the caller has network admin privileges
		if isAdmin, err := isClientNetworkAdmin(ctx); err != nil {
			return fmt.Errorf("Admin client check error: %s", err)
		} else if !isAdmin {
			return fmt.Errorf("Caller neither a network admin nor an IIN Agent; access denied")
		}
		return s.updateMembership(ctx, counterAttestedMembershipSerialized)		// HACK to handle unattested memberships (for Corda) for backward compatibility
	}

	// Check if caller is one of the authorized IIN agents
	membershipLocal, err := s.GetMembershipBySecurityDomain(ctx, membershipLocalSecurityDomain)
	if err != nil {
		return err
	}
	membershipLocalDecoded, err := decodeMembership([]byte(membershipLocal))
	if err != nil {
		return fmt.Errorf("Unmarshal error: %s", err)
	}
	callerId := ctx.GetClientIdentity()
	callerCert, err := callerId.GetX509Certificate()
	if err != nil {
		return err
	}
	err = checkUserInMembership(callerCert, membershipLocalDecoded)
	if err != nil {
		return fmt.Errorf("Caller with identity %+v is not a designated IIN Agent: %+v", callerId, err)
	}

	counterAttestedMembership, err := decodeCounterAttestedMembership(counterAttestedMembershipSerialized)
	if err != nil {
		return fmt.Errorf("Counter Attested Membership Unmarshal error: %s", err)
	}
	decodedAttestedMembershipSet, err := base64.StdEncoding.DecodeString(string(counterAttestedMembership.AttestedMembershipSet))
	if err != nil {
		return fmt.Errorf("Attested membership set could not be decoded from base64: %s", err.Error())
	}
	var attestedMembershipSet identity.CounterAttestedMembership_AttestedMembershipSet
	err = protoV2.Unmarshal(decodedAttestedMembershipSet, &attestedMembershipSet)
	if err != nil {
		return fmt.Errorf("Unable to unmarshal attested membership set: %s", err.Error())
	}
	decodedForeignMembership, err := base64.StdEncoding.DecodeString(string(attestedMembershipSet.Membership))
	if err != nil {
		return fmt.Errorf("Foreign membership could not be decoded from base64: %s", err.Error())
	}
	var foreignMembership common.Membership
	err = protoV2.Unmarshal(decodedForeignMembership, &foreignMembership)
	if err != nil {
		return fmt.Errorf("Unable to unmarshal membership: %s", err.Error())
	}

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
	for _, attestation := range counterAttestedMembership.Attestations {
		err = validateAttestation(attestation, append(counterAttestedMembership.AttestedMembershipSet, attestation.Nonce...))
		if err != nil {
			return err
		}
	}

	// Validate foreign membership cert chains
	err = validateMemberCertChains(&foreignMembership)
	if err != nil {
		return err
	}

	// Ensure authentic and valid attestations from all foreign IIN Agents
	for _, attestation := range attestedMembershipSet.Attestations {
		if attestation.UnitIdentity.SecurityDomain != foreignMembership.SecurityDomain {
			return fmt.Errorf("Foreign agent security domain %s does not match attested membership security domain %s",
				attestation.UnitIdentity.SecurityDomain, foreignMembership.SecurityDomain)
		}
		foundMemberMatch := false
		for _, member := range foreignMembership.Members {
			var isSignerRoot bool
			var leafCertPEM string
			if member.Type == "ca" {
				leafCertPEM = member.Value
				isSignerRoot = true
			} else if member.Type == "certificate" {
				leafCertPEM = member.Chain[len(member.Chain) - 1]
				isSignerRoot = (len(member.Chain) == 1)
			}
			attesterCert, err := parseCert(attestation.Certificate)
			if err != nil {
				continue
			}
			leafCert, err := parseCert(leafCertPEM)
			if err != nil {
				continue
			}
			err = validateCertificateUsingCA(attesterCert, leafCert, isSignerRoot)
			if err == nil {
				foundMemberMatch = true
				break
			}
		}
		if !foundMemberMatch {
			return fmt.Errorf("No matching member certificate chain found for attester")
		}
		// Validate signature
		err = validateAttestation(attestation, append(attestedMembershipSet.Membership, attestation.Nonce...))
		if err != nil {
			return err
		}
	}

	membershipKey, err := ctx.GetStub().CreateCompositeKey(membershipObjectType, []string{foreignMembership.SecurityDomain})
	_, getErr := s.GetMembershipBySecurityDomain(ctx, foreignMembership.SecurityDomain)
	if getErr != nil {
		return getErr
	}

	membershipBytes, err := json.Marshal(foreignMembership)
	if err != nil {
		return fmt.Errorf("Marshal error: %s", err)
	}
	return ctx.GetStub().PutState(membershipKey, membershipBytes)

}

// updateMembership is used by a network admin to update an existing Membership in the ledger with an unattested membership
// TODO: Remove this function after creating Corda IIN Agents. Retaining this temporarily for backward compatibility.
func (s *SmartContract) updateMembership(ctx contractapi.TransactionContextInterface, membershipJSON string) error {
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
	if isAdmin, err := isClientNetworkAdmin(ctx); err != nil {
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
	if isIINAgent, err := isClientIINAgent(ctx); err != nil {
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
func verifyMemberInSecurityDomain(s *SmartContract, ctx contractapi.TransactionContextInterface, certPEM string, securityDomain string, requestingOrg string) error {
	cert, err := parseCert(certPEM)
	if err != nil {
		return fmt.Errorf("Unable to parse certificate: %s", err.Error())
	}
	err = isCertificateWithinExpiry(cert)
	if err != nil {
		return err
	}
	membershipString, err := s.GetMembershipBySecurityDomain(ctx, securityDomain)
	if err != nil {
		return err
	}
	membership, err := decodeMembership([]byte(membershipString))
	if err != nil {
		return fmt.Errorf("Failed to unmarshal membership: %s", err.Error())
	}
	member, ok := membership.Members[requestingOrg]
	if ok == false {
		return fmt.Errorf("Member does not exist for org: %s", requestingOrg)
	}
	switch member.Type {
	case "ca":
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
