# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
curl localhost:5034/api/v1/bl/trades/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"guks32pf","tradeParams":["0x06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97", "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55", "Brad", "Cathy", 50, "CAR1"],"authParams":["none"]}'