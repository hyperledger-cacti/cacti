#!/bin/bash

directory=$(dirname $0)
cordaSimpleAppPath=$directory/../../../../samples/corda/fungible-house-token
version="1.0"
weaverVersion="1.2.4-alpha.4"

########## Corda Simple App ##############

echo "Building Fungible House Token App..."
if [[ $1 == "local" ]]; then
  if [[ ! -f $cordaSimpleAppPath/source/contracts/build/libs/contracts-$version.jar ]]; then
      echo "Please Build the fungible house token version $version to use local components."
  fi 
  if [[ ! -f $cordaSimpleAppPath/source/workflows/build/libs/workflows-$version.jar ]]; then
      echo "Please Build the fungible house token version $version to use local components."
  fi 
else
  cd $cordaSimpleAppPath
  make build || exit 1
  cd -
fi

echo "Copying Fungible House Token App..."
cp $cordaSimpleAppPath/source/contracts/build/libs/contracts-$version.jar $directory/../shared/artifacts
cp $cordaSimpleAppPath/source/workflows/build/libs/workflows-$version.jar $directory/../shared/artifacts

### Token SDK ###

wget https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/ci/ci-workflows/1.0/ci-workflows-1.0.jar -P $directory/../shared/artifacts
wget https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/tokens/tokens-contracts/1.2/tokens-contracts-1.2.jar -P $directory/../shared/artifacts
wget https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/tokens/tokens-workflows/1.2/tokens-workflows-1.2.jar -P $directory/../shared/artifacts

