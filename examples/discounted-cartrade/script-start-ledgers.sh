#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

set -e

# Common logic with regular cartrade
../cartrade/script-start-ledgers.sh

# Copy to host /etc/cactus until containarized
rm -fr /etc/cactus/*
cp -fr ../../etc/cactus/* /etc/cactus
cp -r ./etc/cactus/* /etc/cactus
