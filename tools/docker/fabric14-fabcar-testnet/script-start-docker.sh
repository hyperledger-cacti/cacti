# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
echo "[process] start docker environment for Fabric testnet"
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1 0.4.22

if [ -d fabric-samples/fabcar/javascript/wallet ]; then
  rm -r fabric-samples/fabcar/javascript/wallet
fi
if [ -d ../../../packages/cactus-plugin-ledger-connector-fabric-socketio/wallet ]; then
  rm -r ../../../packages/cactus-plugin-ledger-connector-fabric-socketio/wallet
fi
if [ -d ../../../examples/cartrade/script-test-getFunctions/fabric/wallet ]; then
  rm -r ../../../examples/cartrade/script-test-getFunctions/fabric/wallet
fi
#cp -a wallet fabric-samples/fabcar/javascript
#cp -a wallet ../../../examples/cartrade/script-test-getFunctions/fabric
cd fabric-samples/fabcar
./startFabric.sh
cd javascript
npm install
node enrollAdmin.js
node registerUser.js
cp -a wallet ../../../../../../packages/cactus-plugin-ledger-connector-fabric-socketio
cp -a wallet ../../../../../../examples/cartrade/script-test-getFunctions/fabric/wallet