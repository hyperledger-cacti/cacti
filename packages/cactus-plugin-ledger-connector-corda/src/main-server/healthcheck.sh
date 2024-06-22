#!/bin/sh

curl -vv -i -X POST http://127.0.0.1:8080/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map

# curl -vv -i -X OPTIONS http://127.0.0.1:8080/
