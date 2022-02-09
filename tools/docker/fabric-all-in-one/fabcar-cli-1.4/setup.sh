#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

# Exit on error
set -e

FABRIC_CONTAINER_NAME=${CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME:-cartrade_faio2x_testnet}

if ! [ "$(docker inspect -f '{{.State.Running}}' ${FABRIC_CONTAINER_NAME})" == "true" ]
then
    echo "ERROR: Container '${FABRIC_CONTAINER_NAME}' must be running! Exit..."
    exit 1
fi

echo "Copy FabCar connection info from container to local storage"
echo "*********************************"
rm -fr ./connection.json
docker cp ${FABRIC_CONTAINER_NAME}:/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json ./connection.json
echo "Done!"

if node ./query.js &> /dev/null
then
    echo "Query already works - use current wallet"
    exit 0
fi

echo "Could not query the ledger with current wallet - clear it"
rm -rf ./wallet/*

echo -e "\nEnroll admin and appUser"
echo "*********************************"
node ./enrollAdmin.js
node ./registerUser.js
