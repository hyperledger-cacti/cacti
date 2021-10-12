#!/bin/bash

echo "Adding 30 t1 tokens to PartyA"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients issue-asset-state 30 t1
echo -e "\n -- \n"
echo "Adding 50 t1 tokens to PartyB"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients issue-asset-state 50 t1
