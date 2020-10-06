#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
set -o xtrace

main() {

  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/peer/users/Admin@org1.cactus.stream/msp

  export CORE_PEER_ADDRESS=localhost:7051
  export CORE_VM_DOCKER_ATTACHSTDOUT=true
  export FABRIC_LOGGING_SPEC=DEBUG

  peer channel create --orderer localhost:7050 -c mychannel -f /etc/hyperledger/fabric/config/channel.tx

  peer channel join -b mychannel.block
}

main

