#!/usr/bin/env bash
# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

## Build ethereum app
echo "[process] Build an app for getting Balance on Ethereum"
pushd script-test-getFunctions/go-ethereum
npm install
popd

## Build fabric app
echo "[process] Build an app for getting ownership on Fabcar"
pushd ../../tools/docker/fabric-all-in-one/fabcar-cli-1.4
npm install
popd
