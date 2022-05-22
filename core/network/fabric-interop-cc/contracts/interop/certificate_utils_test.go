/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"bytes"
	"crypto"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/ethereum/go-ethereum/crypto/ecies"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
)

func TestVerifyCertificateChain(t *testing.T) {
	// Happy Corda certificate case
	cert1 := `-----BEGIN CERTIFICATE-----
MIICbTCCAgmgAwIBAgIIYRljUiZaGSkwFAYIKoZIzj0EAwIGCCqGSM49AwEHMGMx
CzAJBgNVBAYTAlVTMREwDwYDVQQHEwhOZXcgWW9yazEOMAwGA1UECxMFQ29yZGEx
FjAUBgNVBAoTDVIzIEhvbGRDbyBMTEMxGTAXBgNVBAMTEENvcmRhIERvb3JtYW4g
Q0EwHhcNMjAwNzI0MDAwMDAwWhcNMjcwNTIwMDAwMDAwWjAvMQswCQYDVQQGEwJH
QjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUEwWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAASFze6k3tINqGLsKTi0a50RpOUCysno1/1lwIfEqaboauuj
o6Ecfu8X1WnW92VrEZGKslIJzR8R0deOEJvBs0rzo4HQMIHNMB0GA1UdDgQWBBR4
hwLuLgfIZMEWzG4n3AxwfgPbezAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIB
hjATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBTr7i4wFSlArhmYHthv
431/B6LCEzARBgorBgEEAYOKYgEBBAMCAQQwRQYDVR0eAQH/BDswOaA1MDOkMTAv
MQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMQ8wDQYDVQQKDAZQYXJ0eUGh
ADAUBggqhkjOPQQDAgYIKoZIzj0DAQcDSAAwRQIhANXBVAebUsY9AMfjZedNYN14
Wy76Ru5vMSta3Av1d08lAiAi2GZWk5XwJoEYuhQHXsHQLZbXphAVk+Q5tVgMgywj
tQ==
-----END CERTIFICATE-----`

	cert2 := `-----BEGIN CERTIFICATE-----
MIICXjCCAfugAwIBAgIIHVb6wd3RHhIwFAYIKoZIzj0EAwIGCCqGSM49AwEHMFgx
GzAZBgNVBAMMEkNvcmRhIE5vZGUgUm9vdCBDQTELMAkGA1UECgwCUjMxDjAMBgNV
BAsMBWNvcmRhMQ8wDQYDVQQHDAZMb25kb24xCzAJBgNVBAYTAlVLMB4XDTE4MDcx
MDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowYzELMAkGA1UEBhMCVVMxETAPBgNVBAcT
CE5ldyBZb3JrMQ4wDAYDVQQLEwVDb3JkYTEWMBQGA1UEChMNUjMgSG9sZENvIExM
QzEZMBcGA1UEAxMQQ29yZGEgRG9vcm1hbiBDQTBZMBMGByqGSM49AgEGCCqGSM49
AwEHA0IABAPL3qAm4WZms5ciBVoxMQXfK7uTmHRVvWfWQ+QVYP3bMHSguHZRzB3v
7EOE8RZpGDan+w007Xj7XR0+xG9SxmCjgZkwgZYwHQYDVR0OBBYEFOvuLjAVKUCu
GZge2G/jfX8HosITMA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0PBAQDAgGGMCMGA1Ud
JQQcMBoGCCsGAQUFBwMBBggrBgEFBQcDAgYEVR0lADAfBgNVHSMEGDAWgBR8rqnf
uUgBKxOJC5rmRYUcORcHczARBgorBgEEAYOKYgEBBAMCAQEwFAYIKoZIzj0EAwIG
CCqGSM49AwEHA0cAMEQCIBmzQXpnCo9eAxkhwMt0bBr1Q0APJXF0KuBRsFBWAa6S
AiBgx6G8G9Ij7B8+y65ItLKVcs7Kh6Rdnr5/1zB/yPwfrg==
-----END CERTIFICATE-----`

	cert3 := `-----BEGIN CERTIFICATE-----
MIICCTCCAbCgAwIBAgIIcFe0qctqSucwCgYIKoZIzj0EAwIwWDEbMBkGA1UEAwwS
Q29yZGEgTm9kZSBSb290IENBMQswCQYDVQQKDAJSMzEOMAwGA1UECwwFY29yZGEx
DzANBgNVBAcMBkxvbmRvbjELMAkGA1UEBhMCVUswHhcNMTcwNTIyMDAwMDAwWhcN
MjcwNTIwMDAwMDAwWjBYMRswGQYDVQQDDBJDb3JkYSBOb2RlIFJvb3QgQ0ExCzAJ
BgNVBAoMAlIzMQ4wDAYDVQQLDAVjb3JkYTEPMA0GA1UEBwwGTG9uZG9uMQswCQYD
VQQGEwJVSzBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABGlm6LFHrVkzfuUHin36
Jrm1aUMarX/NUZXw8n8gSiJmsZPlUEplJ+f/lzZMky5EZPTtCciG34pnOP0eiMd/
JTCjZDBiMB0GA1UdDgQWBBR8rqnfuUgBKxOJC5rmRYUcORcHczALBgNVHQ8EBAMC
AYYwIwYDVR0lBBwwGgYIKwYBBQUHAwEGCCsGAQUFBwMCBgRVHSUAMA8GA1UdEwEB
/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgDaL4SguKsNeTT7SeUkFdoCBACeG8
GqO4M1KlfimphQwCICiq00hDanT5W8bTLqE7GIGuplf/O8AABlpWrUg6uiUB
-----END CERTIFICATE-----`

	certs := []string{cert3, cert2, cert1}
	cordaCert, err := parseCert("-----BEGIN CERTIFICATE-----\nMIIBwjCCAV+gAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8x\nCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAe\nFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8w\nDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREK\nhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDs\nKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDAT\nBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3Axw\nfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cA\nMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86\nD2mYK4C3tRli3X3VgnCe8COqfYyuQg==\n-----END CERTIFICATE-----")
	require.NoError(t, err)

	err = verifyCertificateChain(cordaCert, certs)
	require.NoError(t, err)
}
func TestParseCert(t *testing.T) {
	// Test: Valid cert (happy case)
	validCert := "-----BEGIN CERTIFICATE-----\nMIICKjCCAdGgAwIBAgIUBFTi56rmjunJiRESpyJW0q4sRL4wCgYIKoZIzj0EAwIw\ncjELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGjAYBgNVBAoTEW9yZzEubmV0d29yazEuY29tMR0wGwYDVQQDExRj\nYS5vcmcxLm5ldHdvcmsxLmNvbTAeFw0yMDA3MjkwNDM1MDBaFw0zNTA3MjYwNDM1\nMDBaMHIxCzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEPMA0G\nA1UEBxMGRHVyaGFtMRowGAYDVQQKExFvcmcxLm5ldHdvcmsxLmNvbTEdMBsGA1UE\nAxMUY2Eub3JnMS5uZXR3b3JrMS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\nAAQONsIOz5o+HhKgSdIOpqGrTcvJ3tADkFsyMg0vV3MSo6gyAq5V23c1grO4X5xU\nY71ZVTPQuokv6/WIQYIaumjDo0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/\nBAgwBgEB/wIBATAdBgNVHQ4EFgQU1g+tPngh2w8g99z1mwsVbkKjAKkwCgYIKoZI\nzj0EAwIDRwAwRAIgGdSMyEzimoSwjTyF+NmOwOLn4xpeMOhev5idRWpy+ZsCIFKA\n0I8cCd5tw7zTukyjWMJi737K+4zPK6QDKIeql+R1\n-----END CERTIFICATE-----\n"
	_, err := parseCert(validCert)
	require.NoError(t, err)

	// Test: Invalid cert
	partialCert := "MIICKjCCAdGgAwIBAgIUBFTi56rmjunJiRESpyJW0q4sRL4wCgYIKoZIzj0EAwIw\ncjELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGjAYBgNVBAoTEW9yZzEubmV0d29yazEuY29tMR0wGwYDVQQDExRj\nYS5vcmcxLm5ldHdvcmsxLmNvbTAeFw0yMDA3MjkwNDM1MDBaFw0zNTA3MjYwNDM1\nMDBaMHIxCzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEPMA0G\nA1UEBxMGRHVyaGFtMRowGAYDVQQKExFvcmcxLm5ldHdvcmsxLmNvbTEdMBsGA1UE\nAxMUY2Eub3JnMS5uZXR3b3JrMS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\nAAQONsIOz5o+HhKgSdIOpqGrTcvJ3tADkFsyMg0vV3MSo6gyAq5V23c1grO4X5xU\nY71ZVTPQuokv6/WIQYIaumjDo0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/\nBAgwBgEB/wIBATAdBgNVHQ4EFgQU1g+tPngh2w8g99z1mwsVbkKjAKkwCgYIKoZI\nzj0EAwIDRwAwRAIgGdSMyEzimoSwjTyF+NmOwOLn4xpeMOhev5idRWpy+ZsCIFKA\n0I8cCd5tw7zTukyjWMJi737K+4zPK6QDKIeql+R1\n"
	_, err = parseCert(partialCert)
	require.EqualError(t, err, fmt.Sprintf("Client cert not in a known PEM format"))

	// Test: Empty cert
	emptyString := ""
	_, err = parseCert(emptyString)
	require.EqualError(t, err, fmt.Sprintf("Client cert not in a known PEM format"))
}

func TestIsCertificateWithinExpiry(t *testing.T) {
	now := time.Now()
	threeDays := time.Hour * 24 * 3

	// Test: Within expiry case (happy case)
	x509Cert, err := createCertWithTimeRange(now.Add(-threeDays), now.Add(threeDays), "ecdsa")
	if err != nil {
		fmt.Printf("Parse ERROR %s \n", err.Error())
		t.Fatal(fmt.Sprintf("Parse ERROR %s \n", err.Error()))
	}
	err = isCertificateWithinExpiry(x509Cert)
	require.NoError(t, err)

	// Test: Expired cert case
	x509Cert, err = createCertWithTimeRange(now.Add(-3*threeDays), now.Add(-2*threeDays), "ecdsa")
	if err != nil {
		fmt.Printf("Parse ERROR %s \n", err.Error())
		t.Fatal(fmt.Sprintf("Parse ERROR %s \n", err.Error()))
	}
	err = isCertificateWithinExpiry(x509Cert)
	require.EqualError(t, err, fmt.Sprintf("Cert is invalid"))

	// Test: Not valid yet case
	x509Cert, err = createCertWithTimeRange(now.Add(3*threeDays), now.Add(4*threeDays), "ecdsa")
	if err != nil {
		fmt.Printf("Parse ERROR %s \n", err.Error())
		t.Fatal(fmt.Sprintf("Parse ERROR %s \n", err.Error()))
	}
	err = isCertificateWithinExpiry(x509Cert)
	require.EqualError(t, err, fmt.Sprintf("Cert is invalid"))
}

func TestValidateSignature(t *testing.T) {
	// Test case: Happy case with programatically generated values
	// 1. create ECDSA cert and key
	template := x509.Certificate{
		Subject: pkix.Name{
			CommonName: "example-a.com",
		},
		SerialNumber: big.NewInt(1337),
	}
	certBytes, key, err := createECDSACertAndKeyFromTemplate(template)
	require.NoError(t, err)

	// 2. Sign a message with the ECDSA key
	random := rand.Reader
	hashed, err := computeSHA2Hash([]byte("localhost:9080/network1/mychannel:interop:Read:anonce"), key.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature, err := ecdsa.SignASN1(random, key, hashed)
	require.NoError(t, err)

	// 3. Generate PEM cert from DER format
	// https://gist.github.com/samuel/8b500ddd3f6118d052b5e6bc16bc4c09
	out := &bytes.Buffer{}
	pem.Encode(out, &pem.Block{Type: "CERTIFICATE", Bytes: certBytes})
	x509Cert, err := parseCert(string(out.Bytes()))
	require.NoError(t, err)

	err = validateSignature("localhost:9080/network1/mychannel:interop:Read:anonce", x509Cert, string(signature))
	require.NoError(t, err)

	// Test case: Trying to validate hashed message with unhashed signature
	msg := "localhost:9080/network1/mychannel:interop:Read:anonce"
	r := rand.Reader
	invalidSignature, err := ecdsa.SignASN1(r, key, []byte(msg))
	require.NoError(t, err)
	err = validateSignature("localhost:9080/network1/mychannel:interop:Read:anonce", x509Cert, string(invalidSignature))
	require.EqualError(t, err, "Signature Verification failed. ECDSA VERIFY")
}

func TestEd25519SignatureValidation(t *testing.T) {
	random := rand.Reader
	pubKey, privKey, err := ed25519.GenerateKey(random)
	message := []byte("Test message")

	hashed, err := computeSHA2Hash(message, 256)
	require.NoError(t, err)
	signature, err := privKey.Sign(random, hashed, crypto.Hash(0))
	require.NoError(t, err)
	err = verifyEd25519Signature(pubKey, hashed, signature)
	require.NoError(t, err)
}

func TestECDSAEncryption(t *testing.T) {
	// Load certificate with embedded public key
	certBytes, _ := ioutil.ReadFile("./test_data/signCertFabric.pem")
	cert, _ := parseCert(string(certBytes))

	// Encrypt some random bytes
	message := []byte("random-message")
	encBytes, err := encryptWithCert(message, cert)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Printf("Original message: %s\n", string(message))
	fmt.Printf("Encrypted message: %s\n", string(encBytes))

	decBytes, err := decryptDataWithPrivKeyFile("./test_data/privKey.pem", encBytes)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Printf("Decrypted message: %s\n", string(decBytes))
	require.Equal(t, message, decBytes)
}

func TestConfidentialInteropPayload(t *testing.T) {
	// Load certificate with embedded public key
	certBytes, _ := ioutil.ReadFile("./test_data/signCertFabric.pem")

	// Generate confidential view with random data
	viewContents := []byte("random-message")
	confBytes, err := generateConfidentialInteropPayloadAndHash(viewContents, string(certBytes))
	require.NoError(t, err)

	// Parse result
	var confPayload common.ConfidentialPayload
	err = proto.Unmarshal(confBytes, &confPayload)
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, confPayload.HashType, common.ConfidentialPayload_HMAC)

	// Decrypt and validate payload
	decPayload, err := decryptDataWithPrivKeyFile("./test_data/privKey.pem", confPayload.EncryptedPayload)
	if err != nil {
		t.Fatal(err)
	}
	var confPayloadContents common.ConfidentialPayloadContents
	err = proto.Unmarshal(decPayload, &confPayloadContents)
	if err != nil {
		t.Fatal(err)
	}
	require.Equal(t, confPayloadContents.Payload, viewContents)

	// Authenticate hash
	mac := hmac.New(sha256.New, confPayloadContents.Random)
	mac.Write(confPayloadContents.Payload)
	fmac := mac.Sum(nil)
	require.Equal(t, confPayload.Hash, fmac)
}

func generateCertFromTemplate(template x509.Certificate, keyType string) ([]byte, error) {
	random := rand.Reader
	switch keyType {
	case "ed25519":
		pubKey, privKey, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			fmt.Printf("ed25519 ERROR %s \n", err.Error())
			return nil, err
		}
		certBytes, err := x509.CreateCertificate(random, &template, &template, pubKey, privKey)
		return certBytes, err
	case "rsa":
		testKey, err := rsa.GenerateKey(rand.Reader, 1024)
		if err != nil {
			fmt.Printf("rsa ERROR %s \n", err.Error())
			return nil, err
		}
		certBytes, err := x509.CreateCertificate(random, &template, &template, &testKey.PublicKey, testKey)
		return certBytes, err
	case "ecdsa":
		testKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			fmt.Printf("ecdsa ERROR %s \n", err.Error())
			return nil, err
		}
		certBytes, err := x509.CreateCertificate(random, &template, &template, &testKey.PublicKey, testKey)
		return certBytes, err
	default:
		return nil, fmt.Errorf("Invalid key type")
	}
}

func createCertWithTimeRange(beforeTime time.Time, AfterTime time.Time, keyType string) (*x509.Certificate, error) {
	template := x509.Certificate{
		Subject: pkix.Name{
			CommonName: "example-a.com",
		},
		NotBefore:             beforeTime,
		NotAfter:              AfterTime,
		SerialNumber:          big.NewInt(1337),
		BasicConstraintsValid: true,
	}

	byteCert, err := generateCertFromTemplate(template, keyType)
	if err != nil {
		fmt.Printf("Create ERROR %s \n", err.Error())
		return nil, err

	}
	x509Cert, err := x509.ParseCertificate(byteCert)
	if err != nil {
		fmt.Printf("Parse ERROR %s \n", err.Error())
		return nil, err

	}
	return x509Cert, err

}

func createED25519CertAndKeyFromTemplate(template x509.Certificate) ([]byte, *ed25519.PrivateKey, error) {
	random := rand.Reader

	pubKey, privKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		fmt.Printf("ed25519 ERROR %s \n", err.Error())
		return nil, nil, err
	}
	certBytes, err := x509.CreateCertificate(random, &template, &template, pubKey, privKey)
	return certBytes, &privKey, err

}
func createECDSACertAndKeyFromTemplate(template x509.Certificate) ([]byte, *ecdsa.PrivateKey, error) {
	random := rand.Reader

	testKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		fmt.Printf("rsa ERROR %s \n", err.Error())
		return nil, nil, err
	}
	certBytes, err := x509.CreateCertificate(random, &template, &template, &testKey.PublicKey, testKey)
	return certBytes, testKey, err

}

func decryptDataWithPrivKeyFile(privKeyFile string, data []byte) ([]byte, error) {
	// Load decryption key
	signkeyPEM, err := ioutil.ReadFile(privKeyFile)
	if err != nil {
		return nil, err
	}
	signkeyBytes, _ := pem.Decode([]byte(signkeyPEM))
	signkeyPriv, err := x509.ParsePKCS8PrivateKey(signkeyBytes.Bytes)
	if err != nil {
		return nil, err
	}
	signkeyPrivEC := signkeyPriv.(*ecdsa.PrivateKey)
	return decryptDataWithPrivKey(signkeyPrivEC, data)
}

func decryptDataWithPrivKey(privKeyECDSA *ecdsa.PrivateKey, data []byte) ([]byte, error) {
	privKey := ecies.ImportECDSA(privKeyECDSA)

	// Decrypt response and match
	return privKey.Decrypt(data, nil, nil)
}
