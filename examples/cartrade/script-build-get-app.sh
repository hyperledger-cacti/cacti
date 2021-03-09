# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
## Build a getting app
echo "[process] Build an app for getting Balance on Ethereum"
cd script-test-getFunctions/go-ethereum
npm install
echo "[process] Build an app for getting ownership on Fabcar"
cd ../fabric
npm install