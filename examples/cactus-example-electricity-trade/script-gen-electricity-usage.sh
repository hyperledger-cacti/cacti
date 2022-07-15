#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "# Create intkey batch representing electricity usage"
docker exec -it sawtooth-shell-default intkey create_batch --key-name MI000001 --value-set 50 --value-inc 24

echo -e "\n# Sumbit electricity usage"
docker exec -it sawtooth-shell-default sawtooth batch submit -f batches.intkey --url http://rest-api:8008
