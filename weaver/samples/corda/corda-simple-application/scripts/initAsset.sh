#!/bin/bash

echo -e "\n\n Corda_Network:"
echo "Adding 30 t1 tokens to PartyA"
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients issue-asset-state 30 t1
echo -e "\n -- \n"
echo "Adding 50 t1 tokens to PartyB"
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients issue-asset-state 50 t1
echo -e "\n -- \n"
echo "Adding 50 t1 tokens to PartyC"
CORDA_PORT=10012 ./clients/build/install/clients/bin/clients issue-asset-state 50 t1

if [ "$1" = "1" ]; then
    echo "Done."
else
    echo -e "\n\n Corda_Network2:"
    echo "Adding 30 t2 tokens to PartyA"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients issue-asset-state 30 t2
    echo -e "\n -- \n"
    echo "Adding 50 t2 tokens to PartyB"
    CORDA_PORT=30009 ./clients/build/install/clients/bin/clients issue-asset-state 50 t2
    echo -e "\n -- \n"
    echo "Adding 50 t2 tokens to PartyC"
    CORDA_PORT=30012 ./clients/build/install/clients/bin/clients issue-asset-state 50 t2
fi