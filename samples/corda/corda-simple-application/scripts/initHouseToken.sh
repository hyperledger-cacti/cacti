#!/bin/bash

echo -e "\n\n Corda_Network:"
./clients/build/install/clients/bin/clients house-token init
echo "Issue to PartyA:"
./clients/build/install/clients/bin/clients house-token issue -p "O=PartyA, L=London, C=GB" -a 100
echo "Issue to PartyB:"
./clients/build/install/clients/bin/clients house-token issue -p "O=PartyB, L=London, C=GB" -a 50
echo "Issue to PartyC:"
./clients/build/install/clients/bin/clients house-token issue -p "O=PartyC, L=London, C=GB" -a 50

if [ "$1" = "1" ]; then
    echo "Done."
else
    echo -e "\n\n Corda_Network2:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token init
    echo "Issue to PartyA:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token issue -p "O=PartyA, L=London, C=GB" -a 100
    echo "Issue to PartyB:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token issue -p "O=PartyB, L=London, C=GB" -a 50
    echo "Issue to PartyC:"
    CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token issue -p "O=PartyC, L=London, C=GB" -a 50
fi