#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This script brings up a Hyperledger Fabric network for testing smart contracts
# and applications. The test network consists of two organizations with one
# peer each, and a single node Raft ordering service. Users can also use this
# script to create a channel deploy a chaincode on the channel
#
# prepending $PWD/../bin to PATH to ensure we are picking up the correct binaries
# this may be commented out to resolve installed version of tools if desired
export PATH=${PWD}/bin:${PWD}:$PATH
export FABRIC_CFG_PATH=$NW_CFG_PATH/configtx
export VERBOSE=false
export NWPATH=$NW_CFG_PATH
profile=${2:-"1-node"}

# Print the usage message
function printHelp() {
  echo "Usage: "
  echo "  network.sh <Mode> [Flags]"
  echo "    <Mode>"
  echo "      - 'up' - bring up fabric orderer and peer nodes. No channel is created"
  echo "      - 'up createChannel' - bring up fabric network with one channel"
  echo "      - 'createChannel' - create and join a channel after the network is created"
  echo "      - 'deployCC' - deploy the fabcar chaincode on the channel"
  echo "      - 'down' - clear the network with docker-compose down"
  echo "      - 'clean' - clean the network"
  echo
  echo "    Flags:"
  echo "    -ca <use CAs> -  create Certificate Authorities to generate the crypto material"
  echo "    -c <channel name> - channel name to use (defaults to \"mychannel\")"
  echo "    -s <dbtype> - the database backend to use: goleveldb (default) or couchdb"
  echo "    -r <max retry> - CLI times out after certain number of attempts (defaults to 5)"
  echo "    -d <delay> - delay duration in seconds (defaults to 3)"
  echo "    -l <language> - the programming language of the chaincode to deploy: go (default), java, javascript, typescript"
  echo "    -v <version>  - chaincode version. Must be a round number, 1, 2, 3, etc"
  echo "    -i <imagetag> - the tag to be used to launch the network (defaults to \"latest\")"
  echo "    -verbose - verbose mode"
  echo "  network.sh -h (print this message)"
  echo
  echo " Possible Mode and flags"
  echo "  network.sh up -ca -c -r -d -s -i -verbose"
  echo "  network.sh up createChannel -ca -c -r -d -s -i -verbose"
  echo "  network.sh createChannel -c -r -d -verbose"
  echo "  network.sh deployCC -l -v -r -d -verbose"
  echo
  echo " Taking all defaults:"
  echo "	network.sh up"
  echo
  echo " Examples:"
  echo "  network.sh up createChannel -ca -c mychannel -s couchdb -i 2.0.0"
  echo "  network.sh createChannel -c channelName"
  echo "  network.sh deployCC -l javascript"
}

# Obtain CONTAINER_IDS and remove them
# TODO Might want to make this optional - could clear other containers
# This function is called when you bring a network down
function clearContainers() {
  CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer.*${ROLE}.*/) {print $1}')
  if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
    echo "---- No containers available for deletion ----"
  else
    docker rm -f $CONTAINER_IDS
  fi
}

# Delete any images that were generated as a part of this setup
# specifically the following images are often left behind:
# This function is called when you bring the network down
function removeUnwantedImages() {
  DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*${ROLE}.*/) {print $3}')
  if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
    echo "---- No images available for deletion ----"
  else
    docker rmi -f $DOCKER_IMAGE_IDS
  fi
}

# Versions of fabric known not to work with the test network
BLACKLISTED_VERSIONS="^1\.0\. ^1\.1\. ^1\.2\. ^1\.3\. ^1\.4\."



# Do some basic sanity checking to make sure that the appropriate versions of fabric
# binaries/images are available. In the future, additional checking for the presence
# of go or other items could be added.
function checkPrereqs() {
  ## Check if your have cloned the peer binaries and configuration files.
  peer version > /dev/null 2>&1

  if [[ $? -ne 0 || ! -d "$NW_CFG_PATH/config" ]]; then
    echo "ERROR! Peer binary and configuration files not found.."
    echo
    echo "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
    echo "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
    exit 1
  fi

  which envsubst
  if [ $? -ne 0 ]; then
     echo "Please install envsubst (if in mac brew install gettext)...";
     exit 1
  fi

  # use the fabric tools container to see if the samples and binaries match your
  # docker images
  LOCAL_VERSION=$(peer version | sed -ne 's/ Version: //p')
  DOCKER_IMAGE_VERSION=$(docker run --rm hyperledger/fabric-tools:$IMAGETAG peer version | sed -ne 's/ Version: //p' | head -1)

  echo "LOCAL_VERSION=$LOCAL_VERSION"
  echo "DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"

  if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ]; then
    echo "=================== WARNING ==================="
    echo "  Local fabric binaries and docker images are  "
    echo "  out of  sync. This may cause problems.       "
    echo "==============================================="
  fi

  for UNSUPPORTED_VERSION in $BLACKLISTED_VERSIONS; do
    echo "$LOCAL_VERSION" | grep -q $UNSUPPORTED_VERSION
    if [ $? -eq 0 ]; then
      echo "ERROR! Local Fabric binary version of $LOCAL_VERSION does not match the versions supported by the test network."
      exit 1
    fi

    echo "$DOCKER_IMAGE_VERSION" | grep -q $UNSUPPORTED_VERSION
    if [ $? -eq 0 ]; then
      echo "ERROR! Fabric Docker image version of $DOCKER_IMAGE_VERSION does not match the versions supported by the test network."
      exit 1
    fi
  done

}




# Before you can bring up a network, each organization needs to generate the crypto
# material that will define that organization on the network. Because Hyperledger
# Fabric is a permissioned blockchain, each node and user on the network needs to
# use certificates and keys to sign and verify its actions. In addition, each user
# needs to belong to an organization that is recognized as a member of the network.
# You can use the Cryptogen tool or Fabric CAs to generate the organization crypto
# material.

# By default, the sample network uses cryptogen. Cryptogen is a tool that is
# meant for development and testing that can quicky create the certificates and keys
# that can be consumed by a Fabric network. The cryptogen tool consumes a series
# of configuration files for each organization in the "organizations/cryptogen"
# directory. Cryptogen uses the files to generate the crypto  material for each
# org in the "organizations" directory.

# You can also Fabric CAs to generate the crypto material. CAs sign the certificates
# and keys that they generate to create a valid root of trust for each organization.
# The script uses Docker Compose to bring up three CAs, one for each peer organization
# and the ordering organization. The configuration file for creating the Fabric CA
# servers are in the "organizations/fabric-ca" directory. Within the same diectory,
# the "registerEnroll.sh" script uses the Fabric CA client to create the identites,
# certificates, and MSP folders that are needed to create the test network in the
# "organizations/ordererOrganizations" directory.

# Create Organziation crypto material using cryptogen or CAs
function createOrgs() {

  if [ -d "$NW_CFG_PATH/peerOrganizations" ]; then
    rm -Rf $NW_CFG_PATH/peerOrganizations && rm -Rf $NW_CFG_PATH/ordererOrganizations
  fi

  # Create crypto material using cryptogen
  if [ "$CRYPTO" == "cryptogen" ]; then
    which cryptogen
    if [ "$?" -ne 0 ]; then
      echo "cryptogen tool not found. exiting"
      exit 1
    fi
    echo
    echo "##########################################################"
    echo "##### Generate certificates using cryptogen tool #########"
    echo "##########################################################"
    echo

    echo "##########################################################"
    echo "############ Create Org1 Identities ######################"
    echo "##########################################################"

    set -x
    cryptogen generate --config=$NW_CFG_PATH/cryptogen/crypto-config-org1.yaml --output="$NW_CFG_PATH"
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate certificates..."
      exit 1
    fi

    echo "##########################################################"
    echo "############ Create Org2 Identities ######################"
    echo "##########################################################"

    set -x
    cryptogen generate --config=$NW_CFG_PATH/cryptogen/crypto-config-org2.yaml --output="$NW_CFG_PATH"
    res=$?
    set +x
    if [ $res -ne 0 ]; then
     echo "Failed to generate certificates..."
     exit 1
    fi

    echo "##########################################################"
    echo "############ Create Orderer Org Identities ###############"
    echo "##########################################################"

    set -x
    cryptogen generate --config=$NW_CFG_PATH/cryptogen/crypto-config-orderer.yaml --output="$NW_CFG_PATH"
    res=$?
    set +x
    if [ $res -ne 0 ]; then
      echo "Failed to generate certificates..."
      exit 1
    fi

  fi

  # Create crypto material using Fabric CAs
  if [ "$CRYPTO" == "Certificate Authorities" ]; then

    fabric-ca-client version > /dev/null 2>&1
    if [ $? -ne 0 ]; then
      echo "Fabric CA client not found locally, downloading..."
      cd ..
      curl -s -L "https://github.com/hyperledger/fabric-ca/releases/download/v1.4.4/hyperledger-fabric-ca-${OS_ARCH}-1.4.4.tar.gz" | tar xz || rc=$?
    if [ -n "$rc" ]; then
        echo "==> There was an error downloading the binary file."
        echo "fabric-ca-client binary is not available to download"
    else
        echo "==> Done."
      #cd test-network
    fi
    fi

    echo
    echo "##########################################################"
    echo "##### Generate certificates using Fabric CA's ############"
    echo "##########################################################"
    echo $NW_CFG_PATH
    cat docker.env
    envsubst < docker.env > docker.real.env
    envsubst < docker/docker-compose-ca.yaml > docker/docker-compose-ca.real.yaml
    COMPOSE_FILE_CA=docker/docker-compose-ca.real.yaml

    IMAGE_TAG=$IMAGETAG docker-compose -f $COMPOSE_FILE_CA --env-file=docker.real.env --profile $DOCKER_PROFILES up -d 2>&1

    . $NW_CFG_PATH/fabric-ca/registerEnroll.sh

    sleep 10

    echo "##########################################################"
    echo "############ Create Org1 Identities ######################"
    echo "##########################################################"

    createOrg1 $NW_CFG_PATH $CA_ORG1_PORT

    echo "##########################################################"
    echo "############ Create Org2 Identities ######################"
    echo "##########################################################"

    createOrg2 $NW_CFG_PATH $CA_ORG2_PORT

    echo "##########################################################"
    echo "############ Create Orderer Org Identities ###############"
    echo "##########################################################"

    createOrderer $NW_CFG_PATH

  fi

  echo
  echo "Generate CCP files for Org1 and Org2 in $NW_CFG_PATH"
  $NW_CFG_PATH/ccp-generate.sh $NW_CFG_PATH
}

# Once you create the organization crypto material, you need to create the
# genesis block of the orderer system channel. This block is required to bring
# up any orderer nodes and create any application channels.

# The configtxgen tool is used to create the genesis block. Configtxgen consumes a
# "configtx.yaml" file that contains the definitions for the sample network. The
# genesis block is defiend using the "TwoOrgsOrdererGenesis" profile at the bottom
# of the file. This profile defines a sample consortium, "SampleConsortium",
# consisting of our two Peer Orgs. This consortium defines which organizations are
# recognized as members of the network. The peer and ordering organizations are defined
# in the "Profiles" section at the top of the file. As part of each organization
# profile, the file points to a the location of the MSP directory for each member.
# This MSP is used to create the channel MSP that defines the root of trust for
# each organization. In essense, the channel MSP allows the nodes and users to be
# recognized as network members. The file also specifies the anchor peers for each
# peer org. In future steps, this same file is used to create the channel creation
# transaction and the anchor peer updates.
#
#
# If you receive the following warning, it can be safely ignored:
#
# [bccsp] GetDefault -> WARN 001 Before using BCCSP, please call InitFactories(). Falling back to bootBCCSP.
#
# You can ignore the logs regarding intermediate certs, we are not using them in
# this crypto implementation.

# Generate orderer system channel genesis block.
function createConsortium() {

  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  echo "#########  Generating Orderer Genesis block ##############"
  sleep 5

  echo $FABRIC_CFG_PATH
  export FABRIC_CFG_PATH=$FABRIC_CFG_PATH/configtx
  echo $FABRIC_CFG_PATH
  # Note: For some unknown reason (at least for now) the block file can't be
  # named orderer.genesis.block or the orderer will fail to launch!
  set -x
  configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock $NW_CFG_PATH/system-genesis-block/genesis.block
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
}

# After we create the org crypto material and the system channel genesis block,
# we can now bring up the peers and orderering service. By default, the base
# file for creating the network is "docker-compose-test-net.yaml" in the ``docker``
# folder. This file defines the environment variables and file mounts that
# point the crypto material and genesis block that were created in earlier.

# Bring up the peer and orderer nodes using docker compose.
function networkUp() {
  echo "NW : $NW_CFG_PATH"
  checkPrereqs

  # generate artifacts if they don't exist
  if [ ! -d "$NW_CFG_PATH/peerOrganizations" ]; then
    createOrgs
    createConsortium
  else
    # If artifacts are present, no need to create them, but we need to start Fabric CAs
    echo "Starting Fabric CA Containers"
    #cat docker.env
    envsubst < docker.env > docker.real.env
    envsubst < docker/docker-compose-ca.yaml > docker/docker-compose-ca.real.yaml
    COMPOSE_FILE_CA=docker/docker-compose-ca.real.yaml
    IMAGE_TAG=$IMAGETAG docker-compose -f $COMPOSE_FILE_CA --env-file=docker.real.env --profile $DOCKER_PROFILES up -d 2>&1
  fi

  envsubst < docker/docker-compose-test-net.yaml > docker/docker-compose-test-net.real.yaml
  COMPOSE_FILE_BASE=docker/docker-compose-test-net.real.yaml
  COMPOSE_FILES="-f ${COMPOSE_FILE_BASE}"

  envsubst < docker/docker-compose-couch.yaml > docker/docker-compose-couch.real.yaml
  COMPOSE_FILE_COUCH=docker/docker-compose-couch.real.yaml

  if [ "${DATABASE}" == "couchdb" ]; then
    COMPOSE_FILES="${COMPOSE_FILES} -f ${COMPOSE_FILE_COUCH}"
  fi
  echo "NW config path.. : "$NW_CFG_PATH
  cat docker.env
  envsubst < docker.env > docker.real.env
  IMAGE_TAG=$IMAGETAG NW_CFG_PATH=$NW_CFG_PATH docker-compose ${COMPOSE_FILES} --env-file=docker.real.env --profile $DOCKER_PROFILES up -d 2>&1

  docker ps -a
  if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start network"
    exit 1
  fi
}

## call the script to join create the channel and join the peers of org1 and org2
function createChannel() {
  # now run the script that creates a channel. This script uses configtxgen once
  # more to create the channel creation transaction and the anchor peer updates.
  # configtx.yaml is mounted in the cli container, which allows us to use it to
  # create the channel artifacts
  echo "calling createChannel.sh ORDERER_PORT PEER_ORG1_PORT PEER_ORG2_PORT: $ORDERER_PORT $PEER_ORG1_PORT $PEER_ORG2_PORT"
  scripts/createChannel.sh $CHANNEL_NAME $CLI_DELAY $MAX_RETRY $VERBOSE $NW_CFG_PATH $ORDERER_PORT $PEER_ORG1_PORT $PEER_ORG2_PORT $COMPOSE_PROJECT_NAME $PROFILE
  if [ $? -ne 0 ]; then
    echo "Error !!! Create channel failed"
    exit 1
  fi

}

## Call the script to isntall and instantiate a chaincode on the channel
function deployCC() {
  echo "In function deployCC $APP_ROOT for $COMPOSE_PROJECT_NAME"
  scripts/deployCC.sh $CHANNEL_NAME $CC_SRC_LANGUAGE $VERSION $CLI_DELAY $MAX_RETRY $VERBOSE $CC_CHAIN_CODE $NW_CFG_PATH $PEER_ORG1_PORT $PEER_ORG2_PORT $ORDERER_PORT $APP_ROOT $COMPOSE_PROJECT_NAME $PROFILE

  if [ $? -ne 0 ]; then
    echo "ERROR !!! Deploying chaincode failed"
    exit 1
  fi

  exit 0
}

# Tear down running network
function networkDown() {
  cat docker.env
  envsubst < docker.env > docker.real.env

  envsubst < docker/docker-compose-couch.yaml > docker/docker-compose-couch.real.yaml
  COMPOSE_FILE_COUCH=docker/docker-compose-couch.real.yaml

  envsubst < docker/docker-compose-test-net.yaml > docker/docker-compose-test-net.real.yaml
  COMPOSE_FILE_BASE=docker/docker-compose-test-net.real.yaml
  COMPOSE_FILES="-f ${COMPOSE_FILE_BASE}"

  cat docker.env
  envsubst < docker.env > docker.real.env
  APP_ROOT=$APP_ROOT docker-compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_COUCH -f $COMPOSE_FILE_CA --env-file=docker.real.env --profile $DOCKER_PROFILES down --volumes --remove-orphans
  #docker-compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_COUCH -f $COMPOSE_FILE_CA --env-file=docker.env down --volumes --remove-orphans
  # docker-compose -f $COMPOSE_FILE_COUCH_ORG3 -f $COMPOSE_FILE_ORG3 down --volumes --remove-orphans

  # Bring down the network, deleting the volumes
  #Cleanup the chaincode containers
  clearContainers
  #Cleanup images
  removeUnwantedImages

  # Don't remove the generated artifacts -- note, the ledgers are always removed
  if [ "$MODE" == "clean" ]; then
    echo "Removing contents of : $NW_CFG_PATH"
    # remove orderer block and other channel configuration transactions and certs
    rm -rf $NW_CFG_PATH/system-genesis-block/*.block $NW_CFG_PATH/peerOrganizations $NW_CFG_PATH/ordererOrganizations
    ## remove fabric ca artifacts
    rm -rf $NW_CFG_PATH/fabric-ca/org1/msp $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem $NW_CFG_PATH/fabric-ca/org1/ca-cert.pem $NW_CFG_PATH/fabric-ca/org1/IssuerPublicKey $NW_CFG_PATH/fabric-ca/org1/IssuerRevocationPublicKey $NW_CFG_PATH/fabric-ca/org1/fabric-ca-server.db
    rm -rf $NW_CFG_PATH/fabric-ca/org2/msp $NW_CFG_PATH/fabric-ca/org2/tls-cert.pem $NW_CFG_PATH/fabric-ca/org2/ca-cert.pem $NW_CFG_PATH/fabric-ca/org2/IssuerPublicKey $NW_CFG_PATH/fabric-ca/org2/IssuerRevocationPublicKey $NW_CFG_PATH/fabric-ca/org2/fabric-ca-server.db
    rm -rf $NW_CFG_PATH/fabric-ca/ordererOrg/msp $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem $NW_CFG_PATH/fabric-ca/ordererOrg/ca-cert.pem $NW_CFG_PATH/fabric-ca/ordererOrg/IssuerPublicKey $NW_CFG_PATH/fabric-ca/ordererOrg/IssuerRevocationPublicKey $NW_CFG_PATH/fabric-ca/ordererOrg/fabric-ca-server.db
    # remove channel and script artifacts
    rm -rf $NW_CFG_PATH/channel-artifacts
    rm docker.env *.tmp.env docker.real.env docker/*real* *.tar.gz log.txt || echo
  elif [ "$MODE" == "down" ]; then
    rm docker.env *.tmp.env docker.real.env docker/*real* *.tar.gz log.txt || echo
  else
    echo " Invalid option in network.sh "
  fi
}



# Obtain the OS and Architecture string that will be used to select the correct
# native binaries for your platform, e.g., darwin-amd64 or linux-amd64
OS_ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
# Using crpto vs CA. default is cryptogen
CRYPTO="cryptogen"
# timeout duration - the duration the CLI should wait for a response from
# another container before giving up
MAX_RETRY=5
# default for delay between commands
CLI_DELAY=3
# channel name defaults to "mychannel"
CHANNEL_NAME="mychannel"
# Deploy 1 org or 2 org: profiles
DOCKER_PROFILES="1-node"
# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=docker/docker-compose-test-net.yaml
# docker-compose.yaml file if you are using couchdb
COMPOSE_FILE_COUCH=docker/docker-compose-couch.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=docker/docker-compose-ca.yaml
# use this as the docker compose couch file for org3
#COMPOSE_FILE_COUCH_ORG3=addOrg3/docker/docker-compose-couch-org3.yaml
# use this as the default docker-compose yaml definition for org3
#COMPOSE_FILE_ORG3=addOrg3/docker/docker-compose-org3.yaml
#
# use golang as the default language for chaincode
CC_SRC_LANGUAGE=golang
# Chaincode version
VERSION=1
# default image tag
IMAGETAG="latest"
# default database
DATABASE="leveldb"
# default chaincode
CC_CHAIN_CODE=""
#role network1/network2
ROLE="network1"
ROLE_FILE=""
ORDERER_LISTENPORT="$ORDERER_LISTENPORT"

export N1_CA_ORG1_PORT=${N1_CA_ORG1_PORT:-7054}
export N1_CA_ORG2_PORT=${N1_CA_ORG2_PORT:-7064}
export N1_CA_ORDERER_PORT=${N1_CA_ORDERER_PORT:-9054}
export N1_CHAINCODELISTEN_PORT=${N1_CHAINCODELISTEN_PORT:-7052}
export N1_COUCHDB0_PORT=${N1_COUCHDB0_PORT:-7084}
export N1_COUCHDB1_PORT=${N1_COUCHDB1_PORT:-7094}
export N1_ORDERER_PORT=${N1_ORDERER_PORT:-7050}
export N1_PEER_ORG1_PORT=${N1_PEER_ORG1_PORT:-7051}
export N1_PEER_ORG2_PORT=${N1_PEER_ORG2_PORT:-7061}


export N2_CA_ORG1_PORT=${N2_CA_ORG1_PORT:-5054}
export N2_CA_ORG2_PORT=${N2_CA_ORG2_PORT:-5064}
export N2_CA_ORDERER_PORT=${N2_CA_ORDERER_PORT:-8054}
export N2_CHAINCODELISTEN_PORT=${N2_CHAINCODELISTEN_PORT:-9052}
export N2_COUCHDB0_PORT=${N2_COUCHDB0_PORT:-9084}
export N2_COUCHDB1_PORT=${N2_COUCHDB1_PORT:-9094}
export N2_ORDERER_PORT=${N2_ORDERER_PORT:-9050}
export N2_PEER_ORG1_PORT=${N2_PEER_ORG1_PORT:-9051}
export N2_PEER_ORG2_PORT=${N2_PEER_ORG2_PORT:-9061}

export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}
export IMAGE_TAG=$IMAGE_TAG



# Parse commandline args

## Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi

# parse a createChannel/deployCC subcommand if used
if [[ $# -ge 1 ]] ; then
  key="$1"
  if [[ "$key" == "createChannel" ]]; then
      export MODE="createChannel"
      shift
  fi

  if [[ "$key" == "deployCC" ]]; then
      export MODE="deployCC"
      shift
  fi

  if [[ "$key" == "down" ]]; then
      export MODE="down"
      echo $MODE
      shift
  fi

fi

# parse flags

while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -p )
    DOCKER_PROFILES="$2"
    shift
    ;;
  -ca )
    CRYPTO="Certificate Authorities"
    ;;
  -r )
    MAX_RETRY="$2"
    shift
    ;;
  -d )
    CLI_DELAY="$2"
    shift
    ;;
  -s )
    DATABASE="$2"
    shift
    ;;
  -l )
    CC_SRC_LANGUAGE="$2"
    shift
    ;;
  -v )
    VERSION="$2"
    shift
    ;;
  -i )
    IMAGETAG="$2"
    shift
    ;;
  -verbose )
    VERBOSE=true
    shift
    ;;
  -ch )
    CC_CHAIN_CODE="$2"
    shift
    ;;
  -nw )
    ROLE="$2"
    echo "ROLE:$ROLE"
    shift
    ;;
  * )
    echo
    echo "Unknown flag: $key"
    echo
    printHelp
    exit 1
    ;;
  esac
  shift
done

SCRIPT_PATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
APP_ROOT=${APP_ROOT:-"${SCRIPT_PATH}/../.."}
# This function resolves the path and expands all ../../ components
# if any by changing the path to the specified directory and then
# printing the full path (resolved) via pwd.
#
function resolve_path() {
	cd "$1" 2>/dev/null || return $?
	echo "`pwd -P`"
}
# By executing resolve_path in a sub-shell via `` we do not affect
# the current environment.
#
APP_ROOT="`resolve_path \"$APP_ROOT\"`"
if [ ! -d "$APP_ROOT" ]; then
  echo "APP_ROOT is not defined or an accessible directory $APP_ROOT"
  exit 1
fi
# If APP_ROOT is defined and not empty we are also sure that the
# directory exists and is valid
echo "APP_ROOT: $APP_ROOT"
echo "SCRIPT_PATH: $SCRIPT_PATH"
echo "NW CFG PATH: $NW_CFG_PATH"
export APP_ROOT=$APP_ROOT


echo "Setting up Environment"
echo "==================================================================="
echo "General"
echo "- Application Root (APP_ROOT)                     : ${APP_ROOT}"
echo "- Current Script Path (SCRIPT_PATH)               : ${SCRIPT_PATH}"
echo "Network Parameters ${ROLE}"
if [ "${ROLE}" = "network1" ]; then
  echo " - Peer Org1 Port                                 : ${N1_PEER_ORG1_PORT}"
  echo " - Peer Org2 Port                                 : ${N1_PEER_ORG2_PORT}"
  echo " - Peer CouchDb0 Port                             : ${N1_COUCHDB0_PORT}"
  echo " - Peer CouchDb1 Port                             : ${N1_COUCHDB1_PORT}"
  echo " - CA Org1 Port                                   : ${N1_CA_ORG1_PORT}"
  echo " - CA Org2 Port                                   : ${N1_CA_ORG2_PORT}"
  echo " - Orderer Port                                   : ${N1_ORDERER_PORT}"
  echo " - Orderer CA Port                                : ${N1_CA_ORDERER_PORT}"
  export ORDERER_PORT=${N1_CA_ORDERER_PORT}
  export PEER_ORG1_PORT=${N1_PEER_ORG1_PORT}
  export PEER_ORG2_PORT=${N1_PEER_ORG2_PORT}
  export CHAINCODELISTENADDRESS=${N1_CHAINCODELISTEN_PORT}
  export NW_CFG_PATH=$NW_CFG_PATH
  export COUCHDB0_PORT=${N1_COUCHDB0_PORT}
  export COUCHDB1_PORT=${N1_COUCHDB1_PORT}
  export CA_ORG1_PORT=${N1_CA_ORG1_PORT}
  export CA_ORG2_PORT=${N1_CA_ORG2_PORT}
  export CA_ORDERER_PORT=${N1_CA_ORDERER_PORT}
else
  echo " - Peer Org1 Port                                 : ${N2_PEER_ORG1_PORT}"
  echo " - Peer Org2 Port                                 : ${N2_PEER_ORG2_PORT}"
  echo " - Peer CouchDb0 Port                             : ${N2_COUCHDB0_PORT}"
  echo " - Peer CouchDb1 Port                             : ${N2_COUCHDB1_PORT}"
  echo " - CA Org1 Port                                   : ${N2_CA_ORG1_PORT}"
  echo " - CA Org2 Port                                   : ${N2_CA_ORG2_PORT}"
  echo " - Orderer Port                                   : ${N2_ORDERER_PORT}"
  echo " - Orderer CA Port                                : ${N2_CA_ORDERER_PORT}"
  export ORDERER_PORT=${N2_CA_ORDERER_PORT}
  export PEER_ORG1_PORT=${N2_PEER_ORG1_PORT}
  export PEER_ORG2_PORT=${N2_PEER_ORG2_PORT}
  export CHAINCODELISTENADDRESS=${N2_CHAINCODELISTEN_PORT}
  export NW_CFG_PATH=$NW_CFG_PATH
  export COUCHDB0_PORT=${N2_COUCHDB0_PORT}
  export COUCHDB1_PORT=${N2_COUCHDB1_PORT}
  export CA_ORG1_PORT=${N2_CA_ORG1_PORT}
  export CA_ORG2_PORT=${N2_CA_ORG2_PORT}
  export CA_ORDERER_PORT=${N2_CA_ORDERER_PORT}
fi
echo " - Compose Env Path                               : ${SCRIPT_PATH}/${ROLE}.env"
echo " - Network Configuration Path                     : ${NW_CFG_PATH:-late bound}"
echo ""


# Are we generating crypto material with this command?
if [ ! -d "$NW_CFG_PATH/peerOrganizations" ]; then
  CRYPTO_MODE="with crypto from '${CRYPTO}'"
else
  CRYPTO_MODE=""
fi

# Determine mode of operation and printing out what we asked for
if [ "$MODE" == "up" ]; then
  echo "Starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE}' ${CRYPTO_MODE}"
  echo
elif [ "$MODE" == "createChannel" ]; then
  echo "Creating channel '${CHANNEL_NAME}'."
  echo
  echo "If network is not up, starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE} ${CRYPTO_MODE}"
  echo
elif [ "$MODE" == "down" ]; then
  echo "Stopping network"
  echo
elif [ "$MODE" == "clean" ]; then
  echo "Cleaning the network"
  echo
elif [ "$MODE" == "deployCC" ]; then
  echo "deploying chaincode on channel '${CHANNEL_NAME}'"
  echo
else
  printHelp
  exit 1
fi


if [ $ROLE == "network1" ]; then
  ROLE_FILE="network1.env"
  echo "Role File = $ROLE_FILE"
  cat $ROLE_FILE
  . base.env
  . network1.env
  echo "FABRIC_CFG_PATH = $FABRIC_CFG_PATH"
  echo "NW_CFG_PATH" = $NW_CFG_PATH
  rm docker.env
  cat base.env network1.env > network1.tmp.env
  echo "APP_ROOT=${APP_ROOT}" | cat - network1.tmp.env >  docker.env
elif [ $ROLE == "network2" ]; then
  ROLE_FILE="network2.env"
  echo "Role File = $ROLE_FILE"
  cat $ROLE_FILE
  . base.env
  . network2.env
  echo "FABRIC_CFG_PATH = $FABRIC_CFG_PATH"
  echo "NW_CFG_PATH" = $NW_CFG_PATH
  rm docker.env
  cat base.env network2.env > network2.tmp.env
  echo "APP_ROOT=${APP_ROOT}" | cat - network2.tmp.env >  docker.env
else
  echo "Invalid Role"
  exit 1
fi


if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "createChannel" ]; then
  networkUp
  createChannel
elif [ "${MODE}" == "deployCC" ]; then
  deployCC $CC_CHAIN_CODE $ORDERER_PORT
elif [ "${MODE}" == "down" ]; then
 networkDown
elif [ "${MODE}" == "clean" ]; then
 networkDown
else
  printHelp
  exit 1
fi
