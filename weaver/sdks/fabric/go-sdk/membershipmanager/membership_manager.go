/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package membershipmanager

import (
	"context"
	"fmt"
	"crypto"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"github.com/golang/protobuf/proto"
	protoV2 "google.golang.org/protobuf/proto"

	"github.com/hyperledger/fabric-protos-go/common"
	mspprotos "github.com/hyperledger/fabric-protos-go/msp"
	"github.com/hyperledger/fabric-admin-sdk/pkg/channel"
	"github.com/hyperledger/fabric-admin-sdk/pkg/identity"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	cidentity "github.com/hyperledger/fabric-gateway/pkg/identity"

	cactiprotos "github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
)


func CreateLocalMembership(walletPath, userName, connectionProfilePath, securityDomain, channelId, weaverCCId string, mspIds []string) error {
	membership, err := GetMSPConfigurations(walletPath, userName, connectionProfilePath, channelId, mspIds)
	if err != nil {
		return err
	}
	membership.SecurityDomain = securityDomain
	membershipBytes, err := protoV2.Marshal(membership)
	if err != nil {
		return err
	}
	membershipSerialized64 := base64.StdEncoding.EncodeToString(membershipBytes)

	_, err = membershipTx("CreateLocalMembership", walletPath, userName, connectionProfilePath, channelId, weaverCCId, membershipSerialized64, mspIds)
	if err != nil {
		return err
	}

	return nil
}

func UpdateLocalMembership(walletPath, userName, connectionProfilePath, securityDomain, channelId, weaverCCId string, mspIds []string) error {
	membership, err := GetMSPConfigurations(walletPath, userName, connectionProfilePath, channelId, mspIds)
	if err != nil {
		return err
	}
	membership.SecurityDomain = securityDomain
	membershipBytes, err := protoV2.Marshal(membership)
	if err != nil {
		return err
	}
	membershipSerialized64 := base64.StdEncoding.EncodeToString(membershipBytes)

	_, err = membershipTx("UpdateLocalMembership", walletPath, userName, connectionProfilePath, channelId, weaverCCId, membershipSerialized64, mspIds)
	if err != nil {
		return err
	}

	return nil
}

func DeleteLocalMembership(walletPath, userName, connectionProfilePath, channelId, weaverCCId string, mspIds []string) error {
	_, err := membershipTx("DeleteLocalMembership", walletPath, userName, connectionProfilePath, channelId, weaverCCId, "", mspIds)
	if err != nil {
		return err
	}

	return nil
}

func ReadMembership(walletPath, userName, connectionProfilePath, channelId, weaverCCId, securityDomain string, mspIds []string) (string, error) {
	result, err := membershipTx("GetMembershipBySecurityDomain", walletPath, userName, connectionProfilePath, channelId, weaverCCId, securityDomain, mspIds)
	if err != nil {
		return "", err
	}

	return string(result), nil
}

func GetMembershipUnit(walletPath, userName, connectionProfilePath, channelId, mspId string) (*cactiprotos.Member, error) {
	configBlock, err := GetConfigBlockFromChannel(walletPath, userName, connectionProfilePath, channelId)
	if err != nil {
		return nil, err
	}

	return GetMembershipForMspIdFromBlock(configBlock, mspId)
}

func GetMSPConfigurations(walletPath, userName, connectionProfilePath, channelId string, mspIds []string) (*cactiprotos.Membership, error) {
	configBlock, err := GetConfigBlockFromChannel(walletPath, userName, connectionProfilePath, channelId)
	if err != nil {
		return nil, err
	}

	return GetMembershipForMspIdsFromBlock(configBlock, mspIds)
}

func GetAllMSPConfigurations(walletPath, userName, connectionProfilePath, channelId string, ordererMspIds []string) (*cactiprotos.Membership, error) {
	configBlock, err := GetConfigBlockFromChannel(walletPath, userName, connectionProfilePath, channelId)
	if err != nil {
		return nil, err
	}

	return GetMembershipForAllMspIdsFromBlock(configBlock, ordererMspIds)
}

func GetConfigBlockFromChannel(walletPath, userName, connectionProfilePath, channelId string) (*common.Block, error) {
	mspId, signCert, signKey, timeout, connection, err := getNetworkConnectionAndInfo(walletPath, userName, connectionProfilePath)
	if err != nil {
		return nil, err
	}
	defer connection.Close()

	// Client identity used to carry out deployment tasks.
	signCertParsed, err := readCertificate(signCert)
	if err != nil {
		return nil, err
	}
	signKeyParsed, err := readPrivateKey(signKey)
	if err != nil {
		return nil, err
	}
	clientId, err := identity.NewPrivateKeySigningIdentity(mspId, signCertParsed, signKeyParsed)
	if err != nil {
		return nil, err
	}

	// Context used to manage Fabric invocations.
	seconds, err := time.ParseDuration(strconv.Itoa(timeout) + "s")
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), seconds*time.Second)
	defer cancel()

	configBlockV2, err := channel.GetConfigBlock(ctx, connection, clientId, channelId)
	if err != nil {
		return nil, err
	}
	
	configBlockBytes, err := protoV2.Marshal(configBlockV2)
	var configBlock common.Block
	err = proto.Unmarshal(configBlockBytes, &configBlock)

	return &configBlock, err
}

func GetMembershipForMspIdFromBlock(block *common.Block, mspId string) (*cactiprotos.Member, error) {
	var envelope common.Envelope
	err := proto.Unmarshal((block.GetData().GetData())[0], &envelope)
	if err != nil {
		return nil, err
	}

	var payload common.Payload
	err = proto.Unmarshal(envelope.GetPayload(), &payload)
	if err != nil {
		return nil, err
	}

	var channelHeader common.ChannelHeader
	err = proto.Unmarshal(payload.GetHeader().GetChannelHeader(), &channelHeader)
	if err != nil {
		return nil, err
	}

	if common.HeaderType(channelHeader.GetType()) == common.HeaderType_CONFIG {
		var configEnvelope common.ConfigEnvelope
		err = proto.Unmarshal(payload.GetData(), &configEnvelope)
		if err != nil {
			return nil, err
		}

		for _, group := range configEnvelope.GetConfig().GetChannelGroup().GetGroups()["Application"].GetGroups() {
			var mspConfig mspprotos.MSPConfig
			groupValMsp, ok := group.GetValues()["MSP"]
			if !ok {
				fmt.Println("Warning: Channel Application group has no 'MSP' key")
				continue
			}
			err = proto.Unmarshal(groupValMsp.GetValue(), &mspConfig)
			if err != nil {
				return nil, err
			}

			// Ideally, we would replace the '0' in the below conditional with 'int32(msp.FABRIC)'
			// according to https://pkg.go.dev/github.com/hyperledger/fabric@v2.1.1+incompatible/msp#ProviderType
			// but this would require importing "github.com/hyperledger/fabric/msp",
			// which depends on 'fabric-protos-go', which in turn conflicts with 'fabric-protos-go-apiv2',
			// which is imported by this module.
			if mspConfig.GetType() == 0 {
				var fabricMspConfig mspprotos.FabricMSPConfig
				err = proto.Unmarshal(mspConfig.GetConfig(), &fabricMspConfig)
				if err != nil {
					return nil, err
				}

				if fabricMspConfig.GetName() == mspId {
					memberUnit := &cactiprotos.Member{}
					memberUnit.Type = "certificate"
					memberUnit.Value = ""
					memberUnit.Chain = []string{}
					for _, certBytes := range fabricMspConfig.GetRootCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					for _, certBytes := range fabricMspConfig.GetIntermediateCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					return memberUnit, nil
				}
			}
		}
	}

	return nil, nil
}

func GetMembershipForMspIdsFromBlock(block *common.Block, mspIds []string) (*cactiprotos.Membership, error) {
	// Convert slice to map
	var mspMap = make(map[string]bool)
	for _, mspId := range mspIds {
		mspMap[mspId] = true
	}

	var envelope common.Envelope
	err := proto.Unmarshal((block.GetData().GetData())[0], &envelope)
	if err != nil {
		return nil, err
	}

	var payload common.Payload
	err = proto.Unmarshal(envelope.GetPayload(), &payload)
	if err != nil {
		return nil, err
	}

	var channelHeader common.ChannelHeader
	err = proto.Unmarshal(payload.GetHeader().GetChannelHeader(), &channelHeader)
	if err != nil {
		return nil, err
	}

	membership := &cactiprotos.Membership{}
	membership.Members = make(map[string]*cactiprotos.Member)

	if common.HeaderType(channelHeader.GetType()) == common.HeaderType_CONFIG {
		var configEnvelope common.ConfigEnvelope
		err = proto.Unmarshal(payload.GetData(), &configEnvelope)
		if err != nil {
			return nil, err
		}

		for _, group := range configEnvelope.GetConfig().GetChannelGroup().GetGroups()["Application"].GetGroups() {
			var mspConfig mspprotos.MSPConfig
			groupValMsp, ok := group.GetValues()["MSP"]
			if !ok {
				fmt.Println("Warning: Channel Application group has no 'MSP' key")
				continue
			}
			err = proto.Unmarshal(groupValMsp.GetValue(), &mspConfig)
			if err != nil {
				return nil, err
			}

			// Ideally, we would replace the '0' in the below conditional with 'int32(msp.FABRIC)'
			// according to https://pkg.go.dev/github.com/hyperledger/fabric@v2.1.1+incompatible/msp#ProviderType
			// but this would require importing "github.com/hyperledger/fabric/msp",
			// which depends on 'fabric-protos-go', which in turn conflicts with 'fabric-protos-go-apiv2',
			// which is imported by this module.
			if mspConfig.GetType() == 0 {
				var fabricMspConfig mspprotos.FabricMSPConfig
				err = proto.Unmarshal(mspConfig.GetConfig(), &fabricMspConfig)
				if err != nil {
					return nil, err
				}

				if mspMap[fabricMspConfig.GetName()] == true {
					memberUnit := &cactiprotos.Member{}
					memberUnit.Type = "certificate"
					memberUnit.Value = ""
					memberUnit.Chain = []string{}
					for _, certBytes := range fabricMspConfig.GetRootCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					for _, certBytes := range fabricMspConfig.GetIntermediateCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					membership.Members[fabricMspConfig.GetName()] = memberUnit
				}
			}
		}
	}

	return membership, nil
}

func GetMembershipForAllMspIdsFromBlock(block *common.Block, ordererMspIds []string) (*cactiprotos.Membership, error) {
	// Convert slice to map
	var ordererMspMap = make(map[string]bool)
	for _, mspId := range ordererMspIds {
		ordererMspMap[mspId] = true
	}

	var envelope common.Envelope
	err := proto.Unmarshal((block.GetData().GetData())[0], &envelope)
	if err != nil {
		return nil, err
	}

	var payload common.Payload
	err = proto.Unmarshal(envelope.GetPayload(), &payload)
	if err != nil {
		return nil, err
	}

	var channelHeader common.ChannelHeader
	err = proto.Unmarshal(payload.GetHeader().GetChannelHeader(), &channelHeader)
	if err != nil {
		return nil, err
	}

	membership := &cactiprotos.Membership{}
	membership.Members = make(map[string]*cactiprotos.Member)

	if common.HeaderType(channelHeader.GetType()) == common.HeaderType_CONFIG {
		var configEnvelope common.ConfigEnvelope
		err = proto.Unmarshal(payload.GetData(), &configEnvelope)
		if err != nil {
			return nil, err
		}

		for _, group := range configEnvelope.GetConfig().GetChannelGroup().GetGroups()["Application"].GetGroups() {
			var mspConfig mspprotos.MSPConfig
			groupValMsp, ok := group.GetValues()["MSP"]
			if !ok {
				fmt.Println("Warning: Channel Application group has no 'MSP' key")
				continue
			}
			err = proto.Unmarshal(groupValMsp.GetValue(), &mspConfig)
			if err != nil {
				return nil, err
			}

			// Ideally, we would replace the '0' in the below conditional with 'int32(msp.FABRIC)'
			// according to https://pkg.go.dev/github.com/hyperledger/fabric@v2.1.1+incompatible/msp#ProviderType
			// but this would require importing "github.com/hyperledger/fabric/msp",
			// which depends on 'fabric-protos-go', which in turn conflicts with 'fabric-protos-go-apiv2',
			// which is imported by this module.
			if mspConfig.GetType() == 0 {
				var fabricMspConfig mspprotos.FabricMSPConfig
				err = proto.Unmarshal(mspConfig.GetConfig(), &fabricMspConfig)
				if err != nil {
					return nil, err
				}

				if _, isOrdererMspId := ordererMspMap[fabricMspConfig.GetName()]; !isOrdererMspId {
					memberUnit := &cactiprotos.Member{}
					memberUnit.Type = "certificate"
					memberUnit.Value = ""
					memberUnit.Chain = []string{}
					for _, certBytes := range fabricMspConfig.GetRootCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					for _, certBytes := range fabricMspConfig.GetIntermediateCerts() {
						memberUnit.Chain = append(memberUnit.Chain, string(certBytes))
					}
					membership.Members[fabricMspConfig.GetName()] = memberUnit
				}
			}
		}
	}

	return membership, nil
}

func membershipTx(txFunc, walletPath, userName, connectionProfilePath, channelId, weaverCCId, ccArg string, mspIds []string) ([]byte, error) {
	mspId, signCert, signKey, _, connection, err := getNetworkConnectionAndInfo(walletPath, userName, connectionProfilePath)
	if err != nil {
		return nil, err
	}
	defer connection.Close()

	id, err := newIdentity(signCert, mspId)
	if err != nil {
		return nil, err
	}

	sign, err := newSign(signKey)
	if err != nil {
		return nil, err
	}

	// Instantiate the network gateway
	gateway, err := client.Connect(id, client.WithSign(sign), client.WithClientConnection(connection))
	if err != nil {
		return nil, err
	}
	defer gateway.Close()

	network := gateway.GetNetwork(channelId)
	weaverCC := network.GetContract(weaverCCId)
	if ccArg == "" {
		return weaverCC.SubmitTransaction(txFunc)
	} else {
		return weaverCC.SubmitTransaction(txFunc, ccArg)
	}
}

func getNetworkConnectionAndInfo(walletPath, userName, connectionProfilePath string) (string, string, string, int, *grpc.ClientConn, error) {
	// gRPC connection to a target peer.
	mspId, signCert, signKey, err := getInfoFromWallet(walletPath, userName)
	if err != nil {
		return "", "", "", -1, nil, err
	}
	peerEndpoint, tlsCaCert, timeout, err := getInfoFromConnectionProfile(connectionProfilePath, mspId)
	if err != nil {
		return "", "", "", -1, nil, err
	}
	connection, err := newGrpcConnection(peerEndpoint, tlsCaCert)
	if err != nil {
		return "", "", "", -1, nil, err
	}

	return mspId, signCert, signKey, timeout, connection, nil
}

// newIdentity creates a client identity for this Gateway connection using an X.509 certificate.
func newIdentity(certificatePEM, mspId string) (*cidentity.X509Identity, error) {
	certificate, err := cidentity.CertificateFromPEM([]byte(certificatePEM))
	if err != nil {
		return nil, err
	}

	return cidentity.NewX509Identity(mspId, certificate)
}

// newSign creates a function that generates a digital signature from a message digest using a private key.
func newSign(privateKeyPEM string) (cidentity.Sign, error) {
	privateKey, err := cidentity.PrivateKeyFromPEM([]byte(privateKeyPEM))
	if err != nil {
		return nil, err
	}

	return cidentity.NewPrivateKeySign(privateKey)
}

func getInfoFromWallet(walletPath, userName string) (string, string, string, error) {
	walletUserId, err := os.ReadFile(walletPath + "/" + userName + ".id")
	if err != nil {
		return "", "", "", err
	}

	var walletId = map[string]interface{}{}
	err = json.Unmarshal(walletUserId, &walletId)
	if err != nil {
		return "", "", "", err
	}

	walletCredentialsIface, ok := walletId["credentials"]
	if !ok {
		return "", "", "", fmt.Errorf("Wallet Id has no 'credentials' attribute")
	}
	var walletCredentials = walletCredentialsIface.(map[string]interface{})
	mspId, ok := walletId["mspId"]
	if !ok {
		return "", "", "", fmt.Errorf("Wallet Id has no 'mspId' attribute")
	}
	certificate, ok := walletCredentials["certificate"]
	if !ok {
		return "", "", "", fmt.Errorf("Wallet Id has no 'credentials.certificate' attribute")
	}
	privateKey, ok := walletCredentials["privateKey"]
	if !ok {
		return "", "", "", fmt.Errorf("Wallet Id has no 'credentials.privateKey' attribute")
	}

	return mspId.(string), certificate.(string), privateKey.(string), nil
}

func getInfoFromConnectionProfile(connectionProfilePath, mspId string) (string, string, int, error) {
	connectionProfile, err := os.ReadFile(connectionProfilePath)
	if err != nil {
		return "", "", -1, err
	}

	var connProfile = map[string]interface{}{}
	err = json.Unmarshal(connectionProfile, &connProfile)
	if err != nil {
		return "", "", -1, err
	}

	timeoutVal := 300	// peer connection timeout in seconds
	// Get endorser timeout from the "client.connection.timeout.peer.endorser" attribute
	clientIface, ok := connProfile["client"]
	if !ok {
		fmt.Println("Warning: Connection profile has no 'client' attribute")
	} else {
		var client = clientIface.(map[string]interface{})
		connectionIface, ok := client["connection"]
		if !ok {
			fmt.Println("Warning: Connection profile has no 'client.connection' attribute")
		} else {
			var connection = connectionIface.(map[string]interface{})
			timeoutIface, ok := connection["timeout"]
			if !ok {
				fmt.Println("Warning: Connection profile has no 'client.connection.timeout' attribute")
			} else {
				var timeout = timeoutIface.(map[string]interface{})
				tpeerIface, ok := timeout["peer"]
				if !ok {
					fmt.Println("Warning: Connection profile has no 'client.connection.timeout.peer' attribute")
				} else {
					var tpeer = tpeerIface.(map[string]interface{})
					endorserIface, ok := tpeer["endorser"]
					if !ok {
						fmt.Println("Warning: Connection profile has no 'client.connection.timeout.peer.endorser' attribute")
					} else {
						var endorser = endorserIface.(string)
						profileTimeoutVal, err := strconv.Atoi(endorser)
						if err != nil {
							fmt.Printf("Warning: Cannot parse '%s'. Using default timeout` '%d'\n", endorser, timeoutVal)
						}
						timeoutVal = profileTimeoutVal
					}
				}
			}
		}
	}

	orgsIface, ok := connProfile["organizations"]
	if !ok {
		return "", "", -1, fmt.Errorf("Connection profile has no 'organizations' attribute")
	}
	var orgs = orgsIface.(map[string]interface{})
	peersIface, ok := connProfile["peers"]
	if !ok {
		return "", "", -1, fmt.Errorf("Connection profile has no 'peers' attribute")
	}
	var peers = peersIface.(map[string]interface{})
	for orgName, orgInfo := range orgs {
		var org = orgInfo.(map[string]interface{})
		orgMspId, ok := org["mspid"]
		if !ok {
			return "", "", -1, fmt.Errorf("Connection profile has no 'mspId' attribute for the '%s' organization", orgName)
		}
		if orgMspId == mspId {
			orgPeers := org["peers"].([]interface{})
			if len(orgPeers) == 0 {
				return "", "", -1, fmt.Errorf("No peers in connection profile for org with MSP ID %s", mspId)
			} else {
				peerId := orgPeers[0].(string)
				peerInfo, ok := peers[peerId]
				if !ok {
					return "", "", -1, fmt.Errorf("Connection profile has no peer '%s' info", peerId)
				}
				var peer = peerInfo.(map[string]interface{})
				tlsCACertsIface, ok := peer["tlsCACerts"]
				if !ok {
					return "", "", -1, fmt.Errorf("Connection profile has no 'tlsCACerts' attribute for the '%s' peer", peerId)
				}
				var tlsCACerts = tlsCACertsIface.(map[string]interface{})
				peerUrlIface, ok := peer["url"]
				if !ok {
					return "", "", -1, fmt.Errorf("Connection profile has no 'url' attribute for the '%s' peer", peerId)
				}
				peerUrl := peerUrlIface.(string)
				tlsCACertsPemIface, ok := tlsCACerts["pem"]
				if !ok {
					return "", "", -1, fmt.Errorf("Connection profile has no 'tlsCACerts.pem' attribute for the '%s' peer", peerId)
				}
				peerUrlParts := strings.Split(peerUrl, "://")
				if len(peerUrlParts) == 1 {
					return peerUrlParts[0], tlsCACertsPemIface.(string), timeoutVal, nil
				} else {	// If not 1, the slice must have a length larger than 1
					return peerUrlParts[1], tlsCACertsPemIface.(string), timeoutVal, nil
				}
			}
		}
	}

	return "", "", -1, fmt.Errorf("Unable to find required info in connection profile")
}

func newGrpcConnection(networkPeerEndpoint, tlsCACertPEM string) (*grpc.ClientConn, error) {
	tlsCACert, err := readCertificate(tlsCACertPEM)
	if err != nil {
		return nil, err
	}
	certPool := x509.NewCertPool()
	certPool.AddCert(tlsCACert)
	transportCredentials := credentials.NewClientTLSFromCert(certPool, "")

	networkPeerEndpointParts := strings.Split(networkPeerEndpoint, ":")
	hostname := networkPeerEndpointParts[0]
	port := networkPeerEndpointParts[1]
	addresses, err := net.LookupHost(hostname)

	var connection *grpc.ClientConn
	if err != nil || len(addresses) == 0 {
		fmt.Printf("Warning: Cannot resolve supplied hostname '%s'. Using 'localhost' instead.\n", hostname)
		connection, err = grpc.Dial("localhost:" + port, grpc.WithTransportCredentials(transportCredentials))
	} else {
		connection, err = grpc.Dial(networkPeerEndpoint, grpc.WithTransportCredentials(transportCredentials))
	}
	if err != nil {
		return nil, err
	}

	return connection, nil
}

func readCertificateFile(certFile string) (*x509.Certificate, error) {
	certificatePEM, err := os.ReadFile(certFile)
	if err != nil {
		return nil, err
	}

	return readCertificate(string(certificatePEM))
}

func readCertificate(certificatePEM string) (*x509.Certificate, error) {
	block, _ := pem.Decode([]byte(certificatePEM))
	if block == nil {
		return nil, fmt.Errorf("failed to parse certificate PEM")
	}
	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %s", err.Error())
	}

	return certificate, nil
}

func readPrivateKeyFile(keyFile string) (crypto.PrivateKey, error) {
	privateKeyPEM, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, err
	}

	return readPrivateKey(string(privateKeyPEM))
}

func readPrivateKey(privateKeyPEM string) (crypto.PrivateKey, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to parse private key PEM")
	}

	privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PKCS8 encoded private key: %s", err.Error())
	}

	return privateKey, nil
}
