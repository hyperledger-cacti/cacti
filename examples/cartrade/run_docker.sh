#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
# Script executed inside docker container
# Used to setup and start the cartrade application

# Patch BLP Config path
sed -i 's/\.\.\/BusinessLogicCartrade/\/root\/cactus\/dist\/BusinessLogicCartrade/g' './dist/config/BLP_config.js'

# Copy BLP Config to cactus-cmd-socketio-server
cp -f './dist/config/BLP_config.js' "${CACTUS_CMD_SOCKETIO_BLP_PATH}"

pushd "${CACTUS_CMD_SOCKETIO_PATH}"
node ./src/main/typescript/routing-interface/www.js
popd