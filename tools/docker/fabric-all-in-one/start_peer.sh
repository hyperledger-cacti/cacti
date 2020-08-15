#!/bin/bash

cp -R $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.com/peers/peer0.org1.cactus.com/msp $FABRIC_CFG_PATH/peer/msp
cp -R $FABRIC_CFG_PATH/crypto-config/peerOrganizations/org1.cactus.com/users $FABRIC_CFG_PATH/peer/users

export CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
export CORE_PEER_ID=peer0.org1.cactus.com
export FABRIC_LOGGING_SPEC=info
export CORE_CHAINCODE_LOGGING_LEVEL=info
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=$FABRIC_CFG_PATH/peer/msp/
export CORE_PEER_ADDRESS=localhost:7051
export CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443

peer node start
