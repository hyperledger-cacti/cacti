# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
cd ../..

## Build validator for Fabric
cd ./packages/cactus-plugin-ledger-connector-fabric-socketio
./script-build-validator.sh
cp -a ../../examples/discounted-cartrade/build/wallet ./dist/connector
cd ../../

## build validator for Ethereum
cd ./packages/cactus-plugin-ledger-connector-go-ethereum-socketio
./script-build-validator.sh
cd ../../

## build packages
cd ./packages/cactus-cmd-socketio-server
./script-build-packages.sh
cd ../..

## build cartrade apps
cd ./examples/discounted-cartrade
./script-build-cartrade.sh