#!/bin/bash

directory=$(dirname $0)
if [ -z $WEAVER_ROOT ]
then
    WEAVER_ROOT=$directory/../../..
fi

# check if local proto dir exists
if [ -d "./protos" ]
then
    echo "Deleting local copy of protos directory to copy latest from main folder"
    rm -rf protos
fi
cp -r $WEAVER_ROOT/common/protos protos
