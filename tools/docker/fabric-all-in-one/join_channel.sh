#!/bin/bash

# Create the channel
CORE_PEER_LOCALMSPID=Org1MSP CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/peer/users/Admin@org1.cactus.com/msp peer channel create -o 127.0.0.1:7050 -c mychannel -f /etc/hyperledger/fabric/config/channel.tx
# Join peer0.org1.example.com to the channel.
CORE_PEER_LOCALMSPID=Org1MSP CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/peer/users/Admin@org1.cactus.com/msp peer channel join -b mychannel.block
