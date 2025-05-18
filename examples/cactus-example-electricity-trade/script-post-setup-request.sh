#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "Register electricity-trade account information"
curl localhost:5034/api/v1/bl/electricity-trade/meter/register/ -XPOST \
    -H "Content-Type: application/json" \
    -d '{"businessLogicID":"h40Q9eMD",
            "meterParams":[
                "MI000001",
                "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97",
                "cb5d48d371916a4ea1627189d8af4f642a5d72746a06b559780c3f5932658207",
                "9d624f7995e8bd70251f8265f2f9f2b49f169c55"
            ]
        }'
