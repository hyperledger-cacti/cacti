#!/bin/bash

cp $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.stream/ca/ca.org1.cactus.stream-cert.pem /etc/hyperledger/fabric-ca-server-config
cp $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.stream/ca/*_sk /etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.stream-key.pem

export FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server
export FABRIC_CA_SERVER_CA_NAME=ca.cactus.stream
export FABRIC_CA_SERVER_CA_CERTFILE=/etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.stream-cert.pem
export FABRIC_CA_SERVER_CA_KEYFILE=/etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.stream-key.pem

fabric-ca-server start -b admin:adminpw
