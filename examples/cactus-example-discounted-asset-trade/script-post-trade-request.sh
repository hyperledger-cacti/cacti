#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "Build register-indy-data container"
pushd ../register-indy-data
sh ./script-build-docker.sh
popd

echo "Run register-indy-data "
docker run --rm \
    -ti \
    -v "$(pwd)/etc/cactus/":"/etc/cactus/" \
    --net="host" \
    register-indy-data
