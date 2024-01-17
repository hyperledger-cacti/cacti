#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

echo "Issuing 100 BobERC20 Tokens to Alice in network2"
./bin/besu-cli asset issue --network=network2 --account=1 --amount=100 --asset_type=ERC20
echo "Issuing 100 BobERC20 Tokens to Bob in network2"
./bin/besu-cli asset issue --network=network2 --account=2 --amount=100 --asset_type=ERC20

if [ "$1" = "hybrid" ]; then
  echo "Issuing 100 AliceERC1155 Token with id 0 to Alice in network1"
  ./bin/besu-cli asset issue --network=network1 --account=1 --amount=100 --token_id=0 --token_data="" --asset_type=ERC1155
  echo "Issuing 100 AliceERC1155 Token with id 1 to Bob in network1"
  ./bin/besu-cli asset issue --network=network2 --account=2 --amount=100 --token_id=1 --token_data="" --asset_type=ERC1155
else
  echo "Issuing AliceERC721 Token with id 0 to Alice in network1"
  ./bin/besu-cli asset issue --network=network1 --account=1 --token_id=0 --asset_type=ERC721
  echo "Issuing AliceERC721 Token with id 1 to Bob in network1"
  ./bin/besu-cli asset issue --network=network1 --account=2 --token_id=1 --asset_type=ERC721
fi
