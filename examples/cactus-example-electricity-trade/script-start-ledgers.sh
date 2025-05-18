#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir
CONFIG_VOLUME_PATH="./etc/cactus" # Docker volume with shared configuration
WAIT_TIME=10 # How often to check container status

export CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME="sawtooth_all_in_one_ledger_1x"

# Cert options
CERT_CURVE_NAME="prime256v1"
CERT_COUNTRY="JP"
CERT_STATE="Tokyo"
CERT_LOCALITY="Minato-Ku"
CERT_ORG="CactusSamples"

# generate_certificate <common-name> <destination>
function generate_certificate() {
    # Check OpenSSL command existance
    if ! openssl version > /dev/null; then
        echo "Could not execute [openssl version], check if OpenSSL tool is available on the system."
        exit 1;
    fi

    # Check input parameters
    ARGS_NUMBER=2
    if [ "$#" -lt "$ARGS_NUMBER" ]; then
        echo "generate_certificate called with wrong number of arguments (expected - $ARGS_NUMBER, actual - $#)";
        exit 2
    fi

    common_name=$1
    destination=$2
    subject="/C=$CERT_COUNTRY/ST=$CERT_STATE/L=$CERT_LOCALITY/O=$CERT_ORG/CN=$common_name"
    echo "Create new cert in '${destination}' with subject '${subject}'"

    # Crete destination path
    if [ ! -d "$destination" ]; then
        echo "Re-create destination dir..."
        rm -rf "$destination"
        mkdir -p "$destination"
    fi

    keyPath="${destination}/connector.priv"
    csrPath="${destination}/connector.csr"
    certPath="${destination}/connector.crt"

    # Generate keys
    openssl ecparam -genkey -name "$CERT_CURVE_NAME" -out "$keyPath"
    openssl req -new -sha256 -key "$keyPath" -out "$csrPath" -subj "$subject"
    openssl req -x509 -sha256 -days 365 -key "$keyPath" -in "$csrPath" -out "$certPath"
}

function start_ethereum_testnet() {
    pushd "${ROOT_DIR}/tools/docker/geth-testnet"
    ./script-start-docker.sh
    popd
}

function start_sawtooth_testnet() {
    pushd "${ROOT_DIR}/tools/docker/sawtooth-all-in-one"
    ./script-start-docker.sh
    popd

    # Wait for fabric cotnainer to become healthy
    health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME})"
    while ! [ "${health_status}" == "healthy" ]
    do
        echo "Waiting for sawtooth container... current status => ${health_status}"
        sleep $WAIT_TIME
        health_status="$(docker inspect -f '{{.State.Health.Status}}' ${CACTUS_SAWTOOTH_LEDGER_CONTAINER_NAME})"
    done
    echo ">> Sawtooth ${CACTUS_FABRIC_ALL_IN_ONE_VERSION} started."
}

function start_ledgers() {
    # Clear ./etc/cactus
    mkdir -p "${CONFIG_VOLUME_PATH}/"
    rm -fr ${CONFIG_VOLUME_PATH}/*

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Ethereum
    start_ethereum_testnet

    # Start Sawtooth
    start_sawtooth_testnet
}

start_ledgers
echo "All Done."
