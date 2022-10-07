/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/mocks"
	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/identity"
	protoV2 "google.golang.org/protobuf/proto"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

var securityDomainId = "2345"
var foreignMemberId1 = "foreign-member1"
var foreignMemberId2 = "foreign-member2"
var localSecurityDomainId = "6789"
var localMemberId1 = "local-member1"
var localMemberId2 = "local-member2"
var nonce = "nonce"

func getMembership() (common.Member, common.Member) {
	member1 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: []string{"chain1"},
	}

	member2 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: []string{"chain2"},
	}

	return member1, member2
}

func publicKey(priv interface{}) interface{} {
	switch k := priv.(type) {
	case *rsa.PrivateKey:
		return &k.PublicKey
	case *ecdsa.PrivateKey:
		return &k.PublicKey
	default:
		return nil
	}
}

func createX509Certificate(caCert *x509.Certificate, caCertPrivKey *ecdsa.PrivateKey) ([]byte, *ecdsa.PrivateKey, error) {
	var priv, privKey interface{}
	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate serial number: %s", err)
	}
	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Hyperledger"},
		},
		NotBefore:			   time.Now(),
		NotAfter:			   time.Now().AddDate(1, 0, 0),		// 1 year expiry duration
		KeyUsage:			   x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:		   []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		SignatureAlgorithm:    x509.ECDSAWithSHA384,
		//SignatureAlgorithm:	 x509.ECDSAWithSHA256,
	}
	priv, err = ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	//priv, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if caCertPrivKey == nil {
		privKey = priv
	} else {
		privKey = caCertPrivKey
	}
	var newCertBytes []byte
	// the 'x509.CreateCertificate' function returns the certificate data in asn1 form.
	if caCert == nil {
		newCertBytes, err = x509.CreateCertificate(rand.Reader, &template, &template, publicKey(priv), privKey)
	} else {
		newCertBytes, err = x509.CreateCertificate(rand.Reader, &template, caCert, publicKey(priv), privKey)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create certificate: %s", err)
	}

	return newCertBytes, priv.(*ecdsa.PrivateKey), err
}

func x509CertToPem(certBytes []byte) (string, error) {
	certBlock := &pem.Block{ Type: "CERTIFICATE", Bytes: certBytes }
	var certBuf bytes.Buffer
	err := pem.Encode(&certBuf, certBlock)
	if err != nil {
		return "", fmt.Errorf("failed to encode in PEM format: %s", err)
	}
	return certBuf.String(), err
}

func generateCertChain(length int) ([]string, []*ecdsa.PrivateKey, error) {
	var certChain = make([]string, length)
	var keyChain = make([]*ecdsa.PrivateKey, length)
	caCertBytes, caKey, err := createX509Certificate(nil, nil)
	keyChain[0] = caKey
	if err != nil {
		return []string{}, []*ecdsa.PrivateKey{}, err
	}
	caCert, _ := x509.ParseCertificate(caCertBytes)
	certChain[0], err = x509CertToPem(caCertBytes)
	if err != nil {
		return []string{}, []*ecdsa.PrivateKey{}, err
	}
	for i := 1; i < length; i++ {
		certBytes, key, err := createX509Certificate(caCert, caKey)
		if err != nil {
			return []string{}, []*ecdsa.PrivateKey{}, err
		}
		caKey = key
		keyChain[i] = key
		caCert, _ = x509.ParseCertificate(certBytes)
		certChain[i], err = x509CertToPem(certBytes)
		if err != nil {
			return []string{}, []*ecdsa.PrivateKey{}, err
		}
	}
	return certChain, keyChain, nil
}

func TestGetMembershipBySecurityDomain(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ "member1": &member1, "member2": &member2},
	}

	// Case when no Membership is found
	acString, getError := interopcc.GetMembershipBySecurityDomain(ctx, securityDomainId)
	require.EqualError(t, getError, fmt.Sprintf("Membership with id: %s does not exist", securityDomainId))
	require.Equal(t, acString, "")
	value, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(value, nil)
	// Case when Membership is found
	assetRead, err := interopcc.GetMembershipBySecurityDomain(ctx, securityDomainId)
	require.NoError(t, err)
	require.Equal(t, assetRead, string(value))
}

func setClientAdmin(attr string) (string, bool, error) {
	if attr == "network-admin" {
		return "", true, nil
	} else {
		return "", false, nil
	}
}

func setClientIINAgent(attr string) (string, bool, error) {
	if attr == "iin-agent" {
		return "", true, nil
	} else {
		return "", false, nil
	}
}

func TestCreateLocalMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ "member1": &member1, "member2": &member2},
	}

	membershipBytes, err := protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 := base64.StdEncoding.EncodeToString(membershipBytes)

	// Case when caller is not an admin
	err = interopcc.CreateLocalMembership(ctx, membershipSerialized64)
	require.EqualError(t, err, "Caller not a network admin; access denied")
	// Case when no Membership is found
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateLocalMembership(ctx, membershipSerialized64)
	require.NoError(t, err)

	// Valid cert chain
	member := &member1
	member.Chain, _, _ = generateCertChain(3)
	membershipBytes, err = json.Marshal(&membershipAsset)
	require.NoError(t, err)
	err = interopcc.CreateLocalMembership(ctx, membershipSerialized64)
	require.NoError(t, err)

	// Invalid cert chain
	cert_0 := member.Chain[0]
	member.Chain[0] = member.Chain[2]
	member.Chain[2] = cert_0
	membershipBytes, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 = base64.StdEncoding.EncodeToString(membershipBytes)
	err = interopcc.CreateLocalMembership(ctx, membershipSerialized64)
	require.Error(t, err)

	// Invalid Input check
	cert_0 = member.Chain[0]
	member.Chain[0] = member.Chain[2]
	member.Chain[2] = cert_0
	membershipBytes, err = json.Marshal(&membershipAsset)
	require.NoError(t, err)
	err = interopcc.CreateLocalMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: Unable to unmarshal membership serialized proto"))
	// Membership already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.CreateLocalMembership(ctx, membershipSerialized64)
	require.EqualError(t, err, fmt.Sprintf("Membership already exists for local membership id: %s. Use 'UpdateLocalMembership' to update.", membershipLocalSecurityDomain))
}

func TestUpdateLocalMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ "member1": &member1, "member2": &member2},
	}
	
	membershipBytes, err := protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 := base64.StdEncoding.EncodeToString(membershipBytes)
	membershipJsonBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)

	// Case when caller is not an admin
	err = interopcc.UpdateLocalMembership(ctx, membershipSerialized64)
	require.EqualError(t, err, "Caller not a network admin; access denied")
	// Case when no Membership is found
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.UpdateLocalMembership(ctx, membershipSerialized64)
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", membershipLocalSecurityDomain))

	// Valid cert chain
	member := &member1
	member.Chain, _, _ = generateCertChain(3)
	membershipBytes, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 = base64.StdEncoding.EncodeToString(membershipBytes)
	err = interopcc.UpdateLocalMembership(ctx, membershipSerialized64)
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", membershipLocalSecurityDomain))

	// Membership already exists update the Membership
	chaincodeStub.GetStateReturns(membershipJsonBytes, nil)
	err = interopcc.UpdateLocalMembership(ctx, membershipSerialized64)
	require.NoError(t, err)

	// Invalid cert chain
	cert_0 := member.Chain[0]
	member.Chain[0] = member.Chain[2]
	member.Chain[2] = cert_0
	membershipBytes, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 = base64.StdEncoding.EncodeToString(membershipBytes)
	err = interopcc.UpdateLocalMembership(ctx, membershipSerialized64)
	require.Error(t, err)

	// Invalid Input check
	cert_0 = member.Chain[0]
	member.Chain[0] = member.Chain[2]
	member.Chain[2] = cert_0
	membershipBytes, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipSerialized64 = base64.StdEncoding.EncodeToString(membershipBytes)
	membershipBytes, err = json.Marshal(&membershipAsset)
	require.NoError(t, err)
	err = interopcc.UpdateLocalMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: Unable to unmarshal membership serialized proto"))
}

// TODO: Remove later. Keeping for backward compatibility.
func TestCreateMembershipUnattested(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ "member1": &member1, "member2": &member2},
	}

	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)

	// Case when caller is not an admin
	err = interopcc.CreateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, "Caller neither a network admin nor an IIN Agent; access denied")
	// Case when no Membership is found
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateMembership(ctx, string(membershipBytes))
	require.NoError(t, err)
	// Invalid Input check
	err = interopcc.CreateMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))
	// Membership already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.CreateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, fmt.Sprintf("Membership already exists for membership id: %s. Use 'UpdateMembership' to update.", membershipAsset.SecurityDomain))
}

func TestCreateMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ foreignMemberId1: &member1, foreignMemberId2: &member2},
	}

	// Generate foreign network member 1 CA structure and client credentials
	certChain1, keys1, _ := generateCertChain(3)
	member1.Chain = certChain1
	decodedCert1, _ := pem.Decode([]byte(member1.Chain[2]))
	cert1, _ := x509.ParseCertificate(decodedCert1.Bytes)
	certBytes1, key1, err := createX509Certificate(cert1, keys1[2])
	certPem1, _ := x509CertToPem(certBytes1)
	attestation1 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: securityDomainId,
			MemberId: foreignMemberId1,
		},
		Certificate: certPem1,
		Signature: "",
		Nonce: nonce,
	}
	// Generate foreign network member 2 CA structure and client credentials
	certChain2, keys2, _ := generateCertChain(3)
	member2.Chain = certChain2
	decodedCert2, _ := pem.Decode([]byte(member2.Chain[2]))
	cert2, _ := x509.ParseCertificate(decodedCert2.Bytes)
	certBytes2, key2, err := createX509Certificate(cert2, keys2[2])
	certPem2, _ := x509CertToPem(certBytes2)
	attestation2 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: securityDomainId,
			MemberId: foreignMemberId2,
		},
		Certificate: certPem2,
		Signature: "",
		Nonce: nonce,
	}
	// Marshal membership for signature
	membershipBytesPlain, err := protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr := base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce := []byte(membershipBytesStr + nonce)
	// Generate member 2 attestation
	random1 := rand.Reader
	hashed1, err := computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err := ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	// Generate member 2 attestation
	random2 := rand.Reader
	hashed2, err := computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err := ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	// Generate attested foreign membership
	attestedMembershipSet := identity.CounterAttestedMembership_AttestedMembershipSet {
		Membership:    membershipBytesStr,
		Attestations:  []*identity.Attestation{&attestation1, &attestation2},
	}

	// Generate local members
	localCertChain1, localKeyChain1, _ := generateCertChain(3)
	localMember1 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: localCertChain1,
	}
	localCertChain2, localKeyChain2, _ := generateCertChain(3)
	localMember2 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: localCertChain2,
	}
	localMembershipAsset := common.Membership{
		SecurityDomain: localSecurityDomainId,
		Members:		map[string]*common.Member{ localMemberId1: &localMember1, localMemberId2: &localMember2},
	}

	// Generate local attesters
	decodedLocalCert1, _ := pem.Decode([]byte(localCertChain1[2]))
	certLocal1, _ := x509.ParseCertificate(decodedLocalCert1.Bytes)
	certLocalBytes1, keyLocal1, err := createX509Certificate(certLocal1, localKeyChain1[2])
	certLocalPem1, _ := x509CertToPem(certLocalBytes1)
	attestationLocal1 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: localSecurityDomainId,
			MemberId: localMemberId1,
		},
		Certificate: certLocalPem1,
		Signature: "",
		Nonce: nonce,
	}
	decodedLocalCert2, _ := pem.Decode([]byte(localCertChain2[2]))
	certLocal2, _ := x509.ParseCertificate(decodedLocalCert2.Bytes)
	certLocalBytes2, keyLocal2, err := createX509Certificate(certLocal2, localKeyChain2[2])
	certLocalPem2, _ := x509CertToPem(certLocalBytes2)
	attestationLocal2 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: localSecurityDomainId,
			MemberId: localMemberId2,
		},
		Certificate: certLocalPem2,
		Signature: "",
		Nonce: nonce,
	}
	// Marshal attested membership set for signature
	attestedMembershipSetBytesPlain, err := protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr := base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce := []byte(attestedMembershipSetBytesStr + nonce)
	// Generate member 2 attestation
	randomLocal1 := rand.Reader
	hashedLocal1, err := computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err := ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	// Generate member 2 attestation
	randomLocal2 := rand.Reader
	hashedLocal2, err := computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err := ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	// Generate counter attested foreign membership
	counterAttestedMembership := identity.CounterAttestedMembership{
		Response: &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr},
		Attestations: []*identity.Attestation{&attestationLocal1, &attestationLocal2},
	}

	// Record membership info: should fail because the caller is not an IIN Agent
	counterAttestedMembershipBytesPlain, err := protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes := base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Caller neither a network admin nor an IIN Agent; access denied")

	// Record local membership info
	clientIdentity := &mocks.ClientIdentity{}
	localMembershipBytes, err := protoV2.Marshal(&localMembershipAsset)
	require.NoError(t, err)
	localMembershipSerialized64 := base64.StdEncoding.EncodeToString(localMembershipBytes)
	localMembershipJsonBytes, err := json.Marshal(&localMembershipAsset)
	require.NoError(t, err)
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateLocalMembership(ctx, string(localMembershipSerialized64))
	require.NoError(t, err)

	// Record membership info: should succeed now
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(2, localMembershipJsonBytes, nil)
	clientIdentity.GetAttributeValueCalls(setClientIINAgent)
	certLocalAgent2, _ := x509.ParseCertificate(certLocalBytes2)
	clientIdentity.GetX509CertificateReturns(certLocalAgent2, nil)
	clientIdentity.GetMSPIDReturns(localMemberId2, nil)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.NoError(t, err)

	// Record membership info again: should fail because membership has already been recorded against this security domain
	chaincodeStub.GetStateReturnsOnCall(3, []byte{}, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("Membership already exists for membership id: %s. Use 'UpdateMembership' to update.", membershipAsset.SecurityDomain))

	// One of the local signatures is invalid: should fail
	hashedLocal2, err = computeSHA2Hash([]byte("invalid"), keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(4, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(5, localMembershipJsonBytes, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Unable to Validate Signature: Signature Verification failed. ECDSA VERIFY")

	// One of the foreign signatures is invalid: should fail
	hashed2, err = computeSHA2Hash([]byte("invalid"), key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(6, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(7, localMembershipJsonBytes, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Unable to Validate Signature: Signature Verification failed. ECDSA VERIFY")

	// One of the foreign attestations has an invalid nonce: should fail
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestation1.Nonce = "invalid-nonce"
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(8, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(9, localMembershipJsonBytes, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("Mismatched nonces across two attestations: %s, %s", nonce, attestation1.Nonce))

	// Foreign membership has an invalid cert chain: should fail
	attestation1.Nonce = nonce
	tmpCert := member1.Chain[0]
	member1.Chain[0] = member1.Chain[1]
	member1.Chain[1] = tmpCert
	membershipBytesPlain, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr = base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce = []byte(membershipBytesStr + nonce)
	hashed1, err = computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err = ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSet.Membership = membershipBytesStr
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(10, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(11, localMembershipJsonBytes, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.Error(t, err)

	// Foreign attestation has invalid security domain: should fail
	tmpCert = member1.Chain[0]
	member1.Chain[0] = member1.Chain[1]
	member1.Chain[1] = tmpCert
	membershipAsset.SecurityDomain = "invalid"
	membershipBytesPlain, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr = base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce = []byte(membershipBytesStr + nonce)
	hashed1, err = computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err = ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSet.Membership = membershipBytesStr
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(12, nil, nil)
	chaincodeStub.GetStateReturnsOnCall(13, localMembershipJsonBytes, nil)
	err = interopcc.CreateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("IIN Agent security domain %s does not match with membership security domain invalid", securityDomainId))
}

// TODO: Remove later. Keeping for backward compatibility.
func TestUpdateMembershipUnattested(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ "member1": &member1, "member2": &member2},
	}

	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)

	// Case when caller is not an admin
	err = interopcc.UpdateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, "Caller neither a network admin nor an IIN Agent; access denied")
	// Case when no Membership is found
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.UpdateMembership(ctx, string(membershipBytes))
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", membershipAsset.SecurityDomain))
	// Invalid Input check
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.UpdateMembership(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unmarshal error: invalid character 'I' looking for beginning of value"))
	// Membership already exists; Update it
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.UpdateMembership(ctx, string(membershipBytes))
	require.NoError(t, err)
}

func TestUpdateMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	member1, member2 := getMembership()
	membershipAsset := common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{ foreignMemberId1: &member1, foreignMemberId2: &member2},
	}

	// Generate foreign network member 1 CA structure and client credentials
	certChain1, keys1, _ := generateCertChain(3)
	member1.Chain = certChain1
	decodedCert1, _ := pem.Decode([]byte(member1.Chain[2]))
	cert1, _ := x509.ParseCertificate(decodedCert1.Bytes)
	certBytes1, key1, err := createX509Certificate(cert1, keys1[2])
	certPem1, _ := x509CertToPem(certBytes1)
	attestation1 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: securityDomainId,
			MemberId: foreignMemberId1,
		},
		Certificate: certPem1,
		Signature: "",
		Nonce: nonce,
	}
	// Generate foreign network member 2 CA structure and client credentials
	certChain2, keys2, _ := generateCertChain(3)
	member2.Chain = certChain2
	decodedCert2, _ := pem.Decode([]byte(member2.Chain[2]))
	cert2, _ := x509.ParseCertificate(decodedCert2.Bytes)
	certBytes2, key2, err := createX509Certificate(cert2, keys2[2])
	certPem2, _ := x509CertToPem(certBytes2)
	attestation2 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: securityDomainId,
			MemberId: foreignMemberId2,
		},
		Certificate: certPem2,
		Signature: "",
		Nonce: nonce,
	}
	// Marshal membership for signature
	membershipBytesPlain, err := protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr := base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce := []byte(membershipBytesStr + nonce)
	// Generate member 2 attestation
	random1 := rand.Reader
	hashed1, err := computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err := ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	// Generate member 2 attestation
	random2 := rand.Reader
	hashed2, err := computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err := ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	// Generate attested foreign membership
	attestedMembershipSet := identity.CounterAttestedMembership_AttestedMembershipSet {
		Membership:    membershipBytesStr,
		Attestations:  []*identity.Attestation{&attestation1, &attestation2},
	}

	// Generate local members
	localCertChain1, localKeyChain1, _ := generateCertChain(3)
	localMember1 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: localCertChain1,
	}
	localCertChain2, localKeyChain2, _ := generateCertChain(3)
	localMember2 := common.Member{
		Value: "",
		Type:  "certificate",
		Chain: localCertChain2,
	}
	localMembershipAsset := common.Membership{
		SecurityDomain: localSecurityDomainId,
		Members:		map[string]*common.Member{ localMemberId1: &localMember1, localMemberId2: &localMember2},
	}

	// Generate local attesters
	decodedLocalCert1, _ := pem.Decode([]byte(localCertChain1[2]))
	certLocal1, _ := x509.ParseCertificate(decodedLocalCert1.Bytes)
	certLocalBytes1, keyLocal1, err := createX509Certificate(certLocal1, localKeyChain1[2])
	certLocalPem1, _ := x509CertToPem(certLocalBytes1)
	attestationLocal1 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: localSecurityDomainId,
			MemberId: localMemberId1,
		},
		Certificate: certLocalPem1,
		Signature: "",
		Nonce: nonce,
	}
	decodedLocalCert2, _ := pem.Decode([]byte(localCertChain2[2]))
	certLocal2, _ := x509.ParseCertificate(decodedLocalCert2.Bytes)
	certLocalBytes2, keyLocal2, err := createX509Certificate(certLocal2, localKeyChain2[2])
	certLocalPem2, _ := x509CertToPem(certLocalBytes2)
	attestationLocal2 := identity.Attestation {
		UnitIdentity: &identity.SecurityDomainMemberIdentity {
			SecurityDomain: localSecurityDomainId,
			MemberId: localMemberId2,
		},
		Certificate: certLocalPem2,
		Signature: "",
		Nonce: nonce,
	}
	// Marshal attested membership set for signature
	attestedMembershipSetBytesPlain, err := protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr := base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce := []byte(attestedMembershipSetBytesStr + nonce)
	// Generate member 2 attestation
	randomLocal1 := rand.Reader
	hashedLocal1, err := computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err := ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	// Generate member 2 attestation
	randomLocal2 := rand.Reader
	hashedLocal2, err := computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err := ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	// Generate counter attested foreign membership
	counterAttestedMembership := identity.CounterAttestedMembership{
		Response: &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr},
		Attestations: []*identity.Attestation{&attestationLocal1, &attestationLocal2},
	}

	// Record membership info: should fail because the caller is not an IIN Agent
	counterAttestedMembershipBytesPlain, err := protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes := base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	require.NoError(t, err)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Caller neither a network admin nor an IIN Agent; access denied")

	// Record local membership info
	clientIdentity := &mocks.ClientIdentity{}
	localMembershipBytes, err := protoV2.Marshal(&localMembershipAsset)
	require.NoError(t, err)
	localMembershipSerialized64 := base64.StdEncoding.EncodeToString(localMembershipBytes)
	localMembershipJsonBytes, err := json.Marshal(&localMembershipAsset)
	require.NoError(t, err)
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.CreateLocalMembership(ctx, string(localMembershipSerialized64))
	require.NoError(t, err)

	// Record membership info: should fail because membership has not been recorded previously
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	clientIdentity.GetAttributeValueCalls(setClientIINAgent)
	certLocalAgent2, _ := x509.ParseCertificate(certLocalBytes2)
	clientIdentity.GetX509CertificateReturns(certLocalAgent2, nil)
	clientIdentity.GetMSPIDReturns(localMemberId2, nil)
	ctx.GetClientIdentityReturns(clientIdentity)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", securityDomainId))

	// Record membership info again: should succeed now
	chaincodeStub.GetStateReturnsOnCall(2, []byte{}, nil)
	chaincodeStub.GetStateReturnsOnCall(3, localMembershipJsonBytes, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.NoError(t, err)
	
	// One of the local signatures is invalid: should fail
	hashedLocal2, err = computeSHA2Hash([]byte("invalid"), keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(4, []byte{}, nil)
	chaincodeStub.GetStateReturnsOnCall(5, localMembershipJsonBytes, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Unable to Validate Signature: Signature Verification failed. ECDSA VERIFY")
	
	// One of the foreign signatures is invalid: should fail
	hashed2, err = computeSHA2Hash([]byte("invalid"), key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(6, []byte{}, nil)
	chaincodeStub.GetStateReturnsOnCall(7, localMembershipJsonBytes, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, "Unable to Validate Signature: Signature Verification failed. ECDSA VERIFY")
	
	// One of the foreign attestations has an invalid nonce: should fail
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestation1.Nonce = "invalid-nonce"
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(8, []byte{}, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("Mismatched nonces across two attestations: %s, %s", nonce, attestation1.Nonce))
	
	// Foreign membership has an invalid cert chain: should fail
	attestation1.Nonce = nonce
	tmpCert := member1.Chain[0]
	member1.Chain[0] = member1.Chain[1]
	member1.Chain[1] = tmpCert
	membershipBytesPlain, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr = base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce = []byte(membershipBytesStr + nonce)
	hashed1, err = computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err = ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSet.Membership = membershipBytesStr
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(9, []byte{}, nil)
	chaincodeStub.GetStateReturnsOnCall(10, localMembershipJsonBytes, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.Error(t, err)

	// Foreign attestation has invalid security domain: should fail
	tmpCert = member1.Chain[0]
	member1.Chain[0] = member1.Chain[1]
	member1.Chain[1] = tmpCert
	membershipAsset.SecurityDomain = "invalid"
	membershipBytesPlain, err = protoV2.Marshal(&membershipAsset)
	require.NoError(t, err)
	membershipBytesStr = base64.StdEncoding.EncodeToString(membershipBytesPlain)
	membershipBytesWithNonce = []byte(membershipBytesStr + nonce)
	hashed1, err = computeSHA2Hash(membershipBytesWithNonce, key1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature1, err = ecdsa.SignASN1(random1, key1, hashed1)
	require.NoError(t, err)
	attestation1.Signature = base64.StdEncoding.EncodeToString(signature1)
	hashed2, err = computeSHA2Hash(membershipBytesWithNonce, key2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature2, err = ecdsa.SignASN1(random2, key2, hashed2)
	require.NoError(t, err)
	attestation2.Signature = base64.StdEncoding.EncodeToString(signature2)
	attestedMembershipSet.Membership = membershipBytesStr
	attestedMembershipSetBytesPlain, err = protoV2.Marshal(&attestedMembershipSet)
	require.NoError(t, err)
	attestedMembershipSetBytesStr = base64.StdEncoding.EncodeToString(attestedMembershipSetBytesPlain)
	attestedMembershipSetBytesWithNonce = []byte(attestedMembershipSetBytesStr + nonce)
	hashedLocal1, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal1.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal1, err = ecdsa.SignASN1(randomLocal1, keyLocal1, hashedLocal1)
	require.NoError(t, err)
	attestationLocal1.Signature = base64.StdEncoding.EncodeToString(signatureLocal1)
	hashedLocal2, err = computeSHA2Hash(attestedMembershipSetBytesWithNonce, keyLocal2.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureLocal2, err = ecdsa.SignASN1(randomLocal2, keyLocal2, hashedLocal2)
	require.NoError(t, err)
	attestationLocal2.Signature = base64.StdEncoding.EncodeToString(signatureLocal2)
	counterAttestedMembership.Response = &identity.CounterAttestedMembership_AttestedMembershipSet_{attestedMembershipSetBytesStr}
	counterAttestedMembershipBytesPlain, err = protoV2.Marshal(&counterAttestedMembership)
	require.NoError(t, err)
	counterAttestedMembershipBytes = base64.StdEncoding.EncodeToString(counterAttestedMembershipBytesPlain)
	chaincodeStub.GetStateReturnsOnCall(11, []byte{}, nil)
	chaincodeStub.GetStateReturnsOnCall(12, localMembershipJsonBytes, nil)
	err = interopcc.UpdateMembership(ctx, counterAttestedMembershipBytes)
	require.EqualError(t, err, fmt.Sprintf("IIN Agent security domain %s does not match with membership security domain invalid", securityDomainId))
}

func TestDeleteLocalMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when caller is not an IIN Agent
	err := interopcc.DeleteLocalMembership(ctx)
	require.EqualError(t, err, "Caller not a network admin; access denied")

	// Case when a Membership exists
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientAdmin)
	ctx.GetClientIdentityReturns(clientIdentity)
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.DeleteLocalMembership(ctx)
	require.NoError(t, err)

	// Case when no Membership is found
	chaincodeStub.GetStateReturns(nil, nil)
	err = interopcc.DeleteLocalMembership(ctx)
	require.EqualError(t, err, fmt.Sprintf("Local membership with id: %s does not exist", membershipLocalSecurityDomain))

	// Handle GetState Error
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = interopcc.DeleteLocalMembership(ctx)
	require.EqualError(t, err, fmt.Sprintf("unable to retrieve asset"))
}

func TestDeleteMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// Case when caller is not an IIN Agent
	err := interopcc.DeleteMembership(ctx, securityDomainId)
	require.EqualError(t, err, "Caller not an IIN Agent; access denied")

	// Case when a Membership exists
	clientIdentity := &mocks.ClientIdentity{}
	clientIdentity.GetAttributeValueCalls(setClientIINAgent)
	ctx.GetClientIdentityReturns(clientIdentity)
	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = interopcc.DeleteMembership(ctx, securityDomainId)
	require.NoError(t, err)

	// Case when no Membership is found
	chaincodeStub.GetStateReturns(nil, nil)
	err = interopcc.DeleteMembership(ctx, securityDomainId)
	require.EqualError(t, err, fmt.Sprintf("Membership with id: %s does not exist", securityDomainId))

	// Handle GetState Error
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = interopcc.DeleteMembership(ctx, securityDomainId)
	require.EqualError(t, err, fmt.Sprintf("unable to retrieve asset"))
}

func TestVerifyMembership(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}

	// 1. create all mock data for tests

	// make certificate and convert to PEM format
	now := time.Now()
	threeDays := time.Hour * 24 * 3
	template := x509.Certificate{
		Subject: pkix.Name{
			CommonName: "example-a.com",
		},
		NotBefore:	  now.Add(-threeDays),
		NotAfter:	  now.Add(threeDays),
		SerialNumber: big.NewInt(1337),
	}

	certDERBytes, _, err := createECDSACertAndKeyFromTemplate(template)
	require.NoError(t, err)

	// Generate PEM cert from DER format
	out := &bytes.Buffer{}
	pem.Encode(out, &pem.Block{Type: "CERTIFICATE", Bytes: certDERBytes})
	pemCert := out.Bytes()

	// convert pem cert to x509 cert
	x509Cert, err := parseCert(string(pemCert))
	require.NoError(t, err)
	require.NotNil(t, x509Cert)

	// make membership
	var member = common.Member{
		Value: string(pemCert),
		Type:  "ca",
		Chain: []string{"chain"},
	}

	var membershipAsset = common.Membership{
		SecurityDomain: securityDomainId,
		Members:		map[string]*common.Member{"member1": &member},
	}
	membershipBytes, err := json.Marshal(&membershipAsset)
	require.NoError(t, err)

	// 2. Test Cases

	// Test: Happy case
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = verifyMemberInSecurityDomain(&interopcc, ctx, string(pemCert), "test", "member1")
	require.NoError(t, err)

	// Test: Unknown requesting Org
	err = verifyMemberInSecurityDomain(&interopcc, ctx, string(pemCert), "test", "unknown_member")
	require.EqualError(t, err, "Member does not exist for org: unknown_member")

	// Test: Unknown cert type
	membershipAsset.Members["member1"].Type = "unknown"
	membershipBytes, err = json.Marshal(&membershipAsset)
	require.NoError(t, err)
	chaincodeStub.GetStateReturns(membershipBytes, nil)
	err = verifyMemberInSecurityDomain(&interopcc, ctx, string(pemCert), "test", "member1")
	require.EqualError(t, err, "Certificate type not supported: unknown")
}
