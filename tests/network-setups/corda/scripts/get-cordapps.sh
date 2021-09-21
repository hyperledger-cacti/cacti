#!/bin/bash

directory=$(dirname $0)
cordaSimpleAppPath=$directory/../../../../samples/corda/corda-simple-application
simpleAppVersion="0.4"
weaverVersion="1.2.4-alpha.1"

########## Corda Simple App ##############

echo "Building Corda Simple App..."
if [[ $1 == "local" ]]; then
  if [[ ! -f $cordaSimpleAppPath/contracts-kotlin/build/libs/contracts-kotlin-$simpleAppVersion.jar ]]; then
      echo "Please Build the corda simple application version $simpleAppVersion to use local components."
  fi 
  if [[ ! -f $cordaSimpleAppPath/workflows-kotlin/build/libs/workflows-kotlin-$simpleAppVersion.jar ]]; then
      echo "Please Build the corda simple application version $simpleAppVersion to use local components."
  fi 
else
  file="$directory/../github.properties"
  if [ -f $file ]; then
    cp $file $cordaSimpleAppPath/
    cd $cordaSimpleAppPath
    make build || exit 1
    cd -
  else
    echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
  fi
fi

echo "Copying Corda Simple App..."
cp $cordaSimpleAppPath/contracts-kotlin/build/libs/contracts-kotlin-$simpleAppVersion.jar $directory/../artifacts
cp $cordaSimpleAppPath/workflows-kotlin/build/libs/workflows-kotlin-$simpleAppVersion.jar $directory/../artifacts

######### Corda Interop App ###########

if [[ $1 == "local" ]]; then
  if [[ ! -f $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$weaverVersion.jar ]]; then
      echo "Please Build the weaver-protos-java-kt version $weaverVersion to use local components."
  fi  
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$weaverVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $weaverVersion to use local components."
  fi 
  if [[ ! -f $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$weaverVersion.jar ]]; then
      echo "Please Build the corda-interop-app version $weaverVersion to use local components."
  fi 
  echo "Copying Corda Interop App..."
  cp $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$weaverVersion.jar $directory/../artifacts
  cp $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$weaverVersion.jar $directory/../artifacts
  cp $directory/../../../../common/protos-java-kt/build/libs/protos-java-kt-$weaverVersion.jar $directory/../artifacts
else
  file="$directory/../github.properties"
  if [ -f $file ]; then
    username=`sed '/^\#/d' $file | grep 'username=' | cut -d "=" -f2-`
    password=`sed '/^\#/d' $file | grep 'password=' | cut -d "=" -f2-`
    pkgurl=`sed '/^\#/d' $file | grep 'url=' | cut -d "=" -f2-`
    baseUrl="$pkgurl/com/weaver"
    echo "Downloading Corda Interop App from $baseUrl ..."
    (cd $directory/../artifacts && curl --location -u $username:$password -O $baseUrl/corda/app/interop/interop-contracts/$weaverVersion/interop-contracts-$weaverVersion.jar) || exit 1
    (cd $directory/../artifacts && curl --location -u $username:$password -O $baseUrl/corda/app/interop/interop-workflows/$weaverVersion/interop-workflows-$weaverVersion.jar) || exit 1
    (cd $directory/../artifacts && curl --location -u $username:$password -O $baseUrl/protos-java-kt/$weaverVersion/protos-java-kt-$weaverVersion.jar) || exit 1
  else
    echo Please copy the github.properties.template file as github.properties and replace placeholders with Github credentials.
  fi
fi

