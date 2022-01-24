#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

# Exit on error
set -e

FABRIC_CONTAINER_NAME=fabcar14_sample_setup

if ! [ "$(docker inspect -f '{{.State.Running}}' ${FABRIC_CONTAINER_NAME})" == "true" ]
then
    echo "ERROR: Container '${FABRIC_CONTAINER_NAME}' must be running! Exit..."
    exit 1
fi

echo "Copy FabCar connection info from container to local storage"
echo "*********************************"
rm -fr ./connection.json
docker cp ${FABRIC_CONTAINER_NAME}:/fabric-samples/first-network/connection-org1.json ./connection.json
echo "Done!"

echo -e "\nEnroll admin and user1"
echo "*********************************"
node ./enrollAdmin.js
node ./registerUser.js
