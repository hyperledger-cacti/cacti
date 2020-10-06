#!/bin/bash

cp -R $FABRIC_CFG_PATH/crypto-config/ordererOrganizations/cactus.stream/orderers/orderer.cactus.stream/msp $FABRIC_CFG_PATH/orderer/msp

export FABRIC_LOGGING_SPEC=info
export ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
export ORDERER_GENERAL_GENESISMETHOD=file
export ORDERER_GENERAL_GENESISFILE=$FABRIC_CFG_PATH/config/genesis.block
export ORDERER_GENERAL_LOCALMSPID=OrdererMSP
export ORDERER_GENERAL_LOCALMSPDIR=$FABRIC_CFG_PATH/orderer/msp

orderer
