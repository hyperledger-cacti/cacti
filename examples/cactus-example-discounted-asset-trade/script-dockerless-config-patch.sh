#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

COMMON_CACTUS_CONFIG="/etc/cactus/"

echo "Note - script must executed from within cactus-example-discounted-asset-trade directory!"

echo "Copy local cactus config to common location ($COMMON_CACTUS_CONFIG)"
sudo rm -rf "$COMMON_CACTUS_CONFIG"
sudo cp -ar "./etc/cactus" "/etc"
sudo chown -hR $(whoami) "$COMMON_CACTUS_CONFIG"

echo "Patch validators..."
sed -i 's/asset_trade_faio2x_testnet/localhost/g' "${COMMON_CACTUS_CONFIG}/connector-fabric-socketio/default.yaml"
sed -i 's/geth1/localhost/g' "${COMMON_CACTUS_CONFIG}/connector-go-ethereum-socketio/default.yaml"

echo "Patch validator-registry-config.yaml..."
sed -i 's/ethereum-validator/localhost/g' "${COMMON_CACTUS_CONFIG}/validator-registry-config.yaml"
sed -i 's/fabric-socketio-validator/localhost/g' "${COMMON_CACTUS_CONFIG}/validator-registry-config.yaml"
sed -i 's/indy-validator-nginx/localhost/g' "${COMMON_CACTUS_CONFIG}/validator-registry-config.yaml"

echo "Patch path to asset-trade modules."
current_pwd=$(pwd)
escaped_pwd=${current_pwd//\//\\/}
sed -i "s/\/root\/cactus/$escaped_pwd/g" "${COMMON_CACTUS_CONFIG}/usersetting.yaml"

echo "Done."
