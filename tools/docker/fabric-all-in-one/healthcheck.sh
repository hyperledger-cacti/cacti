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
    peer chaincode query -C mychannel -n basic -c '{"Args": [], "Function": "GetAllAssets"}'
    peer chaincode query -C mychannel -n basic -c '{"Args": ["asset1"], "Function": "ReadAsset"}'
  else
    # Major version is 1.x or earlier (assumption is 1.4.x only)
    docker exec cli peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
  fi
}

main
