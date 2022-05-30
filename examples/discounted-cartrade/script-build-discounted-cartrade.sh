#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

## Build a discounted cartrade app
echo "[process] Build a discounted cartrade app"
npm install
rm -fr ./dist/
npm run build
