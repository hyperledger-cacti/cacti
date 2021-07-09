#!/bin/bash

mkdir -p tmp

directory=$(dirname $0)
if [ -z $WEAVER_ROOT ]
then
    WEAVER_ROOT=$directory/../..
fi
FABRIC_PROTOS_VERSION=${FABRIC_PROTOS_VERSION:-'2.1'}

# check if local proto dir exists
if [ -d "./tmp/protos" ]
then
    echo "Deleting local copy of protos directory to copy latest from main folder"
    rm -rf ./tmp/protos
fi
cp -r $WEAVER_ROOT/common/interop-protos tmp/protos


# check if local fabric-protos dir exists
if [ -d "./tmp/fabric-protos" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of fabric-protos directory"
    (cd tmp/fabric-protos && git pull && git checkout release-${FABRIC_PROTOS_VERSION})
else
    # if not, clone repo and checkout specified tag
    echo "Local fabric-protos directory doesn't exist, cloning..."
    (git clone https://github.com/hyperledger/fabric-protos.git tmp/fabric-protos && cd tmp/fabric-protos && git checkout release-${FABRIC_PROTOS_VERSION})
fi

