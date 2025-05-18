#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

COMMON_CACTUS_CONFIG="/etc/cactus/"

echo "Note - script must executed from within cactus-example-electricity-trade directory!"

echo "Copy local cactus config to common location ($COMMON_CACTUS_CONFIG)"
sudo rm -rf "$COMMON_CACTUS_CONFIG"
sudo cp -ar "./etc/cactus" "/etc"
sudo chown -hR $(whoami) "$COMMON_CACTUS_CONFIG"

echo "Patch validator-registry-config.yaml..."
sed -i 's/ethereum-validator/localhost/g' "${COMMON_CACTUS_CONFIG}/validator-registry-config.yaml"
sed -i 's/sawtooth-validator/localhost/g' "${COMMON_CACTUS_CONFIG}/validator-registry-config.yaml"

echo "Patch path to electricity-trade modules."
current_pwd=$(pwd)
escaped_pwd=${current_pwd//\//\\/}
sed -i "s/\/root\/cactus/$escaped_pwd/g" "${COMMON_CACTUS_CONFIG}/usersetting.yaml"

echo "Done."
