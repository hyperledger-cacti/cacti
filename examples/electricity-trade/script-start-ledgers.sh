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

function start_sawtooth_testnet() {
    pushd "${ROOT_DIR}/tools/docker/sawtooth-testnet"
    ./script-start-docker.sh
    popd

    # Patch create_batch with our logic (will generate electricity usage)
    docker cp ./tools/create_batch/create_batch3.py sawtooth-shell-default:/usr/lib/python3/dist-packages/sawtooth_intkey/client_cli/create_batch.py
}

function start_ledgers() {
    # Clear ./etc/cactus
    mkdir -p "${CONFIG_VOLUME_PATH}/"
    rm -fr "${CONFIG_VOLUME_PATH}/*"

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Ethereum
    start_ethereum_testnet

    # Start Sawtooth
    start_sawtooth_testnet
}

start_ledgers
echo "All Done."
