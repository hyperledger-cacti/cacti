#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir
CONFIG_VOLUME_PATH="./etc/cactus" # Docker volume with shared configuration

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

function start_sawtooth_testnet() {
    pushd "${ROOT_DIR}/tools/docker/sawtooth-testnet"
    ./script-start-docker.sh
    popd

    # Patch create_batch with our logic (will generate electricity usage)
    docker cp ./tools/create_batch/create_batch3.py sawtooth-shell-default:/usr/lib/python3/dist-packages/sawtooth_intkey/client_cli/create_batch.py
}

function copy_sawtooth_validator_config() {
    echo ">> copy_sawtooth_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-sawtooth-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-sawtooth-socketio/"
    echo ">> copy_sawtooth_validator_config() done."
}

function start_ledgers() {
    # Clear ./etc/cactus
    mkdir -p "${CONFIG_VOLUME_PATH}/"
    rm -fr ${CONFIG_VOLUME_PATH}/*

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Ethereum
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio"
    start_ethereum_testnet
    copy_ethereum_validator_config

    # Start Sawtooth
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-sawtooth-socketio"
    start_sawtooth_testnet
    copy_sawtooth_validator_config
}

start_ledgers
echo "All Done."
