#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir
WAIT_TIME=30 # How often to check container status
CONFIG_VOLUME_PATH="./etc/cactus" # Docker volume with shared configuration

# Fabric Env Variables
export CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME="cartrade_faio2x_testnet"
export CACTUS_FABRIC_ALL_IN_ONE_VERSION="2.2.0"
export CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP=1

function start_fabric_testnet() {
    echo ">> start_fabric_testnet()"
    pushd "${ROOT_DIR}/tools/docker/fabric-all-in-one"

    echo ">> Start Fabric ${CACTUS_FABRIC_ALL_IN_ONE_VERSION}..."
    docker-compose -f ./docker-compose-v2.x.yml build
    docker-compose -f ./docker-compose-v2.x.yml up -d
    sleep 1

    # Wait for fabric cotnainer to become healthy
    health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME})"
    while ! [ "${health_status}" == "healthy" ]
    do
        echo "Waiting for fabric container... current status => ${health_status}"
        sleep $WAIT_TIME
        health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME})"
    done
    echo ">> Fabric ${CACTUS_FABRIC_ALL_IN_ONE_VERSION} started."

    echo ">> Register admin and appUser..."
    pushd asset-transfer-basic-utils
    npm install
    ./setup.sh
    popd
    echo ">> Register done."

    echo ">> start_fabric_testnet() done."
    popd
}

function copy_fabric_tlsca() {
    echo ">> copy_fabric_tlsca()"
    docker cp "${CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME}:/fabric-samples/test-network/organizations/" \
        "${CONFIG_VOLUME_PATH}/connector-fabric-socketio/crypto-config/"
    echo ">> copy_fabric_tlsca() done."
}

function copy_fabric_validator_config() {
    echo ">> copy_fabric_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-fabric-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-fabric-socketio/"
    echo ">> copy_fabric_validator_config() done."

    echo ">> copy_fabric_wallet()"
    cp -fr "${ROOT_DIR}/tools/docker/fabric-all-in-one/asset-transfer-basic-utils/wallet" "${CONFIG_VOLUME_PATH}/connector-fabric-socketio/"
    echo ">> copy_fabric_wallet() done."
}

function start_ethereum_testnet() {
    pushd "${ROOT_DIR}/tools/docker/geth-testnet"
    ./script-start-docker.sh
    popd
}

function copy_ethereum_validator_config() {
    echo ">> copy_ethereum_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-go-ethereum-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio/"
    echo ">> copy_ethereum_validator_config() done."
}

function start_indy_testnet() {
    echo ">> start_indy_testnet()"
    pushd "${ROOT_DIR}/tools/docker/indy-testnet"
    echo ">> Start Indy pool..."
    docker-compose build
    docker-compose up -d
    popd
}

function copy_indy_validator_config() {
    echo ">> copy_indy_validator_config()"
    cp -fr ${ROOT_DIR}/packages-python/cactus_validator_socketio_indy/config/* "${CONFIG_VOLUME_PATH}/validator_socketio_indy/"
    echo ">> copy_indy_validator_config() done."
}

function copy_indy_validator_ca() {
    echo ">> copy_indy_validator_ca()"
    cp -fr "${ROOT_DIR}/packages-python/cactus_validator_socketio_indy/sample-CA/" "${CONFIG_VOLUME_PATH}/validator_socketio_indy/CA"
    echo ">> copy_indy_validator_ca() done."
}

function start_ledgers() {
    # Clear ./etc/cactus
    mkdir -p ${CONFIG_VOLUME_PATH}/
    rm -fr ${CONFIG_VOLUME_PATH}/*

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Fabric
    start_fabric_testnet
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-fabric-socketio"
    copy_fabric_tlsca
    copy_fabric_validator_config

    # Start Ethereum
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio"
    start_ethereum_testnet
    copy_ethereum_validator_config

    # Start Indy
    mkdir -p "${CONFIG_VOLUME_PATH}/validator_socketio_indy"
    start_indy_testnet
    copy_indy_validator_ca
    copy_indy_validator_config
}

start_ledgers
echo "All Done."