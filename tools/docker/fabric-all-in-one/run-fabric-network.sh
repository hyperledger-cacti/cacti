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

  tar -cC '/etc/hyperledger/fabric/' . | docker load

  /bootstrap.sh ${FABRIC_VERSION} ${CA_VERSION} -b -s

  echo "[FabricAIO] >>> Parsed MAJOR version of Fabric as ${MAJOR}"

  if [ "$MAJOR" -gt 1 ]; then
    # Major version is 2 or newer (we'll deal with 3.x when it is released)
    cd /fabric-samples/test-network/
    echo "[FabricAIO] >>> pulling up test network..."
    ./network.sh up -ca
    echo "[FabricAIO] >>> test network pulled up OK."
    ./network.sh createChannel -c mychannel
    echo "[FabricAIO] >>> channel created OK."
    ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
    echo "[FabricAIO] >>> contract deployed OK."
    echo "[FabricAIO] >>> container healthcheck should begin passing in about 5-15 seconds..."
  else
    # Major version is 1.x or earlier (assumption is 1.4.x only)
    cd /fabric-samples/fabcar/
    ./startFabric.sh
  fi

}

main
