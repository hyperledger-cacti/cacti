#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir

function start_cartrade_ledgers() {
    # Will also copy the configs to ./etc/cactus
    ../cartrade/script-start-ledgers.sh
}

function start_indy_testnet() {
    echo ">> start_indy_testnet()"
    pushd "${ROOT_DIR}/tools/docker/indy-testnet"
    echo ">> Start Indy pool..."
    docker-compose build
    docker-compose up -d
    popd
}

function start_ledgers() {
    # Start Fabric and Ethereum
    start_cartrade_ledgers

    # Start Indy
    start_indy_testnet
}

start_ledgers
echo "All Done."
