#!/bin/bash

directory=$(dirname $0)
cordaSimpleAppPath=$directory/../../../../samples/corda/corda-simple-application
simpleAppVersion="0.4"
interopAppVersion="1.2.1"

########## Corda Simple App ##############

echo "Building Corda Simple App..."
if [[ $1 == "local" ]]; then
  cd $cordaSimpleAppPath
  make build-local
  cd -
else
  file="$directory/../artifactory.properties"
  if [ -f $file ]; then
    cp $file $cordaSimpleAppPath/
    cd $cordaSimpleAppPath
    make build
    cd -
  else
    echo Please copy the artifactory.properties.template file as artifactory.properties and replace placeholders with Artifactory credentials.
  fi
fi

echo "Copying Corda Simple App..."
cp $directory/../../../../samples/corda/corda-simple-application/contracts-kotlin/build/libs/contracts-kotlin-$simpleAppVersion.jar $directory/../artifacts
cp $directory/../../../../samples/corda/corda-simple-application/workflows-kotlin/build/libs/workflows-kotlin-$simpleAppVersion.jar $directory/../artifacts

######### Corda Interop App ###########

if [[ $1 == "local" ]]; then
  echo "Copying Corda Interop App..."
  cd $directory/../../../../core/network/corda-interop-app
  make build-local
  cd -
  cp $directory/../../../../core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-$interopAppVersion.jar $directory/../artifacts
  cp $directory/../../../../core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-$interopAppVersion.jar $directory/../artifacts
else
  file="$directory/../artifactory.properties"
  if [ -f $file ]; then
    username=`sed '/^\#/d' $file | grep 'username=' | cut -d "=" -f2-`
    password=`sed '/^\#/d' $file | grep 'password=' | cut -d "=" -f2-`
    pkgurl=`sed '/^\#/d' $file | grep 'url=' | cut -d "=" -f2-`
    baseUrl="$pkgurl/com/weaver/corda/app/interop"
    echo "Downloading Corda Interop App from $baseUrl ..."
    set -x
    (cd $directory/../artifacts && curl --location -u $username:$password -O $baseUrl/interop-contracts/$interopAppVersion/interop-contracts-$interopAppVersion.jar)
    (cd $directory/../artifacts && curl --location -u $username:$password -O $baseUrl/interop-contracts/$interopAppVersion/interop-workflows-$interopAppVersion.jar)
    set +x
  else
    echo Please copy the artifactory.properties.template file as artifactory.properties and replace placeholders with Artifactory credentials.
  fi
fi

