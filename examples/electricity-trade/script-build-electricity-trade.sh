#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

## Build an electricity-trade app
echo "[process] Build an electricity-trade app"
npm install
rm -fr ./dist/
npm run build
