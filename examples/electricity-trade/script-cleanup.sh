#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/

echo ">> Stop and remove the docker containers"
docker rm -f sawtooth-shell-default \
                sawtooth-settings-tp-default \
                sawtooth-intkey-tp-python-default \
                sawtooth-xo-tp-python-default \
                sawtooth-rest-api-default \
                sawtooth-devmode-engine-rust-default \
                sawtooth-validator-default \
                geth1 \
                electricity-trade-blp \
                electricity-trade-ethereum-validator \
                electricity-trade-sawtooth-validator \
                cmd-socketio-base-dummy

echo ">> Remove docker networks"
docker network rm sawtooth_net \
                    electricity-trade_default \
                    electricity-trade_electricity-trade-net \
                    geth1net \
                    geth-testnet_default

echo "Cleanup done."
