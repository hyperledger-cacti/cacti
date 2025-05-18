#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "# Source Eth balance:"
curl localhost:5034/api/v1/bl/balance/06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97

echo -e "\n\n# Destination Eth balance:"
curl localhost:5034/api/v1/bl/balance/9d624f7995e8bd70251f8265f2f9f2b49f169c55

echo -e "\n\n# Electricity usage"
docker exec -t sawtooth_all_in_one_ledger_1x shell intkey list --url http://rest-api:8008
