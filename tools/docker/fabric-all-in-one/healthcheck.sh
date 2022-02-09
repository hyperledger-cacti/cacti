#!/bin/sh

# Needed so that we have the "peer" binary on our path
export PATH=/fabric-samples/bin/:$PATH

# Source the utility that we use to parse semantic version strings in bash
. /semver.sh

function main()
{
  local MAJOR=0
  local MINOR=0
  local PATCH=0
  local SPECIAL=""
  semverParseInto "${FABRIC_VERSION}" MAJOR MINOR PATCH SPECIAL

  if [ "$MAJOR" -gt 1 ]; then
    # Major version is 2 or newer (we'll deal with 3.x when it is released)
    cd /fabric-samples/test-network/

    if [ "${FABRIC_CHAINCODE}" == "fabcar" ]; then
      peer chaincode query -C mychannel -n fabcar -c '{"Args": [], "Function": "queryAllCars"}'
    else
      # default: asset-transfer-basic
      peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
    fi
  else
    # Major version is 1.x or earlier (assumption is 1.4.x only)
    docker exec cli peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
  fi
}

main
