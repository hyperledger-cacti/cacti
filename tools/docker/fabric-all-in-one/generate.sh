#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
CHANNEL_NAME=mychannel

# remove previous crypto material and config transactions
rm -fr $FABRIC_CFG_PATH/config/*
rm -fr $FABRIC_CFG_PATH/crypto-config/*

# generate crypto material
cryptogen generate --config=$FABRIC_CFG_PATH/crypto-config.yaml --output="$FABRIC_CFG_PATH/crypto-config"
if [ "$?" -ne 0 ]; then
  echo "Failed to generate crypto material..."
  exit 1
fi

# generate genesis block for orderer
configtxgen -configPath $FABRIC_CFG_PATH -profile OneOrgOrdererGenesis -outputBlock $FABRIC_CFG_PATH/config/genesis.block
if [ "$?" -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi

# generate channel configuration transaction
configtxgen -configPath $FABRIC_CFG_PATH -profile OneOrgChannel -outputCreateChannelTx $FABRIC_CFG_PATH/config/channel.tx -channelID $CHANNEL_NAME
if [ "$?" -ne 0 ]; then
  echo "Failed to generate channel configuration transaction..."
  exit 1
fi

# generate anchor peer transaction
configtxgen -configPath $FABRIC_CFG_PATH -profile OneOrgChannel -outputAnchorPeersUpdate $FABRIC_CFG_PATH/config/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for Org1MSP..."
  exit 1
fi
