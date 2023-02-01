#!/bin/bash

directory=$(dirname $0)
nw=${1:-Corda_Network}

echo "Creating Network: ${nw}..."
cp -r $directory/../shared/${nw} dev/${nw}/build

# ./gradlew clean deployNodes prepareDockerNodes

