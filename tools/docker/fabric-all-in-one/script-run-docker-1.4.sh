#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

# Description:
#  Helper script to run fabric-all-in-one and publish
#  FabCar ports to local environment (used by example apps)

# Exit on error
set -e

IMAGE_NAME=faio14x
DOCKERFILE=Dockerfile_v1.4.x
FABRIC_VERSION=1.4.8
CONTAINER_NAME=fabcar14_sample_setup

# Start docker environment for Fabric testnets
if ! [ "$(docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME})" == "true" ]
then
    DOCKER_BUILDKIT=1 docker build . -f ${DOCKERFILE} -t ${IMAGE_NAME}

    rm -rf ./fabcar-cli-1.4/wallet

    ## PORTS
    # 4022 - SSH
    # 7051 - peer0.org1.example.com
    # 8051 - peer1.org1.example.com
    # 7054 - ca.org1.example.com
    # 7050 - orderer.example.com
    docker run --detach --privileged \
        -p 4022:22 \
        -p 7051:7051 \
        -p 8051:8051 \
        -p 7054:7054 \
        -p 7050:7050 \
        --name ${CONTAINER_NAME} \
        --env FABRIC_VERSION=${FABRIC_VERSION} \
        ${IMAGE_NAME}
fi

# Wait for fabric cotnainer to become healthy
health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CONTAINER_NAME})"
while ! [ "${health_status}" == "healthy" ]
do
    echo "Waiting for fabric container... current status => ${health_status}"
    sleep 30
    health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CONTAINER_NAME})"
done

echo "Fabric 1.4 FabCar started."
