#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

ROOT_DIR="../.." # Path to cactus root dir

echo ">> Remove the config files on your machine"
rm -rf ./etc/cactus/

# pushd ${ROOT_DIR}/tools/docker/tcs-huawei-testnet/example
# docker-compose down &
# popd 

echo ">> Stop and remove the docker containers"
docker rm -f    geth1 \
                cactus-example-electricity-trade-blp \
                cactus-example-electricity-trade-ethereum-validator \
                cactus-example-electricity-trade-tcs-validator \
                cmd-socketio-base-dummy \
                agent 

echo ">> Remove docker networks"
docker network rm   tcs_huawei_testnet_1x \
                    cactus-example-tcs_default \
                    cactus-example-tcs_cactus-example-electricity-trade-net \
                    geth1net \
                    geth-testnet_default
       

echo "Cleanup done."
