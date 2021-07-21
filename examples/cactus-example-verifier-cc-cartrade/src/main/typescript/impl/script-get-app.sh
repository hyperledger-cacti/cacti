# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
## Execute a getting app
echo "[process] Execute an app for getting Balance on Ethereum"
cd script-test-getFunctions/go-ethereum
node getBalance.js
echo "[process] Execute an app for getting ownership on Fabcar"
cd ../fabric
node queryCar.js CAR1