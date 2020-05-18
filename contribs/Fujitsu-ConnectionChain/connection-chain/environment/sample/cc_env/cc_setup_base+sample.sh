#!/bin/bash
# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

# prepending $PWD/../bin to PATH to ensure we are picking up the correct binaries
# this may be commented out to resolve installed version of tools if desired
export PATH=${PWD}/../../base/cc_env/bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}/yaml-files

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  cc_setup_base+sample.sh -m up|down|restart|generate [-t <timeout>] [-d <delay>] [-p <proxy>]"
  echo "  cc_setup_base+sample.sh -h|--help (print this message)"
  echo "    -m <mode> - one of 'up', 'down', 'restart' or 'generate'"
  echo "      - 'up' - bring up the network with docker-compose up"
  echo "      - 'down' - clear the network with docker-compose down"
  echo "      - 'restart' - restart the network"
  echo "      - 'generate' - generate required certificates and genesis block"
  echo "    -t <timeout> - CLI timeout duration in microseconds (defaults to 30000)"
  echo "    -d <delay> - delay duration in seconds (defaults to 3)"
  echo "    -p <proxy> - specify which proxy use (defaults to blank)"
  echo
  echo "Taking all defaults:"
  echo "	cc_setup_base+sample.sh -m up"
  echo "	cc_setup_base+sample.sh -m down"
}

# Ask user for confirmation to proceed
function askProceed () {
  read -p "Continue (y/n)? " ans
  case "$ans" in
    y|Y )
      echo "proceeding ..."
    ;;
    n|N )
      echo "exiting..."
      exit 1
    ;;
    * )
      echo "invalid response"
      askProceed
    ;;
  esac
}

# Generate the needed certificates, the genesis block and start the network.
function networkUp () {
  docker network create ccnet

  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY rest-server 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY app-server 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY ec1-adapter 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY ec1-connector 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY ec2-adapter 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE build --build-arg HTTP_PROXY=$PROXY ec2-connector 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi
  docker-compose -f $SV_COMPOSE_FILE up -d 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to pull the images "
    exit 1
  fi

  # generate artifacts if they don't exist
  if [ ! -d "crypto-config" ]; then
    generateCerts
    replacePrivateKey
    generateChannelArtifacts
  fi

  chmod 666 $PWD/../../base/cc_env/chaincode/naming_service/naming_service.go
  chmod 666 $PWD/../../base/cc_env/chaincode/endchain_information/endchain_information.go
  chmod 666 $PWD/chaincode/transfer_information/*

  CHANNEL_NAME=$CHANNEL_NAME TIMEOUT=$CLI_TIMEOUT DELAY=$CLI_DELAY MODE=$MODE docker-compose -f $CC_COMPOSE_FILE up -d 2>&1

  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    docker logs -f cli
    exit 1
  fi
  docker logs -f cli
}

# Obtain CONTAINER_IDS and remove them
function clearContainers () {
  CONTAINER_IDS=$(docker ps -a | grep "endchain_information\|naming_service\|transfer_information" | awk '{print $1}')
  if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
    echo "---- No containers available for deletion ----"
  else
    docker rm -f $CONTAINER_IDS
  fi
}

# Delete any images that were generated as a part of this setup
function removeUnwantedImages() {
  DOCKER_IMAGE_IDS=$(docker images | grep "endchain_information\|naming_service\|transfer_information" | awk '{print $3}')
  if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
    echo "---- No images available for deletion ----"
  else
    docker rmi -f $DOCKER_IMAGE_IDS
  fi
}

# Tear down running network
function networkDown () {
  docker-compose -f $SV_COMPOSE_FILE down
  docker-compose -f $CC_COMPOSE_FILE down
  #Cleanup the chaincode containers
  clearContainers
  #Cleanup images
  removeUnwantedImages
  # remove orderer block and other channel configuration transactions and certs
  sudo rm -rf channel-artifacts/*.block channel-artifacts/*.tx crypto-config
  sudo rm -rf ../../base/cc_env/servers/appserver/mongodb/db/*
  docker network rm ccnet
  docker network rm ec1net
  docker network rm ec2net
}

# Stop running network
function networkStop () {
  docker-compose -f $SV_COMPOSE_FILE stop
  docker-compose -f $CC_COMPOSE_FILE stop
}

function replacePrivateKey () {
  # sed on MacOSX does not support -i flag with a null extension. We will use
  # 't' for our back-up's extension and depete it at the end of the function
  ARCH=`uname -s | grep Darwin`
  if [ "$ARCH" == "Darwin" ]; then
    OPTS="-it"
  else
    OPTS="-i"
  fi

  # Copy the template to the file that will be modified to add the private key
  cp ./yaml-files/docker-compose-sample-cc-template.yaml $CC_COMPOSE_FILE

  # The next steps will replace the template's contents with the
  # actual values of the private key file names for the two CAs.
  CURRENT_DIR=$PWD
  cd crypto-config/peerOrganizations/org1.example.com/ca/
  PRIV_KEY=$(ls *_sk)
  cd $CURRENT_DIR
  sed $OPTS "s/CA1_PRIVATE_KEY/${PRIV_KEY}/g" $CC_COMPOSE_FILE

}

# Generates Org certs using cryptogen tool
function generateCerts (){
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "##########################################################"
  echo "##### Generate certificates using cryptogen tool #########"
  echo "##########################################################"

  cryptogen generate --config=../../base/cc_env/yaml-files/crypto-config.yaml
  if [ "$?" -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

# Generate orderer genesis block, channel configuration transaction and
# anchor peer update transactions
function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  echo "##########################################################"
  echo "#########  Generating Orderer Genesis block ##############"
  echo "##########################################################"
  # Note: For some unknown reason (at least for now) the block file can't be
  # named orderer.genesis.block or the orderer will fail to launch!
  configtxgen -profile OneOrgOrdererGenesis -outputBlock ./channel-artifacts/genesis.block
  if [ "$?" -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo
  echo "#################################################################"
  echo "### Generating channel configuration transaction 'channel.tx' ###"
  echo "#################################################################"
  configtxgen -profile OneOrgChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME
  if [ "$?" -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi
}

# Obtain the OS and Architecture string that will be used to select the correct
# native binaries for your platform
OS_ARCH=$(echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
# timeout duration - the duration the CLI should wait for a response from
# another container before giving up
CLI_TIMEOUT=30000
#default for delay
CLI_DELAY=3
# channel name defaults to "mychannel"
CHANNEL_NAME="mychannel"
# use this as the default docker-compose yaml definition
CC_COMPOSE_FILE=./yaml-files/docker-compose-sample-cc.yaml
SV_COMPOSE_FILE=./yaml-files/docker-compose-sample-servers.yaml
# use this as the default proxy
PROXY=""
#PROXY=http://your.proxy.com:8080
#PROXY=http://id:passwd@your.proxy.com:8080

# Parse commandline args
while getopts "h?m:t:d:p:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    m)  MODE=$OPTARG
    ;;
    t)  CLI_TIMEOUT=$OPTARG
    ;;
    d)  CLI_DELAY=$OPTARG
    ;;
    p)  PROXY=$OPTARG
    ;;
  esac
done

# Determine whether starting, stopping, restarting or generating for announce
if [ "$MODE" == "up" ]; then
  EXPMODE="Starting"
  elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping"
  elif [ "$MODE" == "restart" ]; then
  EXPMODE="Restarting"
  elif [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and genesis block for"
else
  printHelp
  exit 1
fi

# Announce what was requested

  echo "${EXPMODE} with channel '${CHANNEL_NAME}' and CLI timeout of '${CLI_TIMEOUT}'"

# ask for confirmation to proceed
askProceed

#Create the network using docker compose
if [ "${MODE}" == "up" ]; then
  networkUp
  elif [ "${MODE}" == "down" ]; then ## Clear the network
  networkDown
  elif [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateCerts
  replacePrivateKey
  generateChannelArtifacts
  elif [ "${MODE}" == "restart" ]; then ## Restart the network
  networkStop
  networkUp
else
  printHelp
  exit 1
fi
