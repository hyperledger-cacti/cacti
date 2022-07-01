#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/

echo ">> Stop and remove the docker containers"
docker rm -f sawtooth_all_in_one_ledger_1x \
                geth1 \
                cactus-example-electricity-trade-blp \
                cactus-example-electricity-trade-ethereum-validator \
                cactus-example-electricity-trade-sawtooth-validator \
                cmd-socketio-base-dummy

echo ">> Remove docker networks"
docker network rm sawtooth_aio_testnet_1x \
                    cactus-example-electricity-trade_default \
                    cactus-example-electricity-trade_cactus-example-electricity-trade-net \
                    geth1net \
                    geth-testnet_default

echo "Cleanup done."
