#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

export CACTUS_FABRIC_ALL_IN_ONE_CONTAINER_NAME="cartrade_faio2x_testnet"

## Execute a getting app
echo "[process] Execute an app for getting Balance on Ethereum"
pushd ../../tools/docker/geth-testnet/get-eth-balance
node getBalance.js
popd

echo "[process] Execute an app for getting ownership on Fabcar"
pushd ../../tools/docker/fabric-all-in-one/fabcar-cli-1.4
./setup.sh >/dev/null
node query.js
popd
