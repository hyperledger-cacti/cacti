#!/bin/bash

cp $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.com/ca/ca.org1.cactus.com-cert.pem /etc/hyperledger/fabric-ca-server-config
cp $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.com/ca/*_sk /etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.com-key.pem

export FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server
export FABRIC_CA_SERVER_CA_NAME=ca.cactus.com
export FABRIC_CA_SERVER_CA_CERTFILE=/etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.com-cert.pem
export FABRIC_CA_SERVER_CA_KEYFILE=/etc/hyperledger/fabric-ca-server-config/ca.org1.cactus.com-key.pem

fabric-ca-server start -b admin:adminpw
