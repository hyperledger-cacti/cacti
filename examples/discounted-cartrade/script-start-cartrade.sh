# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
cd ../..

## Start cartrade app
echo "[process] Start the routing interface and the discounted-cartrade app"
cd ./examples/discounted-cartrade
npm run init-discounted-cartrade # for making a symbolic link for node_modules. This command only needs to be run once.
npm run start