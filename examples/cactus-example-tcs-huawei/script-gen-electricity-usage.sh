#!/usr/bin/env bash
# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

# echo "# Create intkey representing electricity usage"
# docker exec -t sawtooth_all_in_one_ledger_1x shell intkey set MI000001 50 --url http://rest-api:8008

# echo "# Increase usage"
# docker exec -t sawtooth_all_in_one_ledger_1x shell intkey inc MI000001 24 --url http://rest-api:8008

curl --location -k --request POST 'https://127.0.0.1:8001/v1/cross/transaction/query' \
--header 'Content-Type: text/plain' --data '{
        "to_chain":"B01234567890123456789012345678901234567890123456789",
        "from_chaincode_id":"ExcuteChainCode",
        "to_chaincode_id":"ExcuteChainCode",
        "to_query_func_name":"set",
        "args":["MI000001", "50"]    
    }' --cert ../../packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config/cert.pem --key ../../packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config/key.pem

curl --location -k --request POST 'https://127.0.0.1:8001/v1/cross/transaction/query' \
--header 'Content-Type: text/plain' --data '{
        "to_chain":"B01234567890123456789012345678901234567890123456789",
        "from_chaincode_id":"ExcuteChainCode",
        "to_chaincode_id":"ExcuteChainCode",
        "to_query_func_name":"inc",
        "args":["MI000001", "24"]    
    }' --cert ../../packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config/cert.pem  --key ../../packages/cactus-plugin-ledger-connector-tcs-huawei-socketio/sample-config/key.pem