#!/bin/bash

PROTOS_TAG=${PROTOS_TAG:-'v1.16'}


# check if local proto dir exists
if [ -d "./protos" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of protos directory"
    (cd protos &&  git fetch && git checkout tags/"$PROTOS_TAG")
else
    # if not, clone repo and checkout specified tag
    echo "Local protos directory doesn't exist, cloning..."
    (git clone https://github.ibm.com:dlt-interoperability/interop-protos.git protos && cd protos && git checkout tags/"$PROTOS_TAG")
fi

# check if local proto dir exists
if [ -d "./fabric-protos" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of fabric-protos directory"
    (cd fabric-protos && git pull && git checkout release-2.1)
else
    # if not, clone repo and checkout specified tag
    echo "Local fabric-protos directory doesn't exist, cloning..."
    (git clone https://github.com/hyperledger/fabric-protos.git fabric-protos && cd fabric-protos && git checkout release-2.1)
fi

