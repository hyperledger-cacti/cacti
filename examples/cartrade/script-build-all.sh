#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

cd ../..

## Build validator for Fabric
cd ./packages/cactus-plugin-ledger-connector-fabric-socketio
./script-build-validator.sh
cd ../..

## build validator for Ethereum
cd ./packages/cactus-plugin-ledger-connector-go-ethereum-socketio
./script-build-validator.sh
cd ../..

## build cartrade apps
cd ./examples/cartrade
./script-build-cartrade.sh

## build getter apps
./script-build-get-app.sh
