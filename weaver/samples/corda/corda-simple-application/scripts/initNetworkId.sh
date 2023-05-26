#!/bin/bash

MEMBERS=""

docker logs corda_partya_1 > /dev/null && MEMBERS+="O=PartyA, L=London, C=GB;"
docker logs corda_partyb_1 > /dev/null && MEMBERS+="O=PartyB, L=London, C=GB;"
docker logs corda_partyc_1 > /dev/null && MEMBERS+="O=PartyC, L=London, C=GB;"
MEMBERS=${MEMBERS::-1}

echo $MEMBERS

docker logs corda_partya_1 > /dev/null && ./clients/build/install/clients/bin/clients network-id create-state -m "$MEMBERS"

MEMBERS=""

docker logs corda_network2_partya_1 > /dev/null && MEMBERS+="O=PartyA, L=London, C=GB;"
docker logs corda_network2_partyb_1 > /dev/null && MEMBERS+="O=PartyB, L=London, C=GB;"
docker logs corda_network2_partyc_1 > /dev/null && MEMBERS+="O=PartyC, L=London, C=GB;"
MEMBERS=${MEMBERS::-1}

echo $MEMBERS

docker logs corda_network2_partya_1 > /dev/null && CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 ./clients/build/install/clients/bin/clients network-id create-state -m "$MEMBERS"

