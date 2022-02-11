#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/

echo ">> Stop the docker containers of Ethereum, Fabric and Indy"
docker stop geth1 cartrade_faio2x_testnet indy-testnet-pool
docker rm geth1 cartrade_faio2x_testnet indy-testnet-pool

echo ">> Clear indy testnet sandbox"
pushd ../../tools/docker/indy-testnet/
./script-cleanup.sh
popd
