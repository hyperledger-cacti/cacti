#!/bin/sh

set -e

# Besu Member 1
wget -O- --post-data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://localhost:20000
wget -O- --post-data '{"jsonrpc":"2.0","method":"ibft_getValidatorsByBlockNumber","params":["latest"], "id":1}' http://localhost:20000

# Besu Member 2
wget -O- --post-data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://localhost:20002
wget -O- --post-data '{"jsonrpc":"2.0","method":"ibft_getValidatorsByBlockNumber","params":["latest"], "id":1}' http://localhost:20002

# Besu Member 3
wget -O- --post-data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://localhost:20004
wget -O- --post-data '{"jsonrpc":"2.0","method":"ibft_getValidatorsByBlockNumber","params":["latest"], "id":1}' http://localhost:20004
