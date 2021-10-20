#!/bin/bash

echo "PartyA:"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance

echo -e "\nPartyB:"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients house-token get-balance

echo -e "\nPartyC:"
CORDA_PORT=10012 ./clients/build/install/clients/bin/clients house-token get-balance
