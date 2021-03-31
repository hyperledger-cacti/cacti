#!/bin/bash

TAG='v1.16'

# check if local proto dir exists
directory=$(dirname $0)
if [ -d "$directory/../proto" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of proto directory"
    (cd $directory/../proto && git fetch && git checkout tags/"$TAG")
else
    # if not, clone repo and checkout specified tag
    echo "Local proto directory doesn't exist, cloning..."
    (git clone https://github.ibm.com:dlt-interoperability/interop-protos.git $directory/../proto && cd $directory/../proto && git checkout tags/"$TAG")
fi

# check if local proto dir exists
if [ -d "$directory/../fabric-protos" ]
then
    # if yes, cd into dir, git fetch and checkout specified tag
    echo "Updating local copy of fabric-protos directory"
    (cd "$directory/../fabric-protos" && git pull && git checkout release-2.1)
else
    # if not, clone repo and checkout specified tag
    echo "Local fabric-protos directory doesn't exist, cloning..."
    (git clone https://github.com:hyperledger/fabric-protos.git $directory/../fabric-protos && cd $directory/../fabric-protos && git checkout release-2.1)
fi
