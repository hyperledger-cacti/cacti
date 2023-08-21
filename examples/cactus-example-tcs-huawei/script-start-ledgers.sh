#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

ROOT_DIR="../.." # Path to cactus root dir
CONFIG_VOLUME_PATH="./etc/cactus" # Docker volume with shared configuration
WAIT_TIME=10 # How often to check container status
 
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

function copy_ethereum_validator_config() {
    echo ">> copy_ethereum_validator_config()"
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-go-ethereum-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio/"
    generate_certificate "GoEthereumCactusValidator" "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio/CA/"
    echo ">> copy_ethereum_validator_config() done."
}

function copy_tcs_config() {
    cp -fr ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config/* \
        "${CONFIG_VOLUME_PATH}/connector-tcs-huawei/"
    generate_certificate "TcsCactusValidator" "${CONFIG_VOLUME_PATH}/connector-tcs-huawei/CA/"
}

function start_tcs_agent(){
    echo ">> start_tcs_agent()"
    docker network create tcs_huawei_testnet_1x
    pushd ${ROOT_DIR}/tools/docker/tcs-huawei-testnet/agent/example
    docker-compose up > tcs-agent.log &
    popd
    echo ">> start_tcs_agent() done"
}

function start_ledgers() {
    prepare_certificate

    # Clear ./etc/cactus
    mkdir -p "${CONFIG_VOLUME_PATH}/"
    rm -fr ${CONFIG_VOLUME_PATH}/*

    # Copy cmd-socketio-config
    cp -f ./config/*.yaml "${CONFIG_VOLUME_PATH}/"

    # Start Ethereum
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-go-ethereum-socketio"
    start_ethereum_testnet
    copy_ethereum_validator_config

    # Start tcs-agent
    mkdir -p "${CONFIG_VOLUME_PATH}/connector-tcs-huawei"
    start_tcs_agent
    copy_tcs_config

}

function prepare_certificate(){
    mkdir  Server_Cert
    pushd ./Server_Cert
    openssl genrsa -out cakey.pem 2048
    openssl req -new -key cakey.pem -out ca.csr -subj "/C=CN/ST=myprovince/L=mycity/O=myorganization/OU=mygroup/CN=myCA"
    openssl x509 -req -days 365 -sha1 -extensions v3_ca -signkey cakey.pem -in ca.csr -out  cacert.pem

    openssl genrsa -out key.pem 2048
    openssl req -new -key key.pem -out server.csr -subj "/C=CN/ST=myprovince/L=mycity/O=myorganization/OU=mygroup/CN=myServer"
    openssl x509 -req -days 365 -sha1 -extensions v3_req -CA ./cacert.pem -CAkey ./cakey.pem -CAserial ca.srl -CAcreateserial -in server.csr -out cert.pem

    openssl genrsa  -out clikey.pem 2048
    openssl req -new -key clikey.pem -out client.csr -subj "/C=CN/ST=myprovince/L=mycity/O=myorganization/OU=mygroup/CN=myClient"
    openssl x509 -req -days 365 -sha1 -extensions v3_req -CA  ./cacert.pem -CAkey ./cakey.pem  -CAserial ./ca.srl -in client.csr -out clicert.pem

    openssl x509 -in clicert.pem -out client.crt
    openssl rsa -in clikey.pem -out client.key
    popd
    cp ./Server_Cert/cert.pem ./Server_Cert/key.pem   ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config
    mv ./Server_Cert  ${ROOT_DIR}/tools/docker/tcs-huawei-testnet/agent/example
}

start_ledgers

echo "All Done."
