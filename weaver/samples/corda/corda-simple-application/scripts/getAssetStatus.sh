#!/bin/bash

echo "PartyA Tokens:"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1
echo -e "\n--\n"
echo "PartyB Tokens:"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1
echo -e "\n--\n"
echo "PartyC Tokens:"
CORDA_PORT=10012 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1

if [ "$1" = "2" ]; then
    echo -e "\n\n############## Corda_Network2 ################\n"
    echo "PartyA:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t2

    echo -e "\nPartyB:"
    CORDA_PORT=30009 ./clients/build/install/clients/bin/clients get-asset-states-by-type t2

    echo -e "\nPartyC:"
    CORDA_PORT=30012 ./clients/build/install/clients/bin/clients get-asset-states-by-type t2
fi