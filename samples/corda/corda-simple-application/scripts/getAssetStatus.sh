#!/bin/bash

echo "PartyA Tokens:"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1
echo -e "\n--\n"
echo "PartyB Tokens:"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1
