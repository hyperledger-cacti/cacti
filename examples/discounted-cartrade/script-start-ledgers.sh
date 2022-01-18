#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

# Exit on error
set -e

FABRIC_CONTAINER_NAME=fabcar14_sample_setup

pushd ../..

## Run Go-Ethereum Ledger
pushd ./tools/docker/geth-testnet
./script-start-docker.sh
popd

## RunFabric Ledger
pushd ./tools/docker/fabric-all-in-one
./script-run-docker-1.4.sh
popd

popd

# Copy TLSCAs to connect peer and orderer
mkdir -p ./crypto-config/
rm -fr ./crypto-config/*
docker cp ${FABRIC_CONTAINER_NAME}:/fabric-samples/first-network/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem ./crypto-config/
docker cp ${FABRIC_CONTAINER_NAME}:/fabric-samples/first-network/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem ./crypto-config/

# Enroll users and copy wallet
pushd ../../tools/docker/fabric-all-in-one/fabcar-cli-1.4
./setup.sh
popd
cp -ar ../../tools/docker/fabric-all-in-one/fabcar-cli-1.4/wallet .

echo "All Done."
