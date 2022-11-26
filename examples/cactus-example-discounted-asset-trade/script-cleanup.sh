#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/

echo ">> Stop the docker containers of Ethereum, Fabric and Indy"
docker stop geth1 asset_trade_faio2x_testnet indy-testnet-pool
docker rm geth1 asset_trade_faio2x_testnet indy-testnet-pool $(docker container ls -q --all --filter name=geth-testnet_init-chain)
docker compose rm -f

echo ">> Clear docker networks"
docker network rm geth1net geth-testnet_default fabric-all-in-one_testnet-2x geth-testnet_default indy-testnet_indy_net
docker network rm $(docker network ls -q --filter name=cactus-example-discounted-asset-trade)

echo ">> Clear indy testnet sandbox"
pushd ../../tools/docker/indy-testnet/
./script-cleanup.sh
popd

echo ">> Remove geth files"
pushd ../../tools/docker/geth-testnet/
rm -fr ./data-geth1/geth/
popd

echo "Cleanup done."