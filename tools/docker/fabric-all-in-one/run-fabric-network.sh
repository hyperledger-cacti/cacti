#!/bin/sh
set -e

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

  tar -cC '/etc/hyperledger/fabric/fabric-peer/' . | docker load
  tar -cC '/etc/hyperledger/fabric/fabric-orderer/' . | docker load
  tar -cC '/etc/hyperledger/fabric/fabric-ccenv/' . | docker load
  tar -cC '/etc/hyperledger/fabric/fabric-tools/' . | docker load
  tar -cC '/etc/hyperledger/fabric/fabric-ca/' . | docker load

  echo "[FabricAIO] >>> Parsed MAJOR version of Fabric as ${MAJOR}"

  if [ "$MAJOR" -gt 1 ]; then
    # Major version is 2 or newer (we'll deal with 3.x when it is released)

    # Fabric 2.x has this new image called fabric-baseos so we need to load that
    # as well when we detect that we are running Fabric 2.x not 1.x
    tar -cC '/etc/hyperledger/fabric/fabric-nodeenv/' . | docker load
    tar -cC '/etc/hyperledger/fabric/fabric-baseos/' . | docker load
    tar -cC '/etc/hyperledger/fabric/fabric-couchdb/' . | docker load
    tar -cC '/etc/couchdb/' . | docker load

    /install-fabric.sh --fabric-version ${FABRIC_VERSION} --ca-version ${CA_VERSION} binary samples

    cd /fabric-samples/test-network/
    echo "[FabricAIO] >>> pulling up test network..."
    ./network.sh up -ca
    echo "[FabricAIO] >>> test network pulled up OK."
    ./network.sh createChannel -c mychannel
    echo "[FabricAIO] >>> channel created OK."

    if [ -n "$CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP" ]; then
    echo "[FabricAIO] >>> Deploy CC with loose endorsment policy."
      ./network.sh deployCC -ccn basic  -ccep "OR('Org1MSP.member','Org2MSP.member')" -ccp ../asset-transfer-basic/chaincode-go -ccl go
    else
      ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
    fi

    sleep 10

    peer chaincode invoke \
      -o localhost:7050 \
      --ordererTLSHostnameOverride orderer.example.com \
      --tls \
      --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
      -C mychannel \
      -n basic \
      --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
      --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
      -c '{"function":"InitLedger","Args":[]}'

    echo "[FabricAIO] >>> contract deployed OK."
    echo "[FabricAIO] >>> container healthcheck should begin passing now"
  else
    /bootstrap.sh ${FABRIC_VERSION} ${CA_VERSION} -b -s
    # Major version is 1.x or earlier (assumption is 1.4.x only)
    cd /fabric-samples/fabcar/

    if [ -n "$CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP" ]; then
      echo "[FabricAIO] >>> PATCH - Changing to loose endorsment policy."
      sed -i "s/AND('Org1MSP.member','Org2MSP.member')/OR('Org1MSP.member','Org2MSP.member')/g" ./startFabric.sh
    fi

    ./startFabric.sh
  fi
}

main
