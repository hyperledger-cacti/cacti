#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

directory=$(dirname $0)
app=${1:-simple}
profile=${2:-"1-node"}
nw=${3:-Corda_Network}

simpleAppVersion="0.4"
houseTokenAppVersion="1.0"

. $directory/../constants.properties

parties="Notary PartyA PartyB PartyC"

echo "Starting Network: ${nw}, profile: ${profile}, with App: ${app} Cordapp..."

for party in ${parties}; do
  if [ "simple" = "$app" ]; then
    cp $directory/../shared/artifacts/contracts-kotlin-$simpleAppVersion.jar dev/${nw}/build/nodes/${party}/cordapps
    cp $directory/../shared/artifacts/workflows-kotlin-$simpleAppVersion.jar dev/${nw}/build/nodes/${party}/cordapps
  elif [ "house" = "$app" ]; then
    cp $directory/../shared/artifacts/contracts-$houseTokenAppVersion.jar dev/${nw}/build/nodes/${party}/cordapps
    cp $directory/../shared/artifacts/workflows-$houseTokenAppVersion.jar dev/${nw}/build/nodes/${party}/cordapps
    
    cp $directory/../shared/artifacts/tokens-contracts-$cordaTokenSDKVersion.jar dev/${nw}/build/nodes/${party}/cordapps
    cp $directory/../shared/artifacts/tokens-workflows-$cordaTokenSDKVersion.jar dev/${nw}/build/nodes/${party}/cordapps
    cp $directory/../shared/artifacts/ci-workflows-1.0.jar dev/${nw}/build/nodes/${party}/cordapps
  else
    echo "Cordapp not found" && exit 1
  fi
  
  cp $directory/../shared/artifacts/interop-contracts-$cactiVersion.jar dev/${nw}/build/nodes/${party}/cordapps
  cp $directory/../shared/artifacts/interop-workflows-$cactiVersion.jar dev/${nw}/build/nodes/${party}/cordapps
  
  cp $directory/../shared/artifacts/protos-java-kt-$cactiVersion.jar dev/${nw}/build/nodes/${party}/cordapps
done;

dockerProject="corda"
if [ "Corda_Network2" = "$nw" ]; then
    dockerProject="corda_network2"
fi

docker compose -f dev/${nw}/docker-compose.yml -p $dockerProject --profile $profile up -d
docker ps -a
