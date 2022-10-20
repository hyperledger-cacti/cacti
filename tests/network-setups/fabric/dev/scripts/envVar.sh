#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This is a collection of bash functions used by different scripts
#NWPATH="$1"
#P_ADD="$1"

export NW_NAME="$3"
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=$NW_PATH/ordererOrganizations/${NW_NAME}.com/orderers/orderer.${NW_NAME}.com/msp/tlscacerts/tlsca.${NW_NAME}.com-cert.pem
export PEER0_ORG1_CA=$NW_PATH/peerOrganizations/org1.${NW_NAME}.com/peers/peer0.org1.${NW_NAME}.com/tls/ca.crt
export PEER0_ORG2_CA=$NW_PATH/peerOrganizations/org2.${NW_NAME}.com/peers/peer0.org2.${NW_NAME}.com/tls/ca.crt
#export PEER0_ORG3_CA=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

# Set OrdererOrg.Admin globals
setOrdererGlobals() {
  export CORE_PEER_LOCALMSPID="OrdererMSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$NW_PATH/ordererOrganizations/${NW_NAME}.com/orderers/orderer.${NW_NAME}.com/msp/tlscacerts/tlsca.network1.com-cert.pem
  export CORE_PEER_MSPCONFIGPATH=$NW_PATH/ordererOrganizations/${NW_NAME}.com/users/Admin@${NW_NAME}.com/msp
}

# Set environment variables for the peer org
setGlobals() {
  local USING_ORG=""
  if [ -z "$OVERRIDE_ORG" ]; then
    USING_ORG=$1
  else
    USING_ORG="${OVERRIDE_ORG}"
  fi
  echo "Using organization ${USING_ORG}  NW - $3"
  if [ $USING_ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
    export CORE_PEER_MSPCONFIGPATH=$NW_PATH/peerOrganizations/org1."$3".com/users/Admin@org1."$3".com/msp
    export CORE_PEER_ADDRESS="localhost:"${2}
  elif [ $USING_ORG -eq 2 ]; then
    export CORE_PEER_LOCALMSPID="Org2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
    export CORE_PEER_MSPCONFIGPATH=$NW_PATH/peerOrganizations/org2."$3".com/users/Admin@org2."$3".com/msp
    export CORE_PEER_ADDRESS="localhost:"${2}
  else
    echo "================== ERROR !!! ORG Unknown =================="
    exit 1
  fi

  if [ "$VERBOSE" == "true" ]; then
    env | grep CORE
  fi
}

# parsePeerConnectionParameters $@
# Helper function that sets the peer connection parameters for a chaincode
# operation
parsePeerConnectionParameters() {

  PEER_CONN_PARMS=""
  PEERS=""
  #echo "In parsePeerConnectionParameters : "$CORE_PEER_ADDRESS
  while [ "$#" -gt 0 ]; do
    setGlobals $1 $2 $3
    PEER="peer0.org$1"
    ## Set peer adresses
    PEERS="$PEERS $PEER"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses $CORE_PEER_ADDRESS"
    ## Set path to TLS certificate
    TLSINFO=$(eval echo "--tlsRootCertFiles \$PEER0_ORG$1_CA")
    PEER_CONN_PARMS="$PEER_CONN_PARMS $TLSINFO"
    echo "PEER_CONN_PARMS: $PEER_CONN_PARMS"
    # shift by 3 to get to the next organization
    shift 3
  done
  # remove leading space for output
  PEERS="$(echo -e "$PEERS" | sed -e 's/^[[:space:]]*//')"
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}
