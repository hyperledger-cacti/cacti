/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// certificateUtils contains a bunch of helper functions for dealing with certificates
package main

import (
	"crypto/ecdsa"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/asn1"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"hash"
	"math/big"
	mrand "math/rand"
	"time"

	"golang.org/x/crypto/ed25519"
	"github.com/ethereum/go-ethereum/crypto/ecies"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
)

const (
	rootCertsKey = "root_certs"
	intCertsKey  = "intermediate_certs"
)

// ECDSASignature represents an ECDSA signature
type ECDSASignature struct {
	R, S *big.Int
}

func getCertChainOptions(rootCerts []interface{}, intermediateCerts []interface{}) (x509.VerifyOptions, error) {
	certOptions := &x509.VerifyOptions{Roots: x509.NewCertPool(), Intermediates: x509.NewCertPool()}
	// Add root certs
	for _, rc := range rootCerts {
		rBytes, err := base64.StdEncoding.DecodeString(rc.(string))
		if err != nil {
			return *certOptions, err
		}
		rcs, _ := pem.Decode([]byte(rBytes))
		if rcs == nil {
			return *certOptions, errors.New("Unable to decode root cert PEM")
		}
		rcert, err := x509.ParseCertificate(rcs.Bytes)
		if err != nil {
			return *certOptions, err
		}
		certOptions.Roots.AddCert(rcert)
	}
	// Add intermediate certs
	for _, ic := range intermediateCerts {
		iBytes, err := base64.StdEncoding.DecodeString(ic.(string))
		if err != nil {
			return *certOptions, err
		}
		ics, _ := pem.Decode([]byte(iBytes))
		if ics == nil {
			return *certOptions, errors.New("Unable to decode intermediate cert PEM")
		}
		icert, err := x509.ParseCertificate(ics.Bytes)
		if err != nil {
			return *certOptions, err
		}
		certOptions.Intermediates.AddCert(icert)
	}

	return *certOptions, nil
}

func verifyCaCertificate(cert *x509.Certificate, memberCertificate string) error {
	memberX509Cert, err := parseCert(memberCertificate)
	if err != nil {
		return err
	}
	err = validateCertificateUsingCA(cert, memberX509Cert, true)
	if err != nil {
		return fmt.Errorf("CA Certificate is not valid: %s", err.Error())
	}
	return nil
}

/* This function will receive arguments for exactly one node with the following cert chain assumed: <root cert> -> <int cert 0> -> <int cert 1> -> ......
   In a Fabric network, we assume that there are multiple MSPs, each having one or more Root CAs and zero or more Intermediate CAs.
   In a Corda network, we assume that there is a single Root CA and Doorman CA, and one or more Node CAs corresponding to nodes.
*/
func verifyCertificateChain(cert *x509.Certificate, certPEMs []string) error {
	var parentCert *x509.Certificate
	for i, certPEM := range certPEMs {
		decodedCert, _ := pem.Decode([]byte(certPEM))
		if decodedCert == nil {
			return errors.New("Unable to decode PEM")
		}
		caCert, err := x509.ParseCertificate(decodedCert.Bytes)
		if err != nil {
			return err
		}

		if i > 0 {
			err := validateCertificateUsingCA(caCert, parentCert, i == 1)
			if err != nil {
				errMsg := fmt.Sprintf("Certificate link for Subject %s with Parent Subject %s invalid", caCert.Subject.String(), parentCert.Subject.String())
				return errors.New(errMsg)
			}
			if i == len(certPEMs)-1 && cert != nil {
				err := validateCertificateUsingCA(cert, caCert, i == 1)
				if err != nil {
					return errors.New("Certificate link invalid for endorser")
				}
			}
		}
		parentCert = caCert
	}

	return nil
}

func validateCertificateUsingCA(cert *x509.Certificate, signerCACert *x509.Certificate, isSignerRootCA bool) error {
	var err error
	if isSignerRootCA {
		if err = signerCACert.CheckSignature(signerCACert.SignatureAlgorithm, signerCACert.RawTBSCertificate, signerCACert.Signature); err != nil {
			return err
		}
	}
	if err = signerCACert.CheckSignature(cert.SignatureAlgorithm, cert.RawTBSCertificate, cert.Signature); err != nil {
		return err
	}
	err = isCertificateWithinExpiry(cert)
	if err != nil {
		errMsg := fmt.Sprintf("Certificate is outside of expiry date. No longer valid. Cert: %s", cert.Subject.String())
		return errors.New(errMsg)
	}
	certIssuer := cert.Issuer.String()
	signerSubject := signerCACert.Subject.String()
	if certIssuer != signerSubject {
		return fmt.Errorf("Certificate issuer %s does not match signer subject %s", certIssuer, signerSubject)
	}
	return nil
}

// Check if 'PublicKey' field in cert is nil
// Fabric certificates contain such keys, whereas Corda certificates contain ED25519 keys (but only in raw form)
// So this check serves to distinguish Corda certificates from Fabric certificates
func getECDSAPublicKeyFromCertificate(cert *x509.Certificate) *ecdsa.PublicKey {
	if cert.PublicKey != nil {
		if certPublicKey, isEcdsaKey := cert.PublicKey.(*ecdsa.PublicKey); isEcdsaKey {
			return certPublicKey
		}
	}
	return nil
}

// extracted almost verbatim from core/chaincode/shim/crypto/ecdsa/hash.go (HLF v0)
func computeSHA2Hash(msg []byte, bitsize int) ([]byte, error) {
	var hash hash.Hash
	var err error

	hash, err = getHashSHA2(bitsize)
	if err != nil {
		return nil, err
	}

	hash.Write(msg)
	return hash.Sum(nil), nil
}

// taken verbatim from core/chaincode/shim/crypto/ecdsa/hash.go (HLF v0)
func getHashSHA2(bitsize int) (hash.Hash, error) {
	switch bitsize {
	case 224:
		return sha256.New224(), nil
	case 256:
		return sha256.New(), nil
	case 384:
		return sha512.New384(), nil
	case 512:
		return sha512.New(), nil
	case 521:
		return sha512.New(), nil
	default:
		return nil, fmt.Errorf("invalid bitsize. It was [%d]. Expected [224, 256, 384, 512, 521]", bitsize)
	}
}

func ecdsaVerify(verKey *ecdsa.PublicKey, msgHash, signature []byte) error {
	ecdsaSignature := new(ECDSASignature)
	_, err := asn1.Unmarshal(signature, ecdsaSignature)
	if err != nil {
		return err
	}

	result := ecdsa.Verify(verKey, msgHash, ecdsaSignature.R, ecdsaSignature.S)
	// result := ecdsa.VerifyASN1(verKey, msgHash, signature)
	if result == false {
		return errors.New("Signature Verification failed. ECDSA VERIFY")
	}
	return nil
}

//Validate Ed25519 signature
func verifyEd25519Signature(pubKey []byte, hashedMessage []byte, signature []byte) error {

	result := ed25519.Verify(pubKey, hashedMessage, signature)
	if result == false {
		return errors.New("Signature is not valid. ED25519 VERIFY")
	}
	return nil
}

// Validate signature
func validateSignature(message string, cert *x509.Certificate, signature string) error {
	if len(signature) == 0 {
		return errors.New("Empty signature")
	}

	// First check if the public key in the cert is an ECDSA public key
	pubKey := getECDSAPublicKeyFromCertificate(cert)
	if pubKey != nil {
		// Construct the message that was signed
		hashed, err := computeSHA2Hash([]byte(message), pubKey.Params().BitSize)
		if err != nil {
			return err
		}
		return ecdsaVerify(pubKey, hashed, []byte(signature))
	} else if cert.RawSubjectPublicKeyInfo != nil && len(cert.RawSubjectPublicKeyInfo) == 44 {
		// ed25519 public key
		// We expect the key to be 44 bytes, but only the last 32 bytes (multiple of 8) comprise the public key
		// Message in ed25519 is hashed by default as part of the signature algorithm. Uses SHA512
		return verifyEd25519Signature(cert.RawSubjectPublicKeyInfo[12:], []byte(message), []byte(signature))
	} else {
		return errors.New("Missing or unsupported public key type")
	}
}

func parseCert(certString string) (*x509.Certificate, error) {
	certBytes, _ := pem.Decode([]byte(certString))

	if certBytes == nil {
		return nil, errors.New("Client cert not in a known PEM format")
	}
	cert, err := x509.ParseCertificate(certBytes.Bytes)

	if err != nil {
		return nil, err
	}
	return cert, err
}

func isCertificateWithinExpiry(cert *x509.Certificate) error {
	if cert == nil {
		return errors.New("Cert is nil")
	}
	certLocation := cert.NotBefore.Location()
	currentDate := time.Now().In(certLocation)
	if currentDate.After(cert.NotBefore) && currentDate.Before(cert.NotAfter) {
		return nil
	}
	return errors.New("Cert is invalid")
}

func encryptWithCert(message []byte, cert *x509.Certificate) ([]byte, error) {
	// Check if the public key in the cert is an ECDSA public key
	pubKey := getECDSAPublicKeyFromCertificate(cert)
	if pubKey != nil {
		return encryptWithECDSAPublicKey(message, pubKey)
	} else if (cert.RawSubjectPublicKeyInfo != nil && len(cert.RawSubjectPublicKeyInfo) == 44) {	// ed25519 public key
		// We expect the key to be 44 bytes, but only the last 32 bytes (multiple of 8) comprise the public key
		return encryptWithEd25519PublicKey(message, cert.RawSubjectPublicKeyInfo[12:])
	} else {
		return []byte(""), errors.New("Missing or unsupported public key type for encryption")
	}
}

func encryptWithECDSAPublicKey(message []byte, pubKey *ecdsa.PublicKey) ([]byte, error) {
	if pubKey != nil {
		publicKey := ecies.ImportECDSAPublic(pubKey)
		encBytes, err := ecies.Encrypt(rand.Reader, publicKey, message, nil, nil)
		if err != nil {
			return []byte(""), err
		}
		return encBytes, nil
	}
	return []byte(""), errors.New("Missing or invalid ECDSA public key")
}

func encryptWithEd25519PublicKey(message []byte, pubKey []byte) ([]byte, error) {
	return []byte(""), nil
}

func generateConfidentialInteropPayloadAndHash(message []byte, cert string) ([]byte, error) {
	// Generate a 16-byte random key for the HMAC
	hashKey := make([]byte, 16)
	for i := 0; i < 16 ; i++ {
		hashKey[i] = byte(mrand.Intn(255))
	}
	confidentialPayloadContents := common.ConfidentialPayloadContents{
		Payload: message,
		Random: hashKey,
	}
	confidentialPayloadContentsBytes, err := proto.Marshal(&confidentialPayloadContents)
	if err != nil {
		return []byte(""), err
	}
	x509Cert, err := parseCert(cert)
	if err != nil {
		return []byte(""), err
	}
	encryptedPayload, err := encryptWithCert(confidentialPayloadContentsBytes, x509Cert)
	if err != nil {
		return []byte(""), err
	}

	payloadHMAC := hmac.New(sha256.New, hashKey)
	payloadHMAC.Write(message)
	payloadHMACBytes := payloadHMAC.Sum(nil)
	confidentialPayload := common.ConfidentialPayload{
		EncryptedPayload: encryptedPayload,
		HashType: common.ConfidentialPayload_HMAC,
		Hash: payloadHMACBytes,
	}
	confidentialPayloadBytes, err := proto.Marshal(&confidentialPayload)
	if err != nil {
		return []byte(""), err
	}
	return confidentialPayloadBytes, nil
}
