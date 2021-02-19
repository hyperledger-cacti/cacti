cd ../..

## Start docker environment for Go-Ethereum testnet
cd ./tools/docker/geth-testnet
./script-start-docker.sh
cd ../../..

## Start docker environment for Sawtooth testnet
cd ./tools/docker/sawtooth-testnet
./script-start-docker.sh