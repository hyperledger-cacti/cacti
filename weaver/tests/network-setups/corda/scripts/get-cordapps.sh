#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

directory=$(dirname $0)
app=${1:-simple}
local=$2

. $directory/../constants.properties

if [ "simple" = "$app" ]; then
  cordappPath=$directory/../../../../samples/corda/corda-simple-application
  simpleAppVersion="0.4"

  ########## Corda Simple App ##############

  echo "Building Corda Simple App..."
  if [[ $local == "local" ]]; then
    if [[ ! -f $cordappPath/contracts-kotlin/build/libs/contracts-kotlin-$simpleAppVersion.jar ]]; then
        echo "Please Build the corda simple application version $simpleAppVersion to use local components."
    fi 
    if [[ ! -f $cordappPath/workflows-kotlin/build/libs/workflows-kotlin-$simpleAppVersion.jar ]]; then
        echo "Please Build the corda simple application version $simpleAppVersion to use local components."
    fi 
  else
    file="$directory/../github.properties"
    if [ -f $file ]; then
      cp $file $cordappPath/
      cd $cordappPath
      make build || exit 1
      cd -
    else
      echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
    fi
  fi

  echo "Copying Corda Simple App..."
  cp $cordappPath/contracts-kotlin/build/libs/contracts-kotlin-$simpleAppVersion.jar $directory/../shared/artifacts
  cp $cordappPath/workflows-kotlin/build/libs/workflows-kotlin-$simpleAppVersion.jar $directory/../shared/artifacts

elif [ "house" = "$app" ]; then
  cordappPath=$directory/../../../../samples/corda/fungible-house-token
  houseTokenAppVersion="1.0"

  ########## Fungible House Token App ##############

  echo "Building Fungible House Token App..."
  if [[ $local == "local" ]]; then
    if [[ ! -f $cordappPath/source/contracts/build/libs/contracts-$houseTokenAppVersion.jar ]]; then
        echo "Please Build the fungible house token version $houseTokenAppVersion to use local components."
    fi 
    if [[ ! -f $cordappPath/source/workflows/build/libs/workflows-$houseTokenAppVersion.jar ]]; then
        echo "Please Build the fungible house token version $houseTokenAppVersion to use local components."
    fi 
  else
    file="$directory/../github.properties"
    if [ -f $file ]; then
      cp $file $cordappPath/
      cd $cordappPath
      make build || exit 1
      cd -
    else
      echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
    fi
  fi

  echo "Copying Fungible House Token App..."
  cp $cordappPath/source/contracts/build/libs/contracts-$houseTokenAppVersion.jar $directory/../shared/artifacts
  cp $cordappPath/source/workflows/build/libs/workflows-$houseTokenAppVersion.jar $directory/../shared/artifacts

  ### Token SDK ###

  (cd $directory/../shared/artifacts && curl -O https://download.corda.net/maven/corda-lib/com/r3/corda/lib/ci/ci-workflows/1.0/ci-workflows-1.0.jar) || exit 1
  (cd $directory/../shared/artifacts && curl -O https://download.corda.net/maven/corda-lib/com/r3/corda/lib/tokens/tokens-contracts/$cordaTokenSDKVersion/tokens-contracts-$cordaTokenSDKVersion.jar) || exit 1
  (cd $directory/../shared/artifacts && curl -O https://download.corda.net/maven/corda-lib/com/r3/corda/lib/tokens/tokens-workflows/$cordaTokenSDKVersion/tokens-workflows-$cordaTokenSDKVersion.jar) || exit 1

else
  echo "Cordapp not found" && exit 1
fi

######### Corda Interop App ###########

if [[ $local == "local" ]]; then
  if [[ ! -f $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$cactiVersion.jar ]]; then
      echo "Please Build the protos-java-kt version $cactiVersion to use local components."
  fi  
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$cactiVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $cactiVersion to use local components."
  fi 
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$cactiVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $cactiVersion to use local components."
  fi 
  echo "Copying Corda Interop App..."
  cp $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$cactiVersion.jar $directory/../shared/artifacts
  cp $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$cactiVersion.jar $directory/../shared/artifacts
  cp $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$cactiVersion.jar $directory/../shared/artifacts
else
  file="$directory/../github.properties"
  if [ -f $file ]; then
    username=`sed '/^\#/d' $file | grep 'username=' | cut -d "=" -f2-`
    password=`sed '/^\#/d' $file | grep 'password=' | cut -d "=" -f2-`
    pkgurl=`sed '/^\#/d' $file | grep 'url=' | cut -d "=" -f2-`
    baseUrl="$pkgurl/org/hyperledger/cacti/weaver"
    echo "Downloading Corda Interop App from $baseUrl ..."
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/imodule/corda/interop-contracts/$cactiVersion/interop-contracts-$cactiVersion.jar) || exit 1
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/imodule/corda//interop-workflows/$cactiVersion/interop-workflows-$cactiVersion.jar) || exit 1
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/protos/protos-java-kt/$cactiVersion/protos-java-kt-$cactiVersion.jar) || exit 1
  else
    echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
  fi
fi

