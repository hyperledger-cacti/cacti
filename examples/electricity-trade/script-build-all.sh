cd ../..

## Build validator for Sawtooth
cd ./packages/ledger-plugin/sawtooth/validator/src
./script-build-validator.sh
cd ../../../../..

## build validator for Ethereum
cd ./packages/ledger-plugin/go-ethereum/validator/src
./script-build-validator.sh
cd ../../../../..

## build packages
cd ./packages
./script-build-packages.sh
cd ..

## build cartrade apps
cd ./examples/electricity-trade
./script-build-electricity-trade.sh