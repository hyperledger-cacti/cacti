#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
## Build a cartrade app
echo "[process] Build a discounted-cartrade app"
rm -fr ./crypto-config
rm -fr ./wallet
rm -fr ../../dist/node_modules
npm install
npm run build
