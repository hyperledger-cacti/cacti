# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
cd ../..

## Start docker environment for Go-Ethereum testnet
cd ./tools/docker/geth-testnet
./script-start-docker.sh
cd ../../..

## Start docker environment for Fabric testnet
cd ./tools/docker/fabric14-fabcar-testnet
./script-start-docker.sh