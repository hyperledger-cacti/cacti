#!/bin/bash

directory=$(dirname $0)
app=${1:-simple}
local=$2
weaverCordaVersion="1.2.12"
weaverProtosVersion="1.5.6"

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
  tokenVersion="1.2"

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

  (cd $directory/../shared/artifacts && curl -O https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/ci/ci-workflows/1.0/ci-workflows-1.0.jar) || exit 1
  (cd $directory/../shared/artifacts && curl -O https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/tokens/tokens-contracts/$tokenVersion/tokens-contracts-$tokenVersion.jar) || exit 1
  (cd $directory/../shared/artifacts && curl -O https://software.r3.com/artifactory/corda-lib/com/r3/corda/lib/tokens/tokens-workflows/$tokenVersion/tokens-workflows-$tokenVersion.jar) || exit 1

else
  echo "Cordapp not found" && exit 1
fi

######### Corda Interop App ###########

if [[ $local == "local" ]]; then
  if [[ ! -f $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$weaverProtosVersion.jar ]]; then
      echo "Please Build the weaver-protos-java-kt version $weaverVersion to use local components."
  fi  
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$weaverCordaVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $weaverVersion to use local components."
  fi 
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$weaverCordaVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $weaverVersion to use local components."
  fi 
  echo "Copying Corda Interop App..."
  cp $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$weaverCordaVersion.jar $directory/../shared/artifacts
  cp $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$weaverCordaVersion.jar $directory/../shared/artifacts
  cp $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$weaverProtosVersion.jar $directory/../shared/artifacts
else
  file="$directory/../github.properties"
  if [ -f $file ]; then
    username=`sed '/^\#/d' $file | grep 'username=' | cut -d "=" -f2-`
    password=`sed '/^\#/d' $file | grep 'password=' | cut -d "=" -f2-`
    pkgurl=`sed '/^\#/d' $file | grep 'url=' | cut -d "=" -f2-`
    baseUrl="$pkgurl/com/weaver"
    echo "Downloading Corda Interop App from $baseUrl ..."
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/corda/app/interop/interop-contracts/$weaverCordaVersion/interop-contracts-$weaverCordaVersion.jar) || exit 1
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/corda/app/interop/interop-workflows/$weaverCordaVersion/interop-workflows-$weaverCordaVersion.jar) || exit 1
    (cd $directory/../shared/artifacts && curl --location -u $username:$password -O $baseUrl/protos-java-kt/$weaverProtosVersion/protos-java-kt-$weaverProtosVersion.jar) || exit 1
  else
    echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
  fi
fi

