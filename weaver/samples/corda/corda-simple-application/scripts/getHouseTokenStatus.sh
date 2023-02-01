#!/bin/bash

echo -e "############## Corda_Network ################\n"
echo "PartyA:"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance

echo -e "\nPartyB:"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients house-token get-balance

echo -e "\nPartyC:"
CORDA_PORT=10012 ./clients/build/install/clients/bin/clients house-token get-balance

if [ "$1" = "2" ]; then
    echo -e "\n\n############## Corda_Network2 ################\n"
    echo "PartyA:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token get-balance

    echo -e "\nPartyB:"
    CORDA_PORT=30009 ./clients/build/install/clients/bin/clients house-token get-balance

    echo -e "\nPartyC:"
    CORDA_PORT=30012 ./clients/build/install/clients/bin/clients house-token get-balance
fi
