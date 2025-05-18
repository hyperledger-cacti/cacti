#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/
rm -rf /etc/cactus/*
rm -rf ~/.cacti/cactus-example-discounted-asset-trade/

echo ">> Stop the docker containers of Ethereum, Fabric and Indy"
docker stop geth1 asset_trade_faio2x_testnet asset_trade_indy_all_in_one
docker rm geth1 asset_trade_faio2x_testnet asset_trade_indy_all_in_one $(docker container ls -q --all --filter name=geth-testnet_init-chain)
docker compose rm -f

echo ">> Clear docker networks"
docker network rm geth1net geth-testnet_default fabric-all-in-one_testnet-2x geth-testnet_default indy-all-in-one_indy_aio_net
docker network rm $(docker network ls -q --filter name=cactus-example-discounted-asset-trade)

echo ">> Clear indy-all-in-one"
pushd ../../tools/docker/indy-all-in-one/
./script-cleanup.sh
popd

echo ">> Remove geth files"
pushd ../../tools/docker/geth-testnet/
rm -fr ./data-geth1/geth/
popd

echo "Cleanup done."