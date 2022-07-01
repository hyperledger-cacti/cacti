#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "# Create intkey representing electricity usage"
docker exec -t sawtooth_all_in_one_ledger_1x shell intkey set MI000001 50 --url http://rest-api:8008

echo "# Increase usage"
docker exec -t sawtooth_all_in_one_ledger_1x shell intkey inc MI000001 24 --url http://rest-api:8008
