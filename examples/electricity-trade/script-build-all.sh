cd ../..

## Build validator for Sawtooth
cd ./packages/cactus-plugin-ledger-connector-sawtooth-socketio
./script-build-validator.sh
cd ../..

## build validator for Ethereum
cd ./packages/cactus-plugin-ledger-connector-go-ethereum-socketio
./script-build-validator.sh
cd ../..

## build packages
cd ./packages/cactus-cmd-socketio-server
./script-build-packages.sh
cd ../..

## build cartrade apps
cd ./examples/electricity-trade
./script-build-electricity-trade.sh